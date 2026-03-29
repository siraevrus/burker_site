import { NextRequest, NextResponse } from "next/server";
import { randomBytes, randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { getSupportRequestClientIp } from "@/lib/support-request-ip";
import { getPublicWidgetConfig, getSupportWidgetSettingsRow } from "@/lib/support-settings";
import { checkSupportRateLimit } from "@/lib/support-rate-limit";
import { notifySupportChatMessage } from "@/lib/telegram";

const COOKIE = "support_visitor_token";
const MAX_LEN = 4000;
const AFTER_ID_MAX = 80;

/** POST: сообщений с одного IP за окно */
const POST_RATE_IP_MAX = 30;
const POST_RATE_IP_MS = 60_000;
/** POST: сообщений с одной сессии (cookie) за окно */
const POST_RATE_TOKEN_MAX = 25;
const POST_RATE_TOKEN_MS = 60_000;
/** GET: опрос истории с одного IP (защита от злоупотребления) */
const GET_RATE_IP_MAX = 200;
const GET_RATE_IP_MS = 60_000;

function extractCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const ip = getSupportRequestClientIp(request);
    if (!checkSupportRateLimit(`support-get:${ip}`, GET_RATE_IP_MAX, GET_RATE_IP_MS)) {
      return NextResponse.json({ error: "Слишком частые запросы" }, { status: 429 });
    }

    const settings = await getSupportWidgetSettingsRow();
    const pub = await getPublicWidgetConfig();
    if (!pub.enabled || !pub.isWithinSchedule) {
      return NextResponse.json({ messages: [], sessionId: null, disabled: true });
    }
    const token = extractCookie(request.headers.get("cookie"), COOKIE);
    if (!token) {
      return NextResponse.json({ messages: [], sessionId: null });
    }
    const session = await prisma.supportChatSession.findUnique({
      where: { visitorToken: token },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!session || session.status !== "open") {
      return NextResponse.json({ messages: [], sessionId: null });
    }
    const { searchParams } = new URL(request.url);
    const afterIdRaw = searchParams.get("afterId");
    if (afterIdRaw && afterIdRaw.length > AFTER_ID_MAX) {
      return NextResponse.json({ error: "Некорректный параметр" }, { status: 400 });
    }
    const afterId = afterIdRaw || null;
    let list = session.messages;
    if (afterId) {
      const idx = list.findIndex((m) => m.id === afterId);
      list = idx >= 0 ? list.slice(idx + 1) : [];
    }
    return NextResponse.json({
      messages: list,
      sessionId: session.id,
      welcomeTitle: settings.welcomeTitle,
    });
  } catch (e) {
    console.error("support GET messages:", e);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const pub = await getPublicWidgetConfig();
    if (!pub.enabled || !pub.isWithinSchedule) {
      return NextResponse.json(
        {
          error: pub.enabled
            ? "Сейчас нерабочее время. Напишите нам позже или используйте форму на странице контактов."
            : "Чат временно недоступен",
        },
        { status: 403 }
      );
    }

    const settings = await getSupportWidgetSettingsRow();

    const ip = getSupportRequestClientIp(request);
    if (!checkSupportRateLimit(`support-post:${ip}`, POST_RATE_IP_MAX, POST_RATE_IP_MS)) {
      return NextResponse.json(
        { error: "Слишком много сообщений. Подождите минуту." },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
    }
    const text =
      body &&
      typeof body === "object" &&
      "text" in body &&
      typeof (body as { text: unknown }).text === "string"
        ? (body as { text: string }).text.trim()
        : "";
    if (!text) {
      return NextResponse.json({ error: "Введите сообщение" }, { status: 400 });
    }
    if (text.length > MAX_LEN) {
      return NextResponse.json({ error: "Сообщение слишком длинное" }, { status: 400 });
    }

    let userId: string | null = null;
    const authToken = extractCookie(request.headers.get("cookie"), "auth_token");
    if (authToken) {
      const u = verifyToken(authToken);
      if (u) userId = u.userId;
    }

    let token = extractCookie(request.headers.get("cookie"), COOKIE);
    if (token && token.length > 128) {
      token = null;
    }

    if (token) {
      if (
        !checkSupportRateLimit(
          `support-post-tok:${token.slice(0, 32)}`,
          POST_RATE_TOKEN_MAX,
          POST_RATE_TOKEN_MS
        )
      ) {
        return NextResponse.json(
          { error: "Слишком много сообщений в этом чате. Подождите минуту." },
          { status: 429 }
        );
      }
    }

    let session = token
      ? await prisma.supportChatSession.findUnique({ where: { visitorToken: token } })
      : null;

    if (!session || session.status !== "open") {
      token = randomBytes(32).toString("hex");
      session = await prisma.supportChatSession.create({
        data: {
          id: randomUUID(),
          visitorToken: token,
          userId,
          lastMessageAt: new Date(),
          hasUnreadForAdmin: true,
        },
      });
    } else if (userId && !session.userId) {
      await prisma.supportChatSession.update({
        where: { id: session.id },
        data: { userId },
      });
    }

    const msg = await prisma.supportChatMessage.create({
      data: {
        id: randomUUID(),
        sessionId: session.id,
        role: "visitor",
        body: text,
      },
    });

    await prisma.supportChatSession.update({
      where: { id: session.id },
      data: { lastMessageAt: new Date(), hasUnreadForAdmin: true },
    });

    const visitorCount = await prisma.supportChatMessage.count({
      where: { sessionId: session.id, role: "visitor" },
    });

    const shouldTelegram =
      settings.telegramNotifyOn === "every_visitor"
        ? true
        : visitorCount === 1;

    if (shouldTelegram) {
      notifySupportChatMessage({
        sessionId: session.id,
        preview: text,
        isNewSession: visitorCount === 1,
      }).catch((err) => console.error("Support Telegram:", err));
    }

    const res = NextResponse.json({
      message: msg,
      sessionId: session.id,
    });

    const secure = process.env.NODE_ENV === "production";
    res.cookies.set(COOKIE, token!, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: 60 * 60 * 24 * 90,
      path: "/",
    });

    return res;
  } catch (e) {
    console.error("support POST messages:", e);
    return NextResponse.json({ error: "Ошибка отправки" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { sendEmailViaMailopost } from "@/lib/mailopost";
import { requireAdmin } from "@/lib/admin-api";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Проверка рассылки: отправляет тестовое письмо и возвращает результат.
 * Защита: заголовок X-Cron-Secret или Authorization: Bearer <CRON_SECRET>
 *
 * GET /api/admin/test-email
 * или
 * POST /api/admin/test-email
 * Body: { "to": "email@example.com" } — опционально, иначе берётся ADMIN_EMAIL или MAILOPOST_FROM_EMAIL
 */
export async function GET(request: NextRequest) {
  return handleTestEmail(request, null);
}

export async function POST(request: NextRequest) {
  let body: { to?: string } = {};
  try {
    body = await request.json();
  } catch {
    // ignore
  }
  return handleTestEmail(request, body.to || null);
}

async function handleTestEmail(
  request: NextRequest,
  toEmail: string | null
): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rate = checkRateLimit(`admin:test-email:${ip}`, 10, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Слишком много запросов. Повторите через ${rate.retryAfterSec} сек.` },
      { status: 429 }
    );
  }

  const secret =
    request.headers.get("X-Cron-Secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const expected = process.env.CRON_SECRET;

  const adminUnauthorized = await requireAdmin(request);
  const isAdminAuthorized = adminUnauthorized === null;
  const isCronAuthorized = Boolean(expected && secret === expected);

  if (!isAdminAuthorized && !isCronAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fromEmail =
    process.env.MAILOPOST_FROM_EMAIL || "noreply@burker-watches.ru";
  const to =
    toEmail ||
    process.env.ADMIN_EMAIL ||
    process.env.MAILOPOST_FROM_EMAIL ||
    fromEmail;

  if (!EMAIL_RE.test(to)) {
    return NextResponse.json(
      { error: "Некорректный email получателя" },
      { status: 400 }
    );
  }
  const hasToken = Boolean(process.env.MAILOPOST_API_TOKEN);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Проверка рассылки</h2>
      <p>Это тестовое письмо от Mira Brands | Burker.</p>
      <p>Если вы получили это письмо, рассылка работает.</p>
      <p style="color: #999; font-size: 12px;">Время: ${new Date().toLocaleString("ru-RU")}</p>
    </div>
  `;

  const result = await sendEmailViaMailopost(
    to,
    "Проверка рассылки — Burker",
    html
  );

  return NextResponse.json({
    success: result.success,
    error: result.error ?? undefined,
    messageId: result.messageId ?? undefined,
    config: {
      hasToken,
      fromEmail,
      to,
    },
  });
}

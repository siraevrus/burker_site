import { NextRequest, NextResponse } from "next/server";
import { getSupportRequestClientIp } from "@/lib/support-request-ip";
import { getPublicWidgetConfig } from "@/lib/support-settings";
import { checkSupportRateLimit } from "@/lib/support-rate-limit";

const CONFIG_RATE_MAX = 120;
const CONFIG_RATE_MS = 60_000;

export async function GET(request: NextRequest) {
  try {
    const ip = getSupportRequestClientIp(request);
    if (!checkSupportRateLimit(`support-cfg:${ip}`, CONFIG_RATE_MAX, CONFIG_RATE_MS)) {
      return NextResponse.json({ error: "Слишком частые запросы" }, { status: 429 });
    }
    const config = await getPublicWidgetConfig();
    return NextResponse.json(config);
  } catch (e) {
    console.error("support widget-config:", e);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}

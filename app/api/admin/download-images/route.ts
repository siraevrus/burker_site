import { NextRequest, NextResponse } from "next/server";
import { downloadProductImages } from "@/scripts/download-product-images";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret") || request.nextUrl.searchParams.get("secret");

  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[download-images] Запуск скачивания фотографий товаров...");
    const result = await downloadProductImages();
    console.log(`[download-images] Завершено: скачано ${result.downloaded}, пропущено ${result.skipped}, ошибок ${result.errors}`);

    return NextResponse.json({
      success: true,
      total: result.total,
      downloaded: result.downloaded,
      skipped: result.skipped,
      errors: result.errors,
      log: result.log,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[download-images] Ошибка:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

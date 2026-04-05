import { NextRequest, NextResponse } from "next/server";
import { isCronSecretValid } from "@/lib/cron-auth";
import { importProducts } from "@/lib/import/import";
import { saveImportHistory } from "@/lib/import/history";
import { notifyImportResult } from "@/lib/telegram";
import { getImportJsonFeedUrl } from "@/lib/import/feed-url";

/**
 * API endpoint для cron job (внешние сервисы)
 * Поддерживаются CRON_SECRET и CRON_SECRET_KEY
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const xCronSecret = request.headers.get("x-cron-secret");
    const querySecret = request.nextUrl.searchParams.get("secret");
    const providedSecret =
      authHeader?.replace(/^Bearer\s+/i, "")?.trim() ||
      xCronSecret?.trim() ||
      querySecret?.trim() ||
      "";

    if (!isCronSecretValid(providedSecret)) {
      console.warn(
        "[Cron] import: 401 — неверный или пустой секрет (CRON_SECRET / X-Cron-Secret / ?secret=)"
      );
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const apiKey = process.env.API_JSON_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API_JSON_KEY не задан в переменных окружения" },
        { status: 500 }
      );
    }

    const feedUrl = getImportJsonFeedUrl();
    const response = await fetch(feedUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-API-KEY": apiKey,
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(
        `Ошибка при запросе к серверу (${feedUrl}): ${response.status} ${response.statusText}`
      );
    }

    const jsonData = await response.json();

    // Проверка, что данные - массив
    if (!Array.isArray(jsonData)) {
      return NextResponse.json(
        { error: "Данные должны быть массивом товаров" },
        { status: 400 }
      );
    }

    // Импорт товаров
    const result = await importProducts(jsonData);

    // Сохранение истории импорта (тип "automatic" - автоматический импорт через cron)
    await saveImportHistory("automatic", result);

    try {
      const telegramOk = await notifyImportResult({
        added: result.added,
        updated: result.updated,
        errors: result.errors.length,
        total: result.total,
      });
      if (!telegramOk) {
        console.warn(
          "[Cron] import: уведомление в Telegram не отправлено (см. логи [Telegram] выше)"
        );
      }
    } catch (telegramError) {
      console.error("[Cron] import: notifyImportResult failed:", telegramError);
    }

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Cron import error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Ошибка при автоматическом импорте товаров",
      },
      { status: 500 }
    );
  }
}

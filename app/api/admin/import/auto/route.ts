import { NextRequest, NextResponse } from "next/server";
import { getCronExpectedSecret } from "@/lib/cron-auth";
import { importProducts } from "@/lib/import/import";
import { saveImportHistory } from "@/lib/import/history";
import { logError, logEvent } from "@/lib/ops-log";
import { requireAdmin } from "@/lib/admin-api";
import { notifyImportResult } from "@/lib/telegram";
import { getImportJsonFeedUrl } from "@/lib/import/feed-url";

/**
 * API endpoint для автоматического импорта товаров с внешнего сервера
 * Может быть вызван вручную или через cron job.
 * Секрет: заголовок Authorization: Bearer или query ?secret=
 */
export async function GET(request: NextRequest) {
  try {
    const requestId = crypto.randomUUID();
    const adminUnauthorized = await requireAdmin(request);
    const isAdminAuthorized = adminUnauthorized === null;
    const authHeader = request.headers.get("authorization");
    const secretKey = request.nextUrl.searchParams.get("secret");
    const providedSecret = (
      authHeader?.replace(/^Bearer\s+/i, "") ||
      secretKey ||
      ""
    ).trim();

    const expectedCronSecret = getCronExpectedSecret();

    const isCronAuthorized = Boolean(
      expectedCronSecret && providedSecret === expectedCronSecret
    );

    if (!isAdminAuthorized && !isCronAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const importType: "automatic" | "manual" = isCronAuthorized
      ? "automatic"
      : "manual";

    const apiKey = process.env.API_JSON_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API_JSON_KEY не задан в переменных окружения" },
        { status: 500 }
      );
    }

    // Запрос JSON с внешнего сервера (compact=1 — уменьшает размер ответа)
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

    // Сохранение истории импорта
    await saveImportHistory(importType, result);
    logEvent("admin_import_auto_success", {
      requestId,
      importType,
      total: result.total,
      added: result.added,
      updated: result.updated,
      errorsCount: result.errors.length,
    });

    // Telegram — как у /api/cron/import: только при вызове с CRON_SECRET (внешний cron, вариант B в CRON_SETUP).
    // Запуск из админки по сессии без секрета уведомлений не шлёт, чтобы не спамить.
    if (isCronAuthorized) {
      try {
        const telegramOk = await notifyImportResult({
          added: result.added,
          updated: result.updated,
          errors: result.errors.length,
          total: result.total,
        });
        if (!telegramOk) {
          console.warn(
            "[admin/import/auto] уведомление в Telegram не отправлено (см. логи [Telegram] выше)"
          );
        }
      } catch (telegramError) {
        console.error("[admin/import/auto] notifyImportResult failed:", telegramError);
      }
    }

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logError("admin_import_auto_error", {
      error: error?.message || "Unknown error",
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Ошибка при автоматическом импорте товаров",
      },
      { status: 500 }
    );
  }
}

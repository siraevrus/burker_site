import { NextRequest, NextResponse } from "next/server";
import { importProducts } from "@/lib/import/import";
import { saveImportHistory } from "@/lib/import/history";

const API_URL = "https://parcing.burker-watches.ru/api_json.php";

/**
 * API endpoint для автоматического импорта товаров с внешнего сервера
 * Может быть вызван вручную или через cron job.
 * Vercel при вызове cron передаёт заголовок Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const secretKey = request.nextUrl.searchParams.get("secret");
    const providedSecret = authHeader?.replace(/^Bearer\s+/i, "") || secretKey || "";

    // Vercel использует переменную CRON_SECRET, внешние cron — можно CRON_SECRET_KEY
    const vercelCronSecret = process.env.CRON_SECRET;
    const customCronSecret = process.env.CRON_SECRET_KEY;
    const expectedCronSecret = vercelCronSecret || customCronSecret;

    let importType: "automatic" | "manual" = "manual";
    if (expectedCronSecret) {
      if (providedSecret === expectedCronSecret) {
        importType = "automatic";
      } else if (providedSecret) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    // Запрос JSON с внешнего сервера
    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      // Таймаут 30 секунд
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(
        `Ошибка при запросе к серверу: ${response.status} ${response.statusText}`
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

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Auto import error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Ошибка при автоматическом импорте товаров",
      },
      { status: 500 }
    );
  }
}

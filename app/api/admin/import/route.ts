import { NextRequest, NextResponse } from "next/server";
import { importProducts } from "@/lib/import/import";
import { saveImportHistory } from "@/lib/import/history";
import { requireAdmin } from "@/lib/admin-api";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const ip = getClientIp(request.headers);
    const rate = checkRateLimit(`admin:import:${ip}`, 5, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Слишком много запросов. Повторите через ${rate.retryAfterSec} сек.` },
        { status: 429 }
      );
    }

    // Получение JSON данных из запроса
    const body = await request.json();

    // Проверка, что body содержит массив
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "Данные должны быть массивом товаров" },
        { status: 400 }
      );
    }

    if (body.length > 10000) {
      return NextResponse.json(
        { error: "Слишком большой пакет импорта (максимум 10000 записей за запрос)" },
        { status: 400 }
      );
    }

    // Импорт товаров
    const result = await importProducts(body);

    // Сохранение истории импорта (тип "file" - загрузка файла)
    await saveImportHistory("file", result);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("Import error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Ошибка при импорте товаров",
      },
      { status: 500 }
    );
  }
}

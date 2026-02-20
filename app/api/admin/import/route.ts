import { NextRequest, NextResponse } from "next/server";
import { importProducts } from "@/lib/import/import";
import { saveImportHistory } from "@/lib/import/history";

export async function POST(request: NextRequest) {
  try {
    // Проверка авторизации (можно добавить проверку сессии)
    // const session = await getServerSession();
    // if (!session || !session.isAdmin) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // Получение JSON данных из запроса
    const body = await request.json();

    // Проверка, что body содержит массив
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "Данные должны быть массивом товаров" },
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

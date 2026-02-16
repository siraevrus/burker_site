import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Создаем уникальное имя файла
    const timestamp = Date.now();
    // Очищаем имя файла от спецсимволов и кириллицы, оставляем только расширение
    const originalName = file.name;
    const extension = originalName.split('.').pop() || 'png';
    // Убираем все небезопасные символы из имени
    const sanitizedName = originalName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 50); // Ограничиваем длину
    const filename = `promo-${timestamp}-${sanitizedName}.${extension}`;
    
    // Путь к папке public/promo
    const publicDir = join(process.cwd(), "public", "promo");
    
    // Создаем папку, если её нет
    if (!existsSync(publicDir)) {
      mkdirSync(publicDir, { recursive: true });
    }

    const filepath = join(publicDir, filename);

    // Сохраняем файл
    await writeFile(filepath, buffer);

    // Возвращаем путь к файлу
    return NextResponse.json({
      success: true,
      filename: `/promo/${filename}`,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

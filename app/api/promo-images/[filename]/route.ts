import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params;

    // Валидация имени файла для безопасности
    if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    // Сначала проверяем в uploads/promo (новое расположение)
    let filePath = join(process.cwd(), "uploads", "promo", filename);
    
    // Если файл не найден, проверяем в public/promo (старое расположение для обратной совместимости)
    if (!existsSync(filePath)) {
      const oldPath = join(process.cwd(), "public", "promo", filename);
      if (existsSync(oldPath)) {
        filePath = oldPath;
      } else {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
    }

    // Читаем файл
    const fileBuffer = await readFile(filePath);

    // Определяем MIME тип по расширению
    const ext = filename.split(".").pop()?.toLowerCase();
    let contentType = "image/png";
    if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
    else if (ext === "gif") contentType = "image/gif";
    else if (ext === "webp") contentType = "image/webp";

    // Возвращаем файл с правильными заголовками
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving promo image:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

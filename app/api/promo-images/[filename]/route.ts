import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

/** Корень проекта: при standalone cwd может быть .next/standalone */
function getProjectRoot() {
  const cwd = process.cwd();
  return cwd.includes(".next/standalone") ? join(cwd, "..", "..") : cwd;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Валидация имени файла для безопасности
    if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const root = getProjectRoot();

    // Ищем файл в порядке приоритета:
    // 1) uploads/promo (основное)
    // 2) .next/standalone/uploads/promo (резерв при деплое)
    // 3) public/promo (старое расположение)
    const candidates = [
      join(root, "uploads", "promo", filename),
      join(root, ".next", "standalone", "uploads", "promo", filename),
      join(root, "public", "promo", filename),
    ];
    let filePath = candidates.find((p) => existsSync(p));
    if (!filePath) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
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
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error serving promo image:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

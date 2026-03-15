import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { requireAdmin } from "@/lib/admin-api";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

export async function POST(request: NextRequest) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const ip = getClientIp(request.headers);
    const rate = checkRateLimit(`admin:upload-image:${ip}`, 30, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Слишком много запросов. Повторите через ${rate.retryAfterSec} сек.` },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Проверяем тип файла
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Файл слишком большой. Максимум 10MB" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Имя файла генерируем на сервере — без пользовательского ввода (защита от path traversal)
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = MIME_TO_EXT[file.type] || "jpg";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: "Недопустимый формат изображения" },
        { status: 400 }
      );
    }
    const filename = `product-${timestamp}-${randomStr}.${ext}`;

    const cwd = process.cwd();
    const projectRoot = cwd.includes(".next/standalone")
      ? join(cwd, "..", "..")
      : cwd;
    const dirs = [
      join(projectRoot, "public", "products"),
      join(projectRoot, ".next", "standalone", "public", "products"),
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      await writeFile(join(dir, filename), buffer);
    }

    // Возвращаем путь к файлу
    return NextResponse.json({
      success: true,
      url: `/products/${filename}`,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

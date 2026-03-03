import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { requireAdmin } from "@/lib/admin-api";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const ip = getClientIp(request.headers);
    const rate = checkRateLimit(`admin:upload-promo:${ip}`, 30, 60_000);
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

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Файл слишком большой. Максимум 5MB" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Создаем уникальное имя файла
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const originalName = file.name;
    const extension = originalName.split('.').pop()?.toLowerCase() || 'png';
    
    // Валидация расширения
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    if (!allowedExtensions.includes(extension)) {
      return NextResponse.json(
        { error: "Неподдерживаемый формат изображения" },
        { status: 400 }
      );
    }
    
    // Безопасное имя файла: только timestamp и случайная строка
    const filename = `promo-${timestamp}-${randomStr}.${extension}`;
    
    // Сохраняем в uploads/promo (вне public, чтобы не попадало в сборку)
    const targetDir = join(process.cwd(), "uploads", "promo");
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }
    const filepath = join(targetDir, filename);
    await writeFile(filepath, buffer);

    // Возвращаем путь через API route
    return NextResponse.json({
      success: true,
      filename: `/api/promo-images/${filename}`,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

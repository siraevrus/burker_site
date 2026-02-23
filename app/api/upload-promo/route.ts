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
    // Очищаем имя файла от спецсимволов и кириллицы, оставляем только расширение
    const originalName = file.name;
    const extension = originalName.split('.').pop() || 'png';
    // Убираем расширение из оригинального имени перед санитизацией
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
    // Убираем все небезопасные символы из имени (без расширения)
    const sanitizedName = nameWithoutExt
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 50); // Ограничиваем длину
    const filename = `promo-${timestamp}-${sanitizedName}.${extension}`;
    
    // В production (Next standalone) статика часто отдается из .next/standalone/public.
    // Чтобы загрузка работала и в dev, и в prod, сохраняем файл в оба каталога.
    const targetDirs = [
      join(process.cwd(), "public", "promo"),
      join(process.cwd(), ".next", "standalone", "public", "promo"),
    ];

    let saved = 0;
    const errors: string[] = [];

    for (const dir of targetDirs) {
      try {
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        const filepath = join(dir, filename);
        await writeFile(filepath, buffer);
        saved += 1;
      } catch (error) {
        errors.push(`${dir}: ${error instanceof Error ? error.message : "write failed"}`);
      }
    }

    if (saved === 0) {
      return NextResponse.json(
        { error: "Failed to save file", details: errors },
        { status: 500 }
      );
    }

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

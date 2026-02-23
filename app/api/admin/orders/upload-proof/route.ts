import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { requireAdmin } from "@/lib/admin-api";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const MAX_PROOF_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const ip = getClientIp(request.headers);
    const rate = checkRateLimit(`admin:upload-proof:${ip}`, 30, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Слишком много запросов. Повторите через ${rate.retryAfterSec} сек.` },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const orderId = formData.get("orderId") as string;

    if (!file) {
      return NextResponse.json({ error: "Файл не загружен" }, { status: 400 });
    }

    if (!orderId) {
      return NextResponse.json({ error: "ID заказа не указан" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Файл должен быть изображением" },
        { status: 400 }
      );
    }

    if (file.size > MAX_PROOF_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Файл слишком большой. Максимум 10MB" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || "jpg";
    const filename = `proof-${orderId}-${timestamp}.${extension}`;

    // Единая директория для всех загружаемых изображений (promo).
    // В production (standalone) дублируем запись в .next/standalone/public/promo.
    const targetDirs = [
      join(process.cwd(), "public", "promo"),
      join(process.cwd(), ".next", "standalone", "public", "promo"),
    ];

    let saved = 0;
    for (const dir of targetDirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      const filepath = join(dir, filename);
      try {
        await writeFile(filepath, buffer);
        saved += 1;
      } catch {
        // Пытаемся сохранить во все целевые директории; ошибку отдадим, если не сохранили никуда.
      }
    }

    if (saved === 0) {
      return NextResponse.json(
        { error: "Ошибка сохранения файла" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: `/promo/${filename}`,
    });
  } catch (error) {
    console.error("Error uploading proof:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки файла" },
      { status: 500 }
    );
  }
}

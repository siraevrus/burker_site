/**
 * Скрипт скачивания фотографий товаров с внешнего CDN на локальный сервер.
 *
 * Запуск вручную:  npx tsx scripts/download-product-images.ts
 * Запуск через API: POST /api/admin/download-images (с секретным ключом)
 *
 * Что делает:
 * 1. Читает все товары из БД
 * 2. Для каждого товара скачивает внешние фото в /public/products/{productId}/
 * 3. Обновляет поле images в БД на локальные пути /products/{productId}/filename.ext
 * 4. Уже скачанные файлы пропускает (идемпотентно)
 */

import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";
import { URL } from "url";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// В standalone-режиме process.cwd() указывает на .next/standalone,
// поэтому используем явный путь из переменной окружения или fallback
const PUBLIC_DIR =
  process.env.PRODUCTS_IMAGE_DIR ||
  path.join(process.cwd(), "public", "products");

function getLocalFilename(imageUrl: string, index: number): string {
  try {
    const u = new URL(imageUrl);
    // Берём имя файла из пути URL, убираем query-параметры
    const basename = path.basename(u.pathname);
    // Оставляем только безопасные символы
    const safe = basename.replace(/[^a-zA-Z0-9._-]/g, "_");
    return safe || `image_${index}`;
  } catch {
    return `image_${index}`;
  }
}

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https://") ? https : http;
    const file = fs.createWriteStream(destPath);

    const request = proto.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlink(destPath, () => {});
        const redirectUrl = res.headers.location;
        if (!redirectUrl) return reject(new Error("Redirect without location"));
        downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(destPath, () => {});
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve()));
      file.on("error", (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });

    request.on("error", (err) => {
      file.close();
      fs.unlink(destPath, () => {});
      reject(err);
    });

    request.on("timeout", () => {
      request.destroy();
      file.close();
      fs.unlink(destPath, () => {});
      reject(new Error(`Timeout downloading ${url}`));
    });
  });
}

function isExternalUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

export async function downloadProductImages(): Promise<{
  total: number;
  downloaded: number;
  skipped: number;
  errors: number;
  log: string[];
}> {
  const log: string[] = [];
  let downloaded = 0;
  let skipped = 0;
  let errors = 0;

  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    log.push(`Создана директория ${PUBLIC_DIR}`);
  }

  const products = await prisma.product.findMany({
    select: { id: true, name: true, images: true },
  });

  log.push(`Товаров в БД: ${products.length}`);

  for (const product of products) {
    let images: string[] = [];
    try {
      images = JSON.parse(product.images as unknown as string);
    } catch {
      images = [];
    }

    if (!Array.isArray(images) || images.length === 0) continue;

    // Проверяем — есть ли хоть одно внешнее фото
    const hasExternal = images.some(isExternalUrl);
    if (!hasExternal) {
      skipped++;
      continue;
    }

    const productDir = path.join(PUBLIC_DIR, product.id);
    if (!fs.existsSync(productDir)) {
      fs.mkdirSync(productDir, { recursive: true });
    }

    const newImages: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const imgUrl = images[i];

      if (!isExternalUrl(imgUrl)) {
        // Уже локальный путь — оставляем как есть
        newImages.push(imgUrl);
        continue;
      }

      const filename = getLocalFilename(imgUrl, i);
      const localPath = path.join(productDir, filename);
      const publicPath = `/products/${product.id}/${filename}`;

      if (fs.existsSync(localPath)) {
        // Файл уже скачан
        newImages.push(publicPath);
        skipped++;
        continue;
      }

      try {
        await downloadFile(imgUrl, localPath);
        newImages.push(publicPath);
        downloaded++;
        log.push(`✓ ${product.name} [${i + 1}/${images.length}]: ${filename}`);
      } catch (err) {
        errors++;
        // При ошибке оставляем оригинальный URL
        newImages.push(imgUrl);
        log.push(`✗ ${product.name} [${i + 1}]: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Обновляем images в БД только если что-то изменилось
    const changed = newImages.some((img, i) => img !== images[i]);
    if (changed) {
      await prisma.product.update({
        where: { id: product.id },
        data: { images: JSON.stringify(newImages) },
      });
    }
  }

  await prisma.$disconnect();

  log.push(`\nИтого: скачано ${downloaded}, пропущено ${skipped}, ошибок ${errors}`);

  return { total: products.length, downloaded, skipped, errors, log };
}

// Запуск напрямую через tsx
if (require.main === module) {
  downloadProductImages()
    .then(({ log }) => {
      log.forEach((line) => console.log(line));
      process.exit(0);
    })
    .catch((err) => {
      console.error("Ошибка:", err);
      process.exit(1);
    });
}

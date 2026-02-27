/**
 * Скрипт: скачивание внешних изображений с https://www.burkerwatches.com
 * на сервер и замена ссылок в БД на локальные пути (/products/...).
 *
 * Запуск: npx tsx scripts/download-external-images.ts
 * Dry-run: npx tsx scripts/download-external-images.ts --dry-run
 * Показать пример URL в БД: npx tsx scripts/download-external-images.ts --show-sample
 */
import "dotenv/config";
import { config } from "dotenv";
import { resolve } from "path";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { prisma } from "../lib/db";

config({ path: resolve(__dirname, "../.env") });
config({ path: resolve(__dirname, "../.env.local") });
// На проде часто используют .env.production — подгружаем, чтобы скрипт видел ту же БД, что и приложение
const envProduction = resolve(__dirname, "../.env.production");
if (existsSync(envProduction)) {
  config({ path: envProduction });
}

const ALLOWED_IMAGE_ORIGIN = "https://www.burkerwatches.com";
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const DOWNLOAD_TIMEOUT_MS = 30_000;
const DELAY_BETWEEN_REQUESTS_MS = 1000; // 1 с между запросами, чтобы не заблокировали
const DRY_RUN = process.argv.includes("--dry-run");
const SHOW_SAMPLE = process.argv.includes("--show-sample");

const PUBLIC_PRODUCTS_DIR = join(process.cwd(), "public", "products");

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isExternalUrl(url: string): boolean {
  return url.startsWith(ALLOWED_IMAGE_ORIGIN);
}

function getExtensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.(jpe?g|png|webp|gif)(?:\?|$)/i);
    return match ? match[1].toLowerCase() : "jpg";
  } catch {
    return "jpg";
  }
}

function uniqueFilename(url: string): string {
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 12);
  const ext = getExtensionFromUrl(url);
  const timestamp = Date.now();
  return `external-${timestamp}-${hash}.${ext}`;
}

async function downloadImage(url: string): Promise<Buffer | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "BurkerWatches-ImageDownload/1.0" },
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn(`  HTTP ${res.status}: ${url}`);
      return null;
    }
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      console.warn(`  Не изображение (${contentType}): ${url}`);
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
      console.warn(`  Слишком большой (${(buffer.length / 1024 / 1024).toFixed(1)} MB): ${url}`);
      return null;
    }
    return buffer;
  } catch (e) {
    clearTimeout(timeout);
    console.warn(`  Ошибка загрузки ${url}:`, e instanceof Error ? e.message : e);
    return null;
  }
}

/** Извлечь внешние URL из HTML (img src) */
function extractExternalUrlsFromHtml(html: string | null): string[] {
  if (!html || typeof html !== "string") return [];
  const escaped = ALLOWED_IMAGE_ORIGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`src=["'](${escaped}[^"']*)["']`, "gi");
  const urls: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    urls.push(m[1]);
  }
  return urls;
}

/** Заменить внешние URL в HTML на локальные пути */
function replaceExternalUrlsInHtml(
  html: string | null,
  urlToLocal: Map<string, string>
): string | null {
  if (!html || typeof html !== "string") return html;
  const escaped = ALLOWED_IMAGE_ORIGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(src=["'])(${escaped}[^"']*)(["'])`, "gi");
  return html.replace(re, (_, before, url: string, after) => {
    const local = urlToLocal.get(url);
    return local ? `${before}${local}${after}` : `${before}${url}${after}`;
  });
}

async function main() {
  console.log("Скрипт загрузки внешних изображений (burkerwatches.com)");
  if (DRY_RUN) console.log("Режим: --dry-run (без записи на диск и в БД)\n");

  const products = await prisma.product.findMany({ orderBy: { id: "asc" } });
  const allExternalUrls = new Set<string>();

  for (const p of products) {
    const images: string[] = JSON.parse(p.images || "[]");
    for (const url of images) {
      if (typeof url === "string" && isExternalUrl(url)) allExternalUrls.add(url);
    }
    const descUrls = extractExternalUrlsFromHtml(p.description);
    descUrls.forEach((u) => allExternalUrls.add(u));
  }

  const urlList = Array.from(allExternalUrls);
  console.log(`Найдено уникальных внешних URL: ${urlList.length}`);

  if (SHOW_SAMPLE) {
    const dbUrl = process.env.DATABASE_URL;
    console.log(`\nDATABASE_URL: ${dbUrl ? "задан" : "не задан (скрипт мог подключиться к другой БД)"}`);
    if (dbUrl?.startsWith("file:")) {
      const path = dbUrl.replace(/^file:/, "").replace(/\?.*$/, "");
      console.log(`  SQLite: ${path}`);
    }
    console.log(`Всего товаров в БД: ${products.length}`);
    const sample = products.slice(0, 5);
    for (const p of sample) {
      const images: string[] = JSON.parse(p.images || "[]");
      const first = images[0];
      const kind = !first ? "нет" : isExternalUrl(first) ? "внешний (burkerwatches.com)" : "локальный";
      console.log(`  ${p.name}: images[0] = ${(first || "(пусто)").slice(0, 70)}... [${kind}]`);
    }
    if (products.length === 0) console.log("  (нет товаров)");
    console.log("");
    return;
  }

  if (urlList.length === 0) {
    console.log("Нечего скачивать. Выход.");
    return;
  }

  const urlToLocal = new Map<string, string>();

  if (!DRY_RUN && !existsSync(PUBLIC_PRODUCTS_DIR)) {
    await mkdir(PUBLIC_PRODUCTS_DIR, { recursive: true });
  }

  for (let i = 0; i < urlList.length; i++) {
    const url = urlList[i];
    console.log(`[${i + 1}/${urlList.length}] ${url.slice(0, 80)}...`);
    if (DRY_RUN) {
      urlToLocal.set(url, `/products/${uniqueFilename(url)}`);
      continue;
    }
    const buffer = await downloadImage(url);
    if (!buffer) {
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
      continue;
    }
    const filename = uniqueFilename(url);
    const filepath = join(PUBLIC_PRODUCTS_DIR, filename);
    await writeFile(filepath, buffer);
    urlToLocal.set(url, `/products/${filename}`);
    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }

  console.log(`\nСкачано/подготовлено: ${urlToLocal.size} из ${urlList.length}`);

  let updated = 0;
  for (const p of products) {
    const images: string[] = JSON.parse(p.images || "[]");
    const description: string | null = p.description;

    const newImages = images.map((url) => {
      if (typeof url !== "string") return url;
      const local = urlToLocal.get(url);
      return local ?? url;
    });
    const imagesChanged = images.some(
      (url, i) => (typeof url === "string" ? url : "") !== (newImages[i] ?? "")
    );

    const newDescription = replaceExternalUrlsInHtml(description, urlToLocal);
    const descriptionChanged = newDescription !== description;

    if (!imagesChanged && !descriptionChanged) continue;

    if (DRY_RUN) {
      console.log(`  [dry-run] Обновление товара ${p.id} (${p.name})`);
      updated++;
      continue;
    }

    await prisma.product.update({
      where: { id: p.id },
      data: {
        images: JSON.stringify(newImages),
        description: newDescription,
      },
    });
    updated++;
    console.log(`  Обновлён товар: ${p.name} (${p.id})`);
  }

  console.log(`\nГотово. Обновлено записей: ${updated}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

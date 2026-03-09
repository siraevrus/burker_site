import { prisma } from "./db";

let cachedDisabled: boolean | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5_000;

/**
 * Проверяет, отключена ли фискализация Orange Data в админ-панели.
 */
export async function isOrangeDataDisabled(): Promise<boolean> {
  const now = Date.now();
  if (cachedDisabled !== null && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedDisabled;
  }
  try {
    const row = await prisma.orangeDataSetting.findUnique({
      where: { id: "single" },
    });
    cachedDisabled = row?.disabled ?? false;
  } catch {
    cachedDisabled = false;
  }
  cacheTimestamp = now;
  return cachedDisabled;
}

/**
 * Устанавливает флаг отключения Orange Data.
 */
export async function setOrangeDataDisabled(disabled: boolean): Promise<void> {
  await prisma.orangeDataSetting.upsert({
    where: { id: "single" },
    update: { disabled },
    create: { id: "single", disabled },
  });
  cachedDisabled = disabled;
  cacheTimestamp = Date.now();
}

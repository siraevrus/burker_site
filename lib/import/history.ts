import { prisma } from "../db";
import { ImportResult } from "./import";

export type ImportType = "automatic" | "manual" | "file";

/**
 * Сохранить историю импорта
 */
export async function saveImportHistory(
  type: ImportType,
  result: ImportResult
): Promise<void> {
  try {
    await prisma.importHistory.create({
      data: {
        type,
        added: result.added,
        updated: result.updated,
        errors: result.errors.length,
        total: result.total,
        errorDetails:
          result.errors.length > 0
            ? JSON.stringify(result.errors)
            : null,
      },
    });
  } catch (error) {
    console.error("Error saving import history:", error);
    // Не прерываем выполнение, если не удалось сохранить историю
  }
}

/**
 * Получить историю импортов
 */
export async function getImportHistory(limit: number = 50) {
  try {
    return await prisma.importHistory.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
  } catch (error) {
    console.error("Error fetching import history:", error);
    return [];
  }
}

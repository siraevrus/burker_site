import { NextRequest, NextResponse } from "next/server";
import { getImportHistory } from "@/lib/import/history";
import { requireAdmin } from "@/lib/admin-api";

/**
 * API endpoint для получения истории импортов
 */
export async function GET(request: NextRequest) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const limitParam = request.nextUrl.searchParams.get("limit");
    const parsedLimit = limitParam ? parseInt(limitParam, 10) : 50;
    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 200)
        : 50;

    const history = await getImportHistory(limit);

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error: any) {
    console.error("Error fetching import history:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Ошибка при получении истории импортов",
      },
      { status: 500 }
    );
  }
}

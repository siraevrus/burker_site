import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";
import { fetchCbrEurRubForDate } from "@/lib/cbr-rates";

/**
 * GET ?date=YYYY-MM-DD — курс ЦБ РФ: рублей за 1 € на дату.
 */
export async function GET(request: NextRequest) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const raw = request.nextUrl.searchParams.get("date") || "";
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
    if (!m) {
      return NextResponse.json(
        { error: "Укажите date в формате YYYY-MM-DD" },
        { status: 400 }
      );
    }
    const y = Number(m[1]);
    const month = Number(m[2]) - 1;
    const day = Number(m[3]);
    const date = new Date(y, month, day);

    if (
      date.getFullYear() !== y ||
      date.getMonth() !== month ||
      date.getDate() !== day
    ) {
      return NextResponse.json({ error: "Некорректная дата" }, { status: 400 });
    }

    const { eurPerRub } = await fetchCbrEurRubForDate(date);
    return NextResponse.json({
      eurPerRub,
      date: raw,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Ошибка загрузки курса ЦБ";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

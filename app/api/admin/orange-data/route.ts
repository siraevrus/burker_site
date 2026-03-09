import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-api";
import {
  isOrangeDataConfigured,
  getOrangeDataDiagnostics,
} from "@/lib/orange-data";
import {
  isOrangeDataDisabled,
  setOrangeDataDisabled,
} from "@/lib/orange-data-settings";

/**
 * GET — статус Orange Data: настроен ли, отключён ли в админке
 */
export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const configured = isOrangeDataConfigured();
    const disabled = await isOrangeDataDisabled();
    const diag = getOrangeDataDiagnostics();

    return NextResponse.json({
      configured,
      disabled,
      enabled: configured && !disabled,
      diagnostics: diag,
    });
  } catch (error) {
    console.error("Error fetching Orange Data status:", error);
    return NextResponse.json(
      { error: "Ошибка при получении статуса Orange Data" },
      { status: 500 }
    );
  }
}

/**
 * PUT — включить/отключить фискализацию Orange Data
 * Body: { "disabled": true | false }
 */
export async function PUT(request: NextRequest) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const disabled = Boolean(body?.disabled);

    await setOrangeDataDisabled(disabled);

    return NextResponse.json({
      success: true,
      disabled,
      message: disabled
        ? "Orange Data отключён. Чеки не будут фискализироваться."
        : "Orange Data включён. Чеки будут отправляться при оплате.",
    });
  } catch (error) {
    console.error("Error updating Orange Data setting:", error);
    return NextResponse.json(
      { error: "Ошибка при сохранении настройки" },
      { status: 500 }
    );
  }
}

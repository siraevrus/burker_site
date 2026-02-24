import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const unauthorized = await requireAdmin(request);
    if (unauthorized) return unauthorized;

    const { id } = await params;
    const body = await request.json();
    const { processed, adminComment } = body;

    const data: { processed?: boolean; adminComment?: string | null } = {};
    if (typeof processed === "boolean") data.processed = processed;
    if (adminComment !== undefined) data.adminComment = adminComment === "" ? null : String(adminComment);

    const updated = await prisma.feedback.update({
      where: { id },
      data,
    });

    return NextResponse.json({ feedback: updated });
  } catch (error: any) {
    console.error("Admin feedback update error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при обновлении" },
      { status: 500 }
    );
  }
}

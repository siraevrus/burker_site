import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { processed } = body;

    const updated = await prisma.feedback.update({
      where: { id },
      data: { processed: !!processed },
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

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const durationMs = Date.now() - startedAt;

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      durationMs,
    });
  } catch (error: unknown) {
    const durationMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : "Health check failed";
    console.error("Health check error:", message, error);
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        durationMs,
      },
      { status: 500 }
    );
  }
}

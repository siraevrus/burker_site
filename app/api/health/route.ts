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
      checks: {
        db: "ok",
        mailopost: process.env.MAILOPOST_API_TOKEN ? "configured" : "not_configured",
      },
      durationMs,
    });
  } catch (error: unknown) {
    const durationMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : "Health check failed";
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        checks: {
          db: "error",
          mailopost: process.env.MAILOPOST_API_TOKEN ? "configured" : "not_configured",
        },
        error: message,
        durationMs,
      },
      { status: 500 }
    );
  }
}

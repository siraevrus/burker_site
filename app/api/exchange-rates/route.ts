import { NextResponse } from "next/server";
import { getExchangeRates } from "@/lib/exchange-rates";

export async function GET() {
  try {
    const rates = await getExchangeRates();
    
    return NextResponse.json({
      eurRate: rates.eurRate,
      rubRate: rates.rubRate,
      updatedAt: rates.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    return NextResponse.json(
      { error: "Failed to fetch exchange rates" },
      { status: 500 }
    );
  }
}

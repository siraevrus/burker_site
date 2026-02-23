import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "./admin-auth";

function extractCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(";").map((part) => part.trim());
  for (const pair of pairs) {
    if (pair.startsWith(`${name}=`)) {
      return decodeURIComponent(pair.slice(name.length + 1));
    }
  }
  return null;
}

export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const token = extractCookieValue(request.headers.get("cookie"), "admin_token");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = verifyAdminToken(token);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

import { NextResponse } from "next/server";
import { adminAuthConfig } from "@/lib/admin-auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(adminAuthConfig.cookieName);
  return response;
}

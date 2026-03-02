import { NextRequest, NextResponse } from "next/server";

const CANONICAL_HOST = "burker-watches.ru";

/**
 * 301 редирект с www на основной домен без www.
 * https://www.burker-watches.ru/* → https://burker-watches.ru/*
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  if (host.startsWith("www.") && host.replace(/^www\./, "") === CANONICAL_HOST) {
    const url = request.nextUrl.clone();
    url.host = CANONICAL_HOST;
    url.protocol = "https:";
    return NextResponse.redirect(url.toString(), 301);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Все path кроме статики и _next.
     * Редирект только для запросов к страницам.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?)$).*)",
  ],
};

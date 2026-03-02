"use client";

import { usePathname } from "next/navigation";
import { CANONICAL_SITE_URL } from "@/lib/site-url";
import { useEffect } from "react";

/**
 * Добавляет на страницу <link rel="canonical" href="https://burker-watches.ru/..."> (без www).
 * Подставляется в <head> на клиенте по текущему pathname.
 */
export default function CanonicalLink() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;

    const base = CANONICAL_SITE_URL.replace(/\/+$/, "");
    const canonicalUrl = pathname === "/" ? base : `${base}${pathname}`;

    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonicalUrl;
  }, [pathname]);

  return null;
}

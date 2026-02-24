"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Подставляет title и description из раздела SEO админки для текущего path.
 * Вызывается на клиенте после смены pathname.
 */
export default function SeoMeta() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;

    const path = pathname === "/" ? "/" : pathname.replace(/\/+$/, "") || "/";
    fetch(`/api/seo?path=${encodeURIComponent(path)}`)
      .then((res) => res.json())
      .then((data: { title?: string | null; description?: string | null }) => {
        if (data.title) {
          document.title = data.title;
        }
        const meta = document.querySelector('meta[name="description"]');
        if (meta && data.description) {
          meta.setAttribute("content", data.description);
        }
      })
      .catch(() => {});
  }, [pathname]);

  return null;
}

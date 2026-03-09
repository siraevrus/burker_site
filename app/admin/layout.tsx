"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

const MENU_GROUPS = [
  {
    label: "Контент",
    items: [
      { href: "/admin", label: "Продукты" },
      { href: "/admin/pages", label: "Страницы" },
      { href: "/admin/faq", label: "FAQ" },
      { href: "/admin/footer", label: "Подвал" },
    ],
  },
  {
    label: "Реклама",
    items: [
      { href: "/admin/promo", label: "Промоблок" },
      { href: "/admin/promo-codes", label: "Промокоды" },
      { href: "/admin/top-banner", label: "Верхняя строка" },
    ],
  },
  {
    label: "Магазин",
    items: [
      { href: "/admin/orders", label: "Заказы" },
      { href: "/admin/import", label: "Импорт товаров" },
    ],
  },
  {
    label: "Пользователи",
    items: [
      { href: "/admin/users", label: "Пользователи" },
      { href: "/admin/subscribers", label: "Подписчики" },
      { href: "/admin/feedback", label: "ФОС" },
    ],
  },
  {
    label: "Настройки",
    items: [
      { href: "/admin/seo", label: "SEO" },
      { href: "/admin/shipping", label: "Стоимость доставки" },
      { href: "/admin/exchange-rates", label: "Курсы валют" },
      { href: "/admin/orange-data", label: "Orange Data" },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpenMenu(null);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      if (pathname === "/admin/login") {
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/admin/auth/me", { method: "GET" });
        if (!response.ok) {
          router.push("/admin/login");
          return;
        }
        setIsAuthenticated(true);
      } catch {
        router.push("/admin/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } finally {
      setIsAuthenticated(false);
      setIsLoading(false);
    }
    router.push("/admin/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    );
  }

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Навигация */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold">Админ-панель</h1>
              <div className="flex gap-1" ref={menuRef}>
                {MENU_GROUPS.map((group) => {
                  const isActive = group.items.some((item) => {
                    if (pathname === item.href) return true;
                    if (item.href === "/admin" && pathname?.startsWith("/admin/products/")) return true;
                    return pathname?.startsWith(item.href + "/") ?? false;
                  });
                  const isOpen = openMenu === group.label;
                  return (
                    <div key={group.label} className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenMenu(isOpen ? null : group.label)}
                        className={`inline-flex items-center gap-1 px-4 py-2 rounded-md transition-colors ${
                          isActive
                            ? "bg-[#EBEBEB] text-gray-800"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {group.label}
                        <svg
                          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isOpen && (
                        <div className="absolute left-0 top-full mt-1 py-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                          {group.items.map((item) => (
                            <a
                              key={item.href}
                              href={item.href}
                              className={`block px-4 py-2 text-sm ${
                                pathname === item.href
                                  ? "bg-gray-100 text-gray-900 font-medium"
                                  : "text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              {item.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/"
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                На сайт
              </a>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-red-600 hover:text-red-800"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </nav>
      <div className="min-h-screen bg-gray-50">{children}</div>
    </>
  );
}

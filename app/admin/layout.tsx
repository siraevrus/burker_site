"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const AUTH_CHECK_TIMEOUT_MS = 12_000;

function NavDropdown({
  label,
  items,
  pathname,
  isOpen,
  onOpen,
  onClose,
  openKey,
}: {
  label: string;
  items: { label: string; href: string }[];
  pathname: string;
  isOpen: boolean;
  onOpen: (key: string) => void;
  onClose: () => void;
  openKey: string;
}) {
  const isActive = items.some((item) => pathname === item.href);
  return (
    <div
      className="relative"
      onMouseEnter={() => onOpen(openKey)}
      onMouseLeave={onClose}
    >
      <button
        type="button"
        onClick={() => onOpen(isOpen ? "" : openKey)}
        className={`flex items-center gap-1 px-4 py-2 rounded-md transition-colors cursor-default ${
          isActive ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        {label}
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
        <div className="absolute left-0 top-full pt-1 min-w-[200px] z-50">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`block px-4 py-2 text-sm transition-colors ${
                pathname === item.href
                  ? "bg-gray-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </a>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    if (pathname == null) {
      return;
    }

    if (pathname === "/admin/login") {
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      setIsLoading(false);
      router.push("/admin/login");
    }, AUTH_CHECK_TIMEOUT_MS);

    const checkAuth = async () => {
      try {
        const response = await fetch("/api/admin/auth/me", { method: "GET" });
        if (cancelled) return;
        if (!response.ok) {
          clearTimeout(timeoutId);
          router.push("/admin/login");
          return;
        }
        clearTimeout(timeoutId); // успешная авторизация — таймер не должен сбрасывать страницу
        setIsAuthenticated(true);
      } catch {
        if (!cancelled) {
          clearTimeout(timeoutId);
          router.push("/admin/login");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    checkAuth();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
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

  const handleOpenDropdown = (key: string) => {
    setOpenDropdown(key || null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-700">Загрузка...</p>
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
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <h1 className="text-xl font-bold text-gray-800 mr-8">Админ-панель</h1>
            <div
              className="flex items-center gap-1 flex-1"
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <NavDropdown
                label="Пользователи"
                items={[
                  { label: "Пользователи", href: "/admin/users" },
                  { label: "Заказы", href: "/admin/orders" },
                ]}
                pathname={pathname}
                isOpen={openDropdown === "users"}
                onOpen={handleOpenDropdown}
                onClose={() => setOpenDropdown(null)}
                openKey="users"
              />
              <NavDropdown
                label="Продукты"
                items={[
                  { label: "Продукты", href: "/admin" },
                  { label: "Импорт товаров", href: "/admin/import" },
                ]}
                pathname={pathname}
                isOpen={openDropdown === "products"}
                onOpen={handleOpenDropdown}
                onClose={() => setOpenDropdown(null)}
                openKey="products"
              />
              <NavDropdown
                label="Реклама"
                items={[
                  { label: "Верхняя строка", href: "/admin/top-banner" },
                  { label: "Промоблок", href: "/admin/promo" },
                  { label: "Промокоды", href: "/admin/promo-codes" },
                  { label: "Подписчики", href: "/admin/subscribers" },
                ]}
                pathname={pathname}
                isOpen={openDropdown === "ads"}
                onOpen={handleOpenDropdown}
                onClose={() => setOpenDropdown(null)}
                openKey="ads"
              />
              <a
                href="/admin/pages"
                className={`px-4 py-2 rounded-md transition-colors ${
                  pathname === "/admin/pages"
                    ? "bg-gray-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Страницы
              </a>
              <NavDropdown
                label="Настройки"
                items={[
                  { label: "Курсы валют", href: "/admin/exchange-rates" },
                  { label: "SEO", href: "/admin/seo" },
                  { label: "Стоимость доставки", href: "/admin/shipping" },
                  { label: "ФОС", href: "/admin/feedback" },
                ]}
                pathname={pathname}
                isOpen={openDropdown === "settings"}
                onOpen={handleOpenDropdown}
                onClose={() => setOpenDropdown(null)}
                openKey="settings"
              />
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/"
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                На сайт
              </a>
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
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

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Проверяем авторизацию
    if (typeof window !== "undefined") {
      const auth = localStorage.getItem("admin_auth");
      if (auth !== "true" && pathname !== "/admin/login") {
        router.push("/admin/login");
      } else {
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    }
  }, [router, pathname]);

  const handleLogout = () => {
    localStorage.removeItem("admin_auth");
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
              <div className="flex gap-4">
                <a
                  href="/admin"
                  className={`px-4 py-2 rounded-md transition-colors ${
                    pathname === "/admin"
                      ? "bg-gray-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Продукты
                </a>
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
                <a
                  href="/admin/promo"
                  className={`px-4 py-2 rounded-md transition-colors ${
                    pathname === "/admin/promo"
                      ? "bg-gray-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Промоблок
                </a>
                <a
                  href="/admin/promo-codes"
                  className={`px-4 py-2 rounded-md transition-colors ${
                    pathname === "/admin/promo-codes"
                      ? "bg-gray-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Промокоды
                </a>
                <a
                  href="/admin/top-banner"
                  className={`px-4 py-2 rounded-md transition-colors ${
                    pathname === "/admin/top-banner"
                      ? "bg-gray-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Верхняя строка
                </a>
                <a
                  href="/admin/import"
                  className={`px-4 py-2 rounded-md transition-colors ${
                    pathname === "/admin/import"
                      ? "bg-gray-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Импорт товаров
                </a>
                <a
                  href="/admin/orders"
                  className={`px-4 py-2 rounded-md transition-colors ${
                    pathname === "/admin/orders"
                      ? "bg-gray-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Заказы
                </a>
                <a
                  href="/admin/users"
                  className={`px-4 py-2 rounded-md transition-colors ${
                    pathname === "/admin/users"
                      ? "bg-gray-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Пользователи
                </a>
                <a
                  href="/admin/subscribers"
                  className={`px-4 py-2 rounded-md transition-colors ${
                    pathname === "/admin/subscribers"
                      ? "bg-gray-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Подписчики
                </a>
                <a
                  href="/admin/feedback"
                  className={`px-4 py-2 rounded-md transition-colors ${
                    pathname === "/admin/feedback"
                      ? "bg-gray-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  ФОС
                </a>
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

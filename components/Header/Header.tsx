"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ProductImage from "@/components/ProductImage";
import { useStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Product } from "@/lib/types";

interface MenuItem {
  label: string;
  slug: string;
  href: string;
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWatchesOpen, setIsWatchesOpen] = useState(false);
  const [isJewelryOpen, setIsJewelryOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [topBannerText, setTopBannerText] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [menuWatches, setMenuWatches] = useState<MenuItem[]>([]);
  const [menuJewelry, setMenuJewelry] = useState<MenuItem[]>([]);
  const cartItemsCount = useStore((state) => state.getCartItemsCount());
  const user = useStore((state) => state.user);
  const loadUser = useStore((state) => state.loadUser);
  const logout = useStore((state) => state.logout);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch("/api/products");
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || []);
        }
      } catch (error) {
        console.error("Error loading products:", error);
      }
    };
    const loadMenu = async () => {
      try {
        const response = await fetch("/api/menu");
        if (response.ok) {
          const data = await response.json();
          setMenuWatches(data.watches || []);
          setMenuJewelry(data.jewelry || []);
        }
      } catch (error) {
        console.error("Error loading menu:", error);
      }
    };
    loadProducts();
    loadMenu();
    
    // Загружаем данные пользователя
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    // Загружаем текст верхней строки через API
    const loadTopBanner = async () => {
      try {
        const response = await fetch("/api/admin/top-banner");
        if (response.ok) {
          const data = await response.json();
          setTopBannerText(data.text || "");
        }
      } catch (error) {
        console.error("Error loading top banner:", error);
      }
    };
    loadTopBanner();
    
    if (typeof window !== "undefined") {

      const handleScroll = () => {
        setIsScrolled(window.scrollY > 10);
      };

      const updateHeaderHeight = () => {
        const header = document.querySelector("header");
        if (header) {
          setHeaderHeight(header.offsetHeight);
        }
      };

      window.addEventListener("scroll", handleScroll);
      updateHeaderHeight();
      window.addEventListener("resize", updateHeaderHeight);
      
      return () => {
        window.removeEventListener("scroll", handleScroll);
        window.removeEventListener("resize", updateHeaderHeight);
      };
    }
  }, []);

  const hasSaleProducts = products.some((p) => p.discount > 0);
  const watchesFeatured = menuWatches.slice(0, 4);

  return (
    <header
      className={`sticky top-0 z-50 shadow-sm transition-all duration-300 ${
        isScrolled ? "backdrop-blur-md" : ""
      }`}
      style={{
        backgroundColor: isScrolled ? "rgba(252, 250, 248, 0.85)" : "#FCFAF8",
      }}
    >
      {/* Top banner */}
      <div
        className="flex items-center justify-center text-center transition-all duration-300"
        style={{
          height: "32px",
          backgroundColor: "#D2C8BA",
          fontSize: "13px",
          letterSpacing: "0.3px",
          color: "rgba(0,0,0,0.75)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div className="container mx-auto px-4">
          <p className="m-0">{topBannerText}</p>
        </div>
      </div>

      {/* Main header */}
      <div
        className="container mx-auto px-4 relative"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          alignItems: "center",
          minHeight: "72px",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        {/* Left: Logo */}
        <div className="flex items-center justify-start">
          <Link href="/" className="text-2xl font-bold">
            Мира Брендс | Буркер
          </Link>
        </div>

        {/* Center: Menu — строго по центру страницы */}
        <nav className="hidden md:flex items-center gap-6 justify-self-center">
            {hasSaleProducts && (
              <Link href="/sale" className="hover:text-gray-600 inline-flex items-center py-1 min-h-[2.25rem]">
                СКИДКИ
              </Link>
            )}
            <div
              className="relative inline-flex items-center"
              onMouseEnter={() => setIsWatchesOpen(true)}
              onMouseLeave={() => setIsWatchesOpen(false)}
            >
              <button className="hover:text-gray-600 py-1 min-h-[2.25rem]">ЧАСЫ</button>
              <AnimatePresence>
                {isWatchesOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="fixed left-0 right-0 bg-white shadow-lg p-6 z-50 overflow-y-auto"
                    style={{ top: `${headerHeight}px`, maxHeight: "500px" }}
                  >
                    <div className="container mx-auto">
                      <div className="grid grid-cols-[250px_1fr] gap-8">
                      {/* Левое меню - подкатегории из БД */}
                      <div className="text-xl">
                        <Link
                          href="/products/watches"
                          className="block py-2 hover:text-gray-600 transition-colors font-semibold"
                          onClick={() => setIsWatchesOpen(false)}
                        >
                          Все часы
                        </Link>
                        {menuWatches.map((item) => (
                          <Link
                            key={item.slug}
                            href={item.href}
                            className={`block py-2 hover:text-gray-600 transition-colors ${item.label.includes("Petite") ? "text-sm text-gray-500" : ""}`}
                            onClick={() => setIsWatchesOpen(false)}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>

                      {/* Правый блок - до 4 коллекций с первым товаром */}
                      <div className="grid grid-cols-4 gap-3">
                        {watchesFeatured.map((item) => {
                          const firstProduct = products.find((p) => p.subcategory === item.label);
                          return (
                            <Link
                              key={item.slug}
                              href={item.href}
                              className="group"
                              onClick={() => setIsWatchesOpen(false)}
                            >
                              <div className="relative mb-2 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center" style={{ height: "360px", width: "100%" }}>
                                {firstProduct && firstProduct.images?.length > 0 ? (
                                  <ProductImage
                                    src={firstProduct.images[0]}
                                    alt={firstProduct.name}
                                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                                  />
                                ) : (
                                  <span className="text-2xl font-semibold text-gray-700 group-hover:text-black transition-colors">
                                    {item.label}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-medium group-hover:text-gray-600 transition-colors">
                                {item.label.toUpperCase()}
                              </p>
                            </Link>
                          );
                        })}
                      </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div
              className="relative inline-flex items-center"
              onMouseEnter={() => setIsJewelryOpen(true)}
              onMouseLeave={() => setIsJewelryOpen(false)}
            >
              <button className="hover:text-gray-600 py-1 min-h-[2.25rem]">УКРАШЕНИЯ</button>
              <AnimatePresence>
                {isJewelryOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="fixed left-0 right-0 bg-white shadow-lg p-6 z-50 overflow-y-auto"
                    style={{ top: `${headerHeight}px`, maxHeight: "500px" }}
                  >
                    <div className="container mx-auto">
                      <div className="grid grid-cols-[250px_1fr] gap-8">
                      {/* Левое меню - подкатегории из БД */}
                      <div className="text-xl">
                        <Link
                          href="/products/jewelry"
                          className="block py-2 hover:text-gray-600 transition-colors font-semibold"
                          onClick={() => setIsJewelryOpen(false)}
                        >
                          Все украшения
                        </Link>
                        {menuJewelry.map((item) => (
                          <Link
                            key={item.slug}
                            href={item.href}
                            className="block py-2 hover:text-gray-600 transition-colors"
                            onClick={() => setIsJewelryOpen(false)}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>

                      {/* Правый блок - категории с первым товаром */}
                      <div className="grid grid-cols-4 gap-3">
                        {menuJewelry.map((item) => {
                          const firstProduct = products.find(
                            (p) => p.collection === "Украшения" && p.subcategory === item.label
                          );
                          return (
                            <Link
                              key={item.slug}
                              href={item.href}
                              className="group"
                              onClick={() => setIsJewelryOpen(false)}
                            >
                              <div className="relative mb-2 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center" style={{ height: "360px", width: "100%" }}>
                                {firstProduct && firstProduct.images?.length > 0 ? (
                                  <ProductImage
                                    src={firstProduct.images[0]}
                                    alt={firstProduct.name}
                                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                                  />
                                ) : (
                                  <span className="text-2xl font-semibold text-gray-700 group-hover:text-black transition-colors">
                                    {item.label}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-medium group-hover:text-gray-600 transition-colors">
                                {item.label.toUpperCase()}
                              </p>
                            </Link>
                          );
                        })}
                      </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
        </nav>

        {/* Right: поиск, корзина, вход */}
        <div className="flex items-center justify-end gap-4 justify-self-end">
            {/* Поиск */}
            <button
              className="inline-flex items-center justify-center p-1"
              aria-label="Поиск"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
            
            {/* Корзина */}
            <Link href="/cart" className="relative" aria-label="Корзина">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <AnimatePresence>
                {cartItemsCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    {cartItemsCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            {/* Профиль или Войти */}
            {user ? (
              <div className="hidden md:flex items-center gap-4">
                <div className="relative group">
                  <button className="flex items-center gap-2 hover:text-gray-600">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span className="text-sm">{user.firstName || user.email}</span>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <div className="py-2">
                      <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
                        {user.email}
                      </div>
                      <Link
                        href="/orders"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Заказы
                      </Link>
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Профиль
                      </Link>
                      <button
                        onClick={logout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                      >
                        Выйти
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-4">
                <Link href="/login" className="text-sm hover:text-gray-600">
                  Войти
                </Link>
              </div>
            )}
            <button
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Меню"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>

        {/* Mobile menu — на всю ширину под grid */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 col-span-full">
            {hasSaleProducts && (
              <Link
                href="/sale"
                className="block py-2 hover:text-gray-600"
                onClick={() => setIsMenuOpen(false)}
              >
                СКИДКИ
              </Link>
            )}
            <div className="py-2">
              <button
                className="w-full text-left"
                onClick={() => setIsWatchesOpen(!isWatchesOpen)}
              >
                ЧАСЫ
              </button>
              {isWatchesOpen && (
                <div className="pl-4 mt-2">
                  <Link
                    href="/products/watches"
                    className="block py-2 hover:text-gray-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Все часы
                  </Link>
                  {menuWatches.map((item) => (
                    <Link
                      key={item.slug}
                      href={item.href}
                      className="block py-2 hover:text-gray-600"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="py-2">
              <button
                className="w-full text-left"
                onClick={() => setIsJewelryOpen(!isJewelryOpen)}
              >
                УКРАШЕНИЯ
              </button>
              {isJewelryOpen && (
                <div className="pl-4 mt-2">
                  <Link
                    href="/products/jewelry"
                    className="block py-2 hover:text-gray-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Все украшения
                  </Link>
                  {menuJewelry.map((item) => (
                    <Link
                      key={item.slug}
                      href={item.href}
                      className="block py-2 hover:text-gray-600"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {user ? (
              <>
                <div className="px-0 py-2 text-sm text-gray-700 border-b border-gray-200 mb-2">
                  {user.email}
                </div>
                <Link
                  href="/orders"
                  className="block py-2 hover:text-gray-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Заказы
                </Link>
                <Link
                  href="/profile"
                  className="block py-2 hover:text-gray-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Профиль
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                  }}
                  className="block py-2 text-red-600 hover:text-red-800 w-full text-left"
                >
                  Выйти
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="block py-2 hover:text-gray-600"
                onClick={() => setIsMenuOpen(false)}
              >
                Войти
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Search Panel */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-[60]"
            style={{ backgroundColor: "#FCFAF8" }}
          >
            <div className="container mx-auto px-4 py-8">
              <div className="flex items-center gap-4">
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (searchQuery.trim()) {
                      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
                      setIsSearchOpen(false);
                    }
                  }}
                  className="flex-1 flex items-center gap-4"
                >
                  <input
                    type="text"
                    placeholder="Поиск..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 outline-none bg-transparent text-gray-900 placeholder-gray-400"
                    style={{
                      fontFamily: '"Open Sans", sans-serif',
                      fontSize: "12px",
                      fontWeight: 400,
                      lineHeight: "19.2px",
                    }}
                    autoFocus
                  />
                </form>
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors ml-auto"
                  aria-label="Закрыть поиск"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

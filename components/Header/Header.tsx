"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { products } from "@/lib/data";
import { getTopBannerText } from "@/lib/topBanner";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWatchesOpen, setIsWatchesOpen] = useState(false);
  const [isJewelryOpen, setIsJewelryOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [topBannerText, setTopBannerText] = useState("КУПИТЕ СЕЙЧАС, ПЛАТИТЕ ПОТОМ С KLARNA • Бесплатная доставка от 39 €");
  const cartItemsCount = useStore((state) => state.getCartItemsCount());

  useEffect(() => {
    // Загружаем текст верхней строки
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("top_banner_text");
      if (stored) {
        setTopBannerText(stored);
      }
      
      // Слушаем изменения в localStorage
      const handleStorageChange = () => {
        const updated = localStorage.getItem("top_banner_text");
        if (updated) {
          setTopBannerText(updated);
        }
      };
      window.addEventListener("storage", handleStorageChange);
      
      // Также проверяем изменения каждую секунду (для обновления в той же вкладке)
      const interval = setInterval(() => {
        const updated = localStorage.getItem("top_banner_text");
        if (updated && updated !== topBannerText) {
          setTopBannerText(updated);
        }
      }, 1000);

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
        window.removeEventListener("storage", handleStorageChange);
        clearInterval(interval);
        window.removeEventListener("scroll", handleScroll);
        window.removeEventListener("resize", updateHeaderHeight);
      };
    }
  }, [topBannerText]);

  const collections = [
    "Diana",
    "Sophie",
    "Olivia",
    "Macy",
    "Isabell",
    "Julia",
    "Ruby",
  ];

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
        className="text-center py-2 text-sm transition-all duration-300"
        style={{
          backgroundColor: isScrolled ? "rgba(252, 250, 248, 0.85)" : "#FCFAF8",
        }}
      >
        <div className="container mx-auto px-4">
          <p className="text-gray-900">{topBannerText}</p>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-4 py-4 relative">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold">
            BurkerRussia
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/sale" className="hover:text-gray-600">
              SALE
            </Link>
            <div
              className="relative"
              onMouseEnter={() => setIsWatchesOpen(true)}
              onMouseLeave={() => setIsWatchesOpen(false)}
            >
              <button className="hover:text-gray-600">ЧАСЫ</button>
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
                      {/* Левое меню - подменю */}
                      <div>
                        <Link
                          href="/collections/watches"
                          className="block py-2 hover:text-gray-600 transition-colors font-semibold"
                        >
                          Все часы
                        </Link>
                        {collections.map((collection) => (
                          <Link
                            key={collection}
                            href={`/collections/${collection.toLowerCase()}`}
                            className="block py-2 hover:text-gray-600 transition-colors"
                          >
                            {collection}
                          </Link>
                        ))}
                        <Link
                          href="/collections/olivia"
                          className="block py-2 hover:text-gray-600 transition-colors text-sm text-gray-500"
                        >
                          Olivia Petite
                        </Link>
                        <Link
                          href="/collections/macy"
                          className="block py-2 hover:text-gray-600 transition-colors text-sm text-gray-500"
                        >
                          Macy Petite
                        </Link>
                        <Link
                          href="/collections/isabell"
                          className="block py-2 hover:text-gray-600 transition-colors text-sm text-gray-500"
                        >
                          Isabell Petite
                        </Link>
                        <Link
                          href="/collections/ruby"
                          className="block py-2 hover:text-gray-600 transition-colors text-sm text-gray-500"
                        >
                          Ruby Petite
                        </Link>
                      </div>

                      {/* Правый блок - 4 продукта */}
                      <div className="grid grid-cols-4 gap-3">
                        {products
                          .filter((p) => p.collection !== "Украшения")
                          .slice(0, 4)
                          .map((product) => (
                            <Link
                              key={product.id}
                              href={`/product/${product.id}`}
                              className="group"
                            >
                              <div className="relative mb-2 bg-gray-100 rounded-lg overflow-hidden" style={{ height: "360px", width: "100%" }}>
                                <Image
                                  src="/Isabell_gold_burgundy_1.webp"
                                  alt={product.name}
                                  fill
                                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                                  sizes="(max-width: 768px) 100vw, 360px"
                                />
                              </div>
                              <p className="text-xs font-medium group-hover:text-gray-600 transition-colors">
                                {product.collection.toUpperCase()} &gt;
                              </p>
                            </Link>
                          ))}
                      </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div
              className="relative"
              onMouseEnter={() => setIsJewelryOpen(true)}
              onMouseLeave={() => setIsJewelryOpen(false)}
            >
              <button className="hover:text-gray-600">УКРАШЕНИЯ</button>
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
                      {/* Левое меню - подменю */}
                      <div>
                        <Link
                          href="/collections/jewelry"
                          className="block py-2 hover:text-gray-600 transition-colors font-semibold"
                        >
                          Все украшения
                        </Link>
                        <Link
                          href="/collections/bracelets"
                          className="block py-2 hover:text-gray-600 transition-colors"
                        >
                          Браслеты
                        </Link>
                        <Link
                          href="/collections/necklaces"
                          className="block py-2 hover:text-gray-600 transition-colors"
                        >
                          Ожерелье
                        </Link>
                        <Link
                          href="/collections/earrings"
                          className="block py-2 hover:text-gray-600 transition-colors"
                        >
                          Серьги
                        </Link>
                        <Link
                          href="/collections/rings"
                          className="block py-2 hover:text-gray-600 transition-colors"
                        >
                          Кольца
                        </Link>
                      </div>

                      {/* Правый блок - 4 продукта */}
                      <div className="grid grid-cols-2 gap-3">
                        {products
                          .filter((p) => p.collection === "Украшения")
                          .slice(0, 4)
                          .map((product) => (
                            <Link
                              key={product.id}
                              href={`/product/${product.id}`}
                              className="group"
                            >
                              <div className="relative mb-2 bg-gray-100 rounded-lg overflow-hidden" style={{ height: "360px", width: "100%" }}>
                                <Image
                                  src="/Isabell_gold_burgundy_1.webp"
                                  alt={product.name}
                                  fill
                                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                                  sizes="(max-width: 768px) 100vw, 360px"
                                />
                              </div>
                              <p className="text-xs font-medium group-hover:text-gray-600 transition-colors">
                                {product.name.toUpperCase()} &gt;
                              </p>
                            </Link>
                          ))}
                      </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* Right side icons */}
          <div className="flex items-center gap-4">
            <button
              className="hidden md:block"
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
            <Link href="/account" className="hidden md:block" aria-label="Аккаунт">
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
            </Link>
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
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4">
            <Link
              href="/sale"
              className="block py-2 hover:text-gray-600"
              onClick={() => setIsMenuOpen(false)}
            >
              SALE
            </Link>
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
                    href="/collections/watches"
                    className="block py-2 hover:text-gray-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Все часы
                  </Link>
                  {collections.map((collection) => (
                    <Link
                      key={collection}
                      href={`/collections/${collection.toLowerCase()}`}
                      className="block py-2 hover:text-gray-600"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {collection}
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
                    href="/collections/jewelry"
                    className="block py-2 hover:text-gray-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Все украшения
                  </Link>
                  <Link
                    href="/collections/bracelets"
                    className="block py-2 hover:text-gray-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Браслеты
                  </Link>
                  <Link
                    href="/collections/necklaces"
                    className="block py-2 hover:text-gray-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Ожерелье
                  </Link>
                  <Link
                    href="/collections/earrings"
                    className="block py-2 hover:text-gray-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Серьги
                  </Link>
                  <Link
                    href="/collections/rings"
                    className="block py-2 hover:text-gray-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Кольца
                  </Link>
                </div>
              )}
            </div>
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
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
                    aria-label="Найти"
                  >
                    <svg
                      className="w-5 h-5"
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

"use client";

import { useState, useMemo } from "react";
import ProductCard from "@/components/ProductCard/ProductCard";
import { Product } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

type SortOption = "popular" | "price-low" | "price-high" | "new";

interface SalePageClientProps {
  saleProducts: Product[];
}

type CategoryFilter = "all" | "watches" | "jewelry";

export default function SalePageClient({ saleProducts }: SalePageClientProps) {
  const [sortOption, setSortOption] = useState<SortOption>("price-low");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState<string | null>(null);

  // Подкатегории по данным товаров со скидкой
  const { watchSubcategories, jewelrySubcategories } = useMemo(() => {
    const watches = new Set<string>();
    const jewelry = new Set<string>();
    saleProducts.forEach((p) => {
      if (p.collection !== "Украшения") {
        watches.add(p.collection);
      } else {
        if (p.subcategory) jewelry.add(p.subcategory);
      }
    });
    return {
      watchSubcategories: Array.from(watches).sort(),
      jewelrySubcategories: Array.from(jewelry).sort(),
    };
  }, [saleProducts]);

  // Фильтрация по категории и подкатегории
  const filteredProducts = useMemo(() => {
    let list = saleProducts;
    if (categoryFilter === "watches") {
      list = list.filter((p) => p.collection !== "Украшения");
      if (subcategoryFilter)
        list = list.filter((p) => p.collection === subcategoryFilter);
    } else if (categoryFilter === "jewelry") {
      list = list.filter((p) => p.collection === "Украшения");
      if (subcategoryFilter)
        list = list.filter((p) => p.subcategory === subcategoryFilter);
    }
    return list;
  }, [saleProducts, categoryFilter, subcategoryFilter]);

  // Сортировка товаров (мемоизация, чтобы список стабильно обновлялся при смене фильтра)
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      switch (sortOption) {
        case "popular":
          return b.discount - a.discount;
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "new":
          return b.id.localeCompare(a.id);
        default:
          return 0;
      }
    });
  }, [filteredProducts, sortOption]);

  const sortLabels: Record<SortOption, string> = {
    popular: "САМЫЙ ПРОДАВАЕМЫЙ",
    "price-low": "ЦЕНА (ОТ НИЗКОЙ К ВЫСОКОЙ)",
    "price-high": "ЦЕНА (ПО УБЫВАНИЮ)",
    new: "НОВЫЙ",
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Заголовок */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold mb-2">SALE</h1>
        <p className="text-xl text-gray-600 mb-4">ЧАСЫ • УКРАШЕНИЯ</p>
        <p className="text-2xl font-semibold" style={{ color: "#A13D42" }}>
          СКИДКИ ДО 80%
        </p>
      </div>

      {/* Фильтр по категориям и сортировка — в одной строке */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium text-gray-700" style={{ fontFamily: '"Open Sans", sans-serif' }}>
              КАТЕГОРИЯ
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setCategoryFilter("all");
                  setSubcategoryFilter(null);
                }}
                className={`px-4 py-2 rounded-md border text-sm transition-colors ${
                  categoryFilter === "all"
                    ? "border-black bg-black text-white"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
                style={{ fontFamily: '"Open Sans", sans-serif' }}
              >
                Все
              </button>
              <button
                onClick={() => {
                  setCategoryFilter("watches");
                  setSubcategoryFilter(null);
                }}
                className={`px-4 py-2 rounded-md border text-sm transition-colors ${
                  categoryFilter === "watches"
                    ? "border-black bg-black text-white"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
                style={{ fontFamily: '"Open Sans", sans-serif' }}
              >
                Часы
              </button>
              <button
                onClick={() => {
                  setCategoryFilter("jewelry");
                  setSubcategoryFilter(null);
                }}
                className={`px-4 py-2 rounded-md border text-sm transition-colors ${
                  categoryFilter === "jewelry"
                    ? "border-black bg-black text-white"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
                style={{ fontFamily: '"Open Sans", sans-serif' }}
              >
                Украшения
              </button>
            </div>
          </div>
          <div className="relative z-30">
          <button
            onClick={() => setIsSortOpen(!isSortOpen)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            style={{
              fontFamily: '"Open Sans", sans-serif',
              fontSize: "12px",
              fontWeight: 400,
              lineHeight: "19.2px",
              color: "rgb(0, 0, 0)",
            }}
          >
            <span>СОРТИРОВАТЬ</span>
            <svg
              className={`w-4 h-4 transition-transform ${
                isSortOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          <AnimatePresence>
            {isSortOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 mt-2 w-64 bg-white border border-gray-300 rounded-md shadow-lg z-30"
              >
                {Object.entries(sortLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSortOption(key as SortOption);
                      setIsSortOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                      sortOption === key ? "bg-gray-100 font-semibold" : ""
                    }`}
                    style={{
                      fontFamily: '"Open Sans", sans-serif',
                      fontSize: "12px",
                      fontWeight: sortOption === key ? 600 : 400,
                      lineHeight: "19.2px",
                      color: "rgb(0, 0, 0)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>

        {(categoryFilter === "watches" && watchSubcategories.length > 0) || (categoryFilter === "jewelry" && jewelrySubcategories.length > 0) ? (
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs text-gray-500 self-center mr-1" style={{ fontFamily: '"Open Sans", sans-serif' }}>
              Подкатегория:
            </span>
            {categoryFilter === "watches" &&
              watchSubcategories.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSubcategoryFilter(subcategoryFilter === sub ? null : sub)}
                  className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
                    subcategoryFilter === sub ? "border-black bg-gray-100 font-medium" : "border-gray-200 hover:bg-gray-50"
                  }`}
                  style={{ fontFamily: '"Open Sans", sans-serif' }}
                >
                  {sub}
                </button>
              ))}
            {categoryFilter === "jewelry" &&
              jewelrySubcategories.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSubcategoryFilter(subcategoryFilter === sub ? null : sub)}
                  className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
                    subcategoryFilter === sub ? "border-black bg-gray-100 font-medium" : "border-gray-200 hover:bg-gray-50"
                  }`}
                  style={{ fontFamily: '"Open Sans", sans-serif' }}
                >
                  {sub}
                </button>
              ))}
            {((categoryFilter === "watches" && watchSubcategories.length > 1) || (categoryFilter === "jewelry" && jewelrySubcategories.length > 1)) && (
              <button
                onClick={() => setSubcategoryFilter(null)}
                className="px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                style={{ fontFamily: '"Open Sans", sans-serif' }}
              >
                Все подкатегории
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* Сетка товаров — key по фильтру, чтобы при смене категории список гарантированно обновлялся */}
      {sortedProducts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-600 text-lg">Товары со скидкой не найдены.</p>
        </div>
      ) : (
        <div
          key={`${categoryFilter}-${subcategoryFilter ?? ""}`}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {sortedProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

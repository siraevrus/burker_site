"use client";

import { useState } from "react";
import ProductCard from "@/components/ProductCard/ProductCard";
import { Product } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

type SortOption = "popular" | "price-low" | "price-high" | "new";

interface SalePageClientProps {
  saleProducts: Product[];
}

export default function SalePageClient({ saleProducts }: SalePageClientProps) {
  const [sortOption, setSortOption] = useState<SortOption>("price-low");
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Сортировка товаров
  const sortedProducts = [...saleProducts].sort((a, b) => {
    switch (sortOption) {
      case "popular":
        // Сортировка по размеру скидки (больше скидка = популярнее)
        return b.discount - a.discount;
      case "price-low":
        return a.price - b.price;
      case "price-high":
        return b.price - a.price;
      case "new":
        // Для новых товаров можно использовать id или дату добавления
        // Пока используем обратный порядок id
        return b.id.localeCompare(a.id);
      default:
        return 0;
    }
  });

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

      {/* Фильтр сортировки */}
      <div className="mb-8 flex justify-end">
        <div className="relative">
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
                className="absolute right-0 mt-2 w-64 bg-white border border-gray-300 rounded-md shadow-lg z-10"
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

      {/* Сетка товаров */}
      {sortedProducts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-600 text-lg">Товары со скидкой не найдены.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

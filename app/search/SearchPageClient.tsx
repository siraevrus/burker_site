"use client";

import { useRef } from "react";
import ProductCard from "@/components/ProductCard/ProductCard";
import { Product } from "@/lib/types";
import { motion } from "framer-motion";

interface SearchPageClientProps {
  query: string;
  searchResults: Product[];
  randomProducts: Product[];
}

const SCROLL_STEP = 300;

export default function SearchPageClient({
  query,
  searchResults,
  randomProducts,
}: SearchPageClientProps) {
  const recommendationsRef = useRef<HTMLDivElement>(null);

  const scrollRecommendations = (direction: "left" | "right") => {
    if (!recommendationsRef.current) return;
    const delta = direction === "left" ? -SCROLL_STEP : SCROLL_STEP;
    recommendationsRef.current.scrollBy({ left: delta, behavior: "smooth" });
  };
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {query ? `Результаты поиска: "${query}"` : "Поиск товаров"}
        </h1>
        {query && (
          <p className="text-gray-600">
            Найдено товаров: {searchResults.length}
          </p>
        )}
      </div>

      {query.trim() ? (
        searchResults.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {searchResults.map((product, index) => (
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
        ) : (
          <>
            <div className="text-center py-16">
              <p className="text-gray-600 text-lg mb-4">
                По запросу "{query}" ничего не найдено
              </p>
              <p className="text-gray-500">
                Попробуйте изменить поисковый запрос
              </p>
            </div>

            {/* Блок "ВАМ ТАКЖЕ МОЖЕТ ПОНРАВИТЬСЯ" */}
            {randomProducts.length > 0 && (
              <section className="py-16">
                <div className="container mx-auto px-4 relative">
                  <h2 className="text-xl mb-4 text-center uppercase">ВАМ ТАКЖЕ МОЖЕТ ПОНРАВИТЬСЯ</h2>
                  <div className="flex justify-center mb-8">
                    <div style={{ width: 35, height: 3, backgroundColor: "#CAC8C6" }} />
                  </div>
                  <div className="relative flex items-center">
                    <button
                      type="button"
                      onClick={() => scrollRecommendations("left")}
                      className="absolute left-0 z-10 flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-md hover:bg-gray-50 hover:border-gray-300 transition-colors"
                      aria-label="Прокрутить влево"
                    >
                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div
                      ref={recommendationsRef}
                      className="overflow-x-auto pb-4 scrollbar-hide mx-12"
                    >
                      <div className="flex gap-6">
                        {randomProducts.map((product, index) => (
                          <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.3 }}
                            className="flex-shrink-0 w-64"
                          >
                            <ProductCard product={product} />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => scrollRecommendations("right")}
                      className="absolute right-0 z-10 flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-md hover:bg-gray-50 hover:border-gray-300 transition-colors"
                      aria-label="Прокрутить вправо"
                    >
                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </section>
            )}
          </>
        )
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-600 text-lg">
            Введите поисковый запрос в поле поиска
          </p>
        </div>
      )}
    </div>
  );
}

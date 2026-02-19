"use client";

import ProductCard from "@/components/ProductCard/ProductCard";
import { Product } from "@/lib/types";
import { motion } from "framer-motion";

interface SearchPageClientProps {
  query: string;
  searchResults: Product[];
}

export default function SearchPageClient({
  query,
  searchResults,
}: SearchPageClientProps) {
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
          <div className="text-center py-16">
            <p className="text-gray-600 text-lg mb-4">
              По запросу "{query}" ничего не найдено
            </p>
            <p className="text-gray-500">
              Попробуйте изменить поисковый запрос
            </p>
          </div>
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

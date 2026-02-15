"use client";

import { useState } from "react";
import ProductCard from "@/components/ProductCard/ProductCard";
import Filters from "@/components/Filters/Filters";
import { useStore } from "@/lib/store";
import { Product } from "@/lib/types";

interface WatchesPageClientProps {
  products: Product[];
}

export default function WatchesPageClient({ products }: WatchesPageClientProps) {
  const filters = useStore((state) => state.filters);
  const [sortBy, setSortBy] = useState<"price" | "discount" | "name">("price");

  // Фильтрация товаров
  let filteredProducts: Product[] = products.filter((product) => {
    if (filters.collection !== "all" && product.collection !== filters.collection) {
      return false;
    }
    // Фильтр по цвету
    if (filters.color !== "all" && !product.colors.includes(filters.color)) {
      return false;
    }
    return true;
  });

  // Сортировка
  filteredProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price":
        return a.price - b.price;
      case "discount":
        return b.discount - a.discount;
      case "name":
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Все часы</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar with filters */}
        <div className="lg:col-span-1">
          <Filters />
        </div>

        {/* Products grid */}
        <div className="lg:col-span-3">
          {/* Sort controls */}
          <div className="flex justify-between items-center mb-6">
            <p className="text-gray-600">
              Найдено товаров: {filteredProducts.length}
            </p>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "price" | "discount" | "name")
              }
              className="px-4 py-2 border border-gray-300 rounded-md"
            >
              <option value="price">По цене</option>
              <option value="discount">По скидке</option>
              <option value="name">По названию</option>
            </select>
          </div>

          {/* Products */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-600 text-lg">
                Товары не найдены. Попробуйте изменить фильтры.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard/ProductCard";
import { Product } from "@/lib/types";
import { motion } from "framer-motion";

export type ProductsCategoryKind = "watches" | "jewelry";

interface ProductsCategoryPageClientProps {
  products: Product[];
  category: ProductsCategoryKind;
}

/** Фильтрация по бренду/линии: как на /sale — часы по collection, украшения по subcategory */
export default function ProductsCategoryPageClient({
  products,
  category,
}: ProductsCategoryPageClientProps) {
  const [brandFilter, setBrandFilter] = useState<string | null>(null);

  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (category === "watches") {
        if (p.collection && p.collection !== "Украшения") set.add(p.collection);
      } else if (p.subcategory) {
        set.add(p.subcategory);
      }
    });
    return Array.from(set).sort();
  }, [products, category]);

  const filteredProducts = useMemo(() => {
    if (!brandFilter) return products;
    if (category === "watches") {
      return products.filter((p) => p.collection === brandFilter);
    }
    return products.filter((p) => p.subcategory === brandFilter);
  }, [products, category, brandFilter]);

  if (products.length === 0) {
    return null;
  }

  return (
    <>
      {brandOptions.length > 0 ? (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <span
              className="text-xs text-gray-500 self-center mr-1"
              style={{ fontFamily: '"Open Sans", sans-serif' }}
            >
              {category === "watches" ? "Бренд:" : "Подкатегория:"}
            </span>
            {brandOptions.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setBrandFilter(brandFilter === name ? null : name)}
                className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
                  brandFilter === name
                    ? "border-black bg-gray-100 font-medium"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
                style={{ fontFamily: '"Open Sans", sans-serif' }}
              >
                {name}
              </button>
            ))}
            {brandOptions.length > 1 ? (
              <button
                type="button"
                onClick={() => setBrandFilter(null)}
                className="px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                style={{ fontFamily: '"Open Sans", sans-serif' }}
              >
                {category === "watches" ? "Все бренды" : "Все подкатегории"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {filteredProducts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-600 text-lg">Товары по выбранному фильтру не найдены.</p>
        </div>
      ) : (
        <div
          key={brandFilter ?? ""}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {filteredProducts.map((product, index) => (
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
    </>
  );
}

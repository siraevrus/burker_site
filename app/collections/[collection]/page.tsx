"use client";

import { use } from "react";
import ProductCard from "@/components/ProductCard/ProductCard";
import { products } from "@/lib/data";
import { Product } from "@/lib/types";

export default function CollectionPage({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection } = use(params);
  
  const collectionName = collection.charAt(0).toUpperCase() + collection.slice(1);
  
  // Фильтрация товаров по коллекции
  const filteredProducts: Product[] = products.filter(
    (product) => product.collection.toLowerCase() === collection.toLowerCase()
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">{collectionName}</h1>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-600 text-lg">
            Товары коллекции {collectionName} не найдены.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

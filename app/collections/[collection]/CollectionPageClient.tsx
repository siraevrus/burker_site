"use client";

import ProductCard from "@/components/ProductCard/ProductCard";
import Breadcrumbs from "@/components/Breadcrumbs/Breadcrumbs";
import { Product } from "@/lib/types";
import { getCollectionBreadcrumbItems, getCollectionLabel } from "@/lib/utils";

interface CollectionPageClientProps {
  collection: string;
  products: Product[];
}

export default function CollectionPageClient({
  collection,
  products,
}: CollectionPageClientProps) {
  const collectionName = getCollectionLabel(collection);

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs items={getCollectionBreadcrumbItems(collection)} />
      <h1 className="text-4xl font-bold mb-8">{collectionName}</h1>

      {products.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-600 text-lg">
            Товары коллекции {collectionName} не найдены.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import {
  getWatchesProducts,
  getJewelryProducts,
} from "@/lib/products";
import { Product } from "@/lib/types";
import { getCanonicalUrl } from "@/lib/site-url";
import { getCollectionLabel, getProductsBreadcrumbItems } from "@/lib/utils";
import Breadcrumbs from "@/components/Breadcrumbs/Breadcrumbs";
import ProductCard from "@/components/ProductCard/ProductCard";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  if (category !== "watches" && category !== "jewelry") {
    return { title: "Товары | Мира Брендс | Буркер" };
  }
  const title = getCollectionLabel(category);
  return {
    title: `${title} | Мира Брендс | Буркер`,
    description: `Коллекция ${title} — часы и украшения Мира Брендс | Буркер`,
    alternates: { canonical: getCanonicalUrl(`/products/${category}`) },
  };
}

export default async function ProductsCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  let products: Product[] = [];

  if (category === "watches") {
    products = await getWatchesProducts();
  } else if (category === "jewelry") {
    products = await getJewelryProducts();
  }

  const categoryLabel = getCollectionLabel(category);

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs items={getProductsBreadcrumbItems(category)} />
      <h1 className="text-4xl font-bold mb-8">{categoryLabel}</h1>

      {products.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-600 text-lg">
            Товары категории {categoryLabel} не найдены.
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

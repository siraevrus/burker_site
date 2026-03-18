import type { Metadata } from "next";
import {
  getWatchesBySubcategory,
  getJewelryBySubcategory,
} from "@/lib/products";
import { Product } from "@/lib/types";
import { getCanonicalUrl } from "@/lib/site-url";
import { getCollectionLabel, getProductsBreadcrumbItems, SUBcategorySlugToName } from "@/lib/utils";
import Breadcrumbs from "@/components/Breadcrumbs/Breadcrumbs";
import ProductCard from "@/components/ProductCard/ProductCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; subcategory: string }>;
}): Promise<Metadata> {
  const { category, subcategory } = await params;
  const subcategoryName = SUBcategorySlugToName[subcategory.toLowerCase()];
  if (!subcategoryName || (category !== "watches" && category !== "jewelry")) {
    return { title: "Товары | Мира Брендс | Буркер" };
  }
  const title = getCollectionLabel(subcategory);
  return {
    title: `${title} | Мира Брендс | Буркер`,
    description: `Коллекция ${title} — часы и украшения Мира Брендс | Буркер`,
    alternates: { canonical: getCanonicalUrl(`/products/${category}/${subcategory}`) },
  };
}

export default async function ProductsSubcategoryPage({
  params,
}: {
  params: Promise<{ category: string; subcategory: string }>;
}) {
  const { category, subcategory } = await params;
  const subcategoryName = SUBcategorySlugToName[subcategory.toLowerCase()];
  let products: Product[] = [];

  if (subcategoryName) {
    if (category === "watches") {
      products = await getWatchesBySubcategory(subcategoryName);
    } else if (category === "jewelry") {
      products = await getJewelryBySubcategory(subcategoryName);
    }
  }

  const subcategoryLabel = getCollectionLabel(subcategory);

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs items={getProductsBreadcrumbItems(category, subcategory)} />
      <h1 className="text-4xl font-bold mb-8">{subcategoryLabel}</h1>

      {products.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-600 text-lg">
            Товары категории {subcategoryLabel} не найдены.
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

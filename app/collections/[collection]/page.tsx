import type { Metadata } from "next";
import { 
  getWatchesProducts, 
  getWatchesBySubcategory,
  getJewelryProducts,
  getJewelryBySubcategory 
} from "@/lib/products";
import { Product } from "@/lib/types";
import CollectionPageClient from "./CollectionPageClient";
import { getCanonicalUrl } from "@/lib/site-url";

// Маппинг URL на subcategory для часов
const watchesSubcategoryMap: Record<string, string> = {
  "diana": "Diana",
  "sophie": "Sophie",
  "olivia": "Olivia",
  "macy": "Macy",
  "isabell": "Isabell",
  "julia": "Julia",
  "ruby": "Ruby",
  "olivia-petite": "Olivia Petite",
  "macy-petite": "Macy Petite",
  "isabell-petite": "Isabell Petite",
  "ruby-petite": "Ruby Petite",
};

// Маппинг URL на subcategory для украшений
const jewelrySubcategoryMap: Record<string, string> = {
  "bracelets": "Браслеты",
  "necklaces": "Ожерелье",
  "earrings": "Серьги",
  "rings": "Кольца",
};

/** Отображаемое название коллекции для title */
const collectionDisplayNames: Record<string, string> = {
  ...Object.fromEntries(Object.entries(watchesSubcategoryMap)),
  ...Object.fromEntries(Object.entries(jewelrySubcategoryMap)),
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ collection: string }>;
}): Promise<Metadata> {
  const { collection } = await params;
  const path = `/collections/${collection}`;
  const displayName = collectionDisplayNames[collection] || collection;
  return {
    title: `${displayName} | Mira Brands | Burker`,
    description: `Коллекция ${displayName} — часы и украшения Mira Brands | Burker`,
    alternates: { canonical: getCanonicalUrl(path) },
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection } = await params;
  let products: Product[];

  // Обработка специальных случаев
  if (collection === "watches") {
    products = await getWatchesProducts();
  } else if (collection === "jewelry") {
    products = await getJewelryProducts();
  } else if (watchesSubcategoryMap[collection]) {
    // Часы по subcategory
    products = await getWatchesBySubcategory(watchesSubcategoryMap[collection]);
  } else if (jewelrySubcategoryMap[collection]) {
    // Украшения по subcategory
    products = await getJewelryBySubcategory(jewelrySubcategoryMap[collection]);
  } else {
    // Fallback: пустой массив
    products = [];
  }

  return <CollectionPageClient collection={collection} products={products} />;
}

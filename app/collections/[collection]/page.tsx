import { 
  getWatchesProducts, 
  getWatchesBySubcategory,
  getJewelryProducts,
  getJewelryBySubcategory 
} from "@/lib/products";
import CollectionPageClient from "./CollectionPageClient";

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

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection } = await params;
  let products;

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

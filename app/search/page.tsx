import type { Metadata } from "next";
import { searchProducts, getRandomProducts } from "@/lib/products";
import { getMetadataForPath } from "@/lib/seo";
import SearchPageClient from "./SearchPageClient";

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForPath("/search", {
    title: "Поиск | Мира Брендс | Буркер",
    description: "Поиск товаров в интернет-магазине Мира Брендс | Буркер",
  });
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const searchResults = q ? await searchProducts(q) : [];
  
  // Получаем случайные продукты для блока "ВАМ ТАКЖЕ МОЖЕТ ПОНРАВИТЬСЯ" если ничего не найдено
  const randomProducts = searchResults.length === 0 && q ? await getRandomProducts(4) : [];

  return <SearchPageClient query={q || ""} searchResults={searchResults} randomProducts={randomProducts} />;
}

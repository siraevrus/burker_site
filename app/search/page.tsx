import type { Metadata } from "next";
import { searchProducts } from "@/lib/products";
import { getMetadataForPath } from "@/lib/seo";
import SearchPageClient from "./SearchPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = await getMetadataForPath("/search", {
    title: "Поиск | Mira Brands | Burker",
    description: "Поиск товаров в интернет-магазине Mira Brands | Burker",
  });
  return { title, description };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const searchResults = q ? await searchProducts(q) : [];

  return <SearchPageClient query={q || ""} searchResults={searchResults} />;
}

import { searchProducts } from "@/lib/products";
import SearchPageClient from "./SearchPageClient";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const searchResults = q ? await searchProducts(q) : [];

  return <SearchPageClient query={q || ""} searchResults={searchResults} />;
}

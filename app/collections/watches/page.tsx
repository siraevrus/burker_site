import type { Metadata } from "next";
import { getWatchesProducts } from "@/lib/products";
import { getMetadataForPath } from "@/lib/seo";
import WatchesPageClient from "./WatchesPageClient";

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForPath("/collections/watches", {
    title: "Часы | Mira Brands | Burker",
    description: "Коллекция часов Mira Brands | Burker",
  });
}

export default async function WatchesPage() {
  const products = await getWatchesProducts();

  return <WatchesPageClient products={products} />;
}

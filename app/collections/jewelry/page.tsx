import type { Metadata } from "next";
import { getJewelryProducts } from "@/lib/products";
import { getMetadataForPath } from "@/lib/seo";
import JewelryPageClient from "./JewelryPageClient";

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForPath("/collections/jewelry", {
    title: "Украшения | Mira Brands | Burker",
    description: "Коллекция украшений Mira Brands | Burker",
  });
}

export default async function JewelryPage() {
  const products = await getJewelryProducts();

  return <JewelryPageClient products={products} />;
}

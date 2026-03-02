import type { Metadata } from "next";
import { getJewelryProducts } from "@/lib/products";
import { getMetadataForPath } from "@/lib/seo";
import JewelryPageClient from "./JewelryPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = await getMetadataForPath("/collections/jewelry", {
    title: "Украшения | Mira Brands | Burker",
    description: "Коллекция украшений Mira Brands | Burker",
  });
  return { title, description };
}

export default async function JewelryPage() {
  const products = await getJewelryProducts();

  return <JewelryPageClient products={products} />;
}

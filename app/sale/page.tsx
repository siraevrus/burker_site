import type { Metadata } from "next";
import { getProductsOnSale } from "@/lib/products";
import { getMetadataForPath } from "@/lib/seo";
import SalePageClient from "./SalePageClient";

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForPath("/sale", {
    title: "Распродажа | Мира Брендс | Буркер",
    description: "Товары со скидкой — Мира Брендс | Буркер",
  });
}

export default async function SalePage() {
  const saleProducts = await getProductsOnSale();

  return <SalePageClient saleProducts={saleProducts} />;
}

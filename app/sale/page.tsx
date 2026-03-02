import type { Metadata } from "next";
import { getProductsOnSale } from "@/lib/products";
import { getMetadataForPath } from "@/lib/seo";
import SalePageClient from "./SalePageClient";

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForPath("/sale", {
    title: "Распродажа | Mira Brands | Burker",
    description: "Товары со скидкой — Mira Brands | Burker",
  });
}

export default async function SalePage() {
  const saleProducts = await getProductsOnSale();

  return <SalePageClient saleProducts={saleProducts} />;
}

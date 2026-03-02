import type { Metadata } from "next";
import { getMetadataForPath } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForPath("/cart", {
    title: "Корзина | Mira Brands | Burker",
    description: "Корзина покупок в интернет-магазине Mira Brands | Burker",
  });
}

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

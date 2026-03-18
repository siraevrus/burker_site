import type { Metadata } from "next";
import { getMetadataForPath } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForPath("/cart", {
    title: "Корзина | Мира Брендс | Буркер",
    description: "Корзина покупок в интернет-магазине Мира Брендс | Буркер",
  });
}

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

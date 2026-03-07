import type { Metadata } from "next";
import { getMetadataForPath } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForPath("/order-confirmation", {
    title: "Подтверждение заказа | Mira Brands | Burker",
    description: "Подтверждение заказа в интернет-магазине Mira Brands | Burker",
  });
}

export default function OrderConfirmationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

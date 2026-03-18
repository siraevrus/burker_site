import type { Metadata } from "next";
import { getMetadataForPath } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForPath("/order-confirmation", {
    title: "Подтверждение заказа | Мира Брендс | Буркер",
    description: "Подтверждение заказа в интернет-магазине Мира Брендс | Буркер",
  });
}

export default function OrderConfirmationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

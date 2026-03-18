import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getUserOrders } from "@/lib/orders";
import { redirect } from "next/navigation";
import { getMetadataForPath } from "@/lib/seo";
import OrdersPageClient from "./OrdersPageClient";

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForPath("/orders", {
    title: "Мои заказы | Мира Брендс | Буркер",
    description: "История заказов в интернет-магазине Мира Брендс | Буркер",
  });
}

export default async function OrdersPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?redirect=/orders");
  }

  const orders = await getUserOrders(currentUser.userId);

  return <OrdersPageClient orders={orders} />;
}

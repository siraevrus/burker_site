import { getCurrentUser } from "@/lib/auth";
import { getUserOrders } from "@/lib/orders";
import { redirect } from "next/navigation";
import OrdersPageClient from "./OrdersPageClient";

export default async function OrdersPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?redirect=/orders");
  }

  const orders = await getUserOrders(currentUser.userId);

  return <OrdersPageClient orders={orders} />;
}

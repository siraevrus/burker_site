import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOrderById } from "@/lib/orders";
import OrderConfirmationClient from "./OrderConfirmationClient";

interface Props {
  searchParams: Promise<{ id?: string; token?: string; paid?: string }>;
}

export default async function OrderConfirmationPage({ searchParams }: Props) {
  const { id: orderId } = await searchParams;

  if (!orderId) {
    redirect("/");
  }

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(`/login?redirect=/order-confirmation?id=${orderId}`);
  }

  const order = await getOrderById(orderId);

  if (!order) {
    redirect("/");
  }

  if (order.userId !== currentUser.userId) {
    redirect("/orders");
  }

  return <OrderConfirmationClient />;
}

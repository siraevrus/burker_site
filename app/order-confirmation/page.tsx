import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOrderById } from "@/lib/orders";
import OrderConfirmationClient from "./OrderConfirmationClient";

interface Props {
  searchParams: Promise<{ id?: string; token?: string; paid?: string }>;
}

export default async function OrderConfirmationPage({ searchParams }: Props) {
  const { id: orderId, token } = await searchParams;

  // Нет id — нечего показывать
  if (!orderId) {
    redirect("/");
  }

  const order = await getOrderById(orderId);

  // Заказ не найден
  if (!order) {
    redirect("/");
  }

  const currentUser = await getCurrentUser();

  const isOwner =
    currentUser != null &&
    order.userId != null &&
    order.userId === currentUser.userId;

  const isGuestWithToken =
    order.userId == null &&
    order.accessToken != null &&
    typeof token === "string" &&
    token.length > 0 &&
    order.accessToken === token;

  // Нет прав — редирект на логин
  if (!isOwner && !isGuestWithToken) {
    redirect(`/login?redirect=/order-confirmation?id=${orderId}`);
  }

  // Права подтверждены — рендерим клиентский компонент
  // (он сам дозагрузит данные через API с тем же токеном)
  return <OrderConfirmationClient />;
}

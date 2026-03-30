import type { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/site-url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const path = `/order/${id}/dashboard`;
  return {
    title: "Заказ — сводка | Мира Брендс | Буркер",
    description: "Сводка по оплаченному заказу: сумма, комиссия, доставка, статус",
    alternates: { canonical: getCanonicalUrl(path) },
    robots: { index: false, follow: false },
  };
}

export default function OrderDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

import type { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/site-url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const path = `/order/${id}/pay`;
  return {
    title: "Оплата заказа | Мира Брендс | Буркер",
    description: "Оплата заказа в интернет-магазине Мира Брендс | Буркер",
    alternates: { canonical: getCanonicalUrl(path) },
  };
}

export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

import type { Metadata } from "next";
import { getMetadataForPath } from "@/lib/seo";
import StatusOrderClient from "./StatusOrderClient";

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForPath("/status", {
    title: "Статус заказа | Мира Брендс | Буркер",
    description:
      "Проверьте статус заказа по номеру и телефону — Мира Брендс | Буркер",
  });
}

export default function StatusPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <StatusOrderClient />
    </div>
  );
}

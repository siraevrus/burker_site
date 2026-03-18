import type { Metadata } from "next";
import { getMetadataForPath } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForPath("/login", {
    title: "Вход | Мира Брендс | Буркер",
    description: "Вход в личный кабинет интернет-магазина Мира Брендс | Буркер",
  });
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

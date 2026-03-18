import type { Metadata } from "next";
import { getMetadataForPath } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForPath("/register", {
    title: "Регистрация | Мира Брендс | Буркер",
    description: "Регистрация в интернет-магазине Мира Брендс | Буркер",
  });
}

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

import type { Metadata } from "next";
import { getMetadataForPath } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForPath("/reset-password", {
    title: "Сброс пароля | Мира Брендс | Буркер",
    description: "Сброс пароля в интернет-магазине Мира Брендс | Буркер",
  });
}

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

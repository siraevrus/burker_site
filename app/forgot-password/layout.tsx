import type { Metadata } from "next";
import { getMetadataForPath } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForPath("/forgot-password", {
    title: "Восстановление пароля | Мира Брендс | Буркер",
    description: "Восстановление пароля в интернет-магазине Мира Брендс | Буркер",
  });
}

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

import type { Metadata } from "next";
import { getMetadataForPath } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForPath("/forgot-password", {
    title: "Восстановление пароля | Mira Brands | Burker",
    description: "Восстановление пароля в интернет-магазине Mira Brands | Burker",
  });
}

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

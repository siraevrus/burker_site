import type { Metadata } from "next";
import { getMetadataForPath } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForPath("/reset-password", {
    title: "Сброс пароля | Mira Brands | Burker",
    description: "Сброс пароля в интернет-магазине Mira Brands | Burker",
  });
}

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

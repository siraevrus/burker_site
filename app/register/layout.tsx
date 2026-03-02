import type { Metadata } from "next";
import { getMetadataForPath } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForPath("/register", {
    title: "Регистрация | Mira Brands | Burker",
    description: "Регистрация в интернет-магазине Mira Brands | Burker",
  });
}

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

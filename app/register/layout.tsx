import type { Metadata } from "next";
import { getMetadataForPath } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = await getMetadataForPath("/register", {
    title: "Регистрация | Mira Brands | Burker",
    description: "Регистрация в интернет-магазине Mira Brands | Burker",
  });
  return { title, description };
}

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

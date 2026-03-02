import type { Metadata } from "next";
import { getMetadataForPath } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForPath("/login", {
    title: "Вход | Mira Brands | Burker",
    description: "Вход в личный кабинет интернет-магазина Mira Brands | Burker",
  });
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

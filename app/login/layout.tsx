import type { Metadata } from "next";
import { getMetadataForPath } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = await getMetadataForPath("/login", {
    title: "Вход | Mira Brands | Burker",
    description: "Вход в личный кабинет интернет-магазина Mira Brands | Burker",
  });
  return { title, description };
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

import type { Metadata } from "next";
import { getMetadataForPath } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForPath("/verify-email", {
    title: "Подтверждение email | Mira Brands | Burker",
    description: "Подтверждение email в интернет-магазине Mira Brands | Burker",
  });
}

export default function VerifyEmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

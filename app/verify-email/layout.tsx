import type { Metadata } from "next";
import { getMetadataForPath } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForPath("/verify-email", {
    title: "Подтверждение email | Мира Брендс | Буркер",
    description: "Подтверждение email в интернет-магазине Мира Брендс | Буркер",
  });
}

export default function VerifyEmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

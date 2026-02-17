"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import CookieBanner from "@/components/CookieBanner/CookieBanner";

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith("/admin");

  if (isAdminPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <CookieBanner />
    </>
  );
}

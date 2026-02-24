import type { Metadata } from "next";
import { Geist, Geist_Mono, Open_Sans } from "next/font/google";
import "./globals.css";
import ConditionalLayout from "@/components/ConditionalLayout";
import YandexMetrika from "@/components/YandexMetrika/YandexMetrika";
import StoreHydration from "@/components/StoreHydration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Mira Brands | Burker | Официальный магазин",
  description: "Элегантные женские часы и украшения от Mira Brands | Burker",
  verification: {
    yandex: "b3064b64a4d24ac9",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${openSans.variable} antialiased bg-[#FCFAF8]`}
      >
        <StoreHydration />
        <YandexMetrika />
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  );
}

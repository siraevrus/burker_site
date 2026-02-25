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

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://www.burker-watches.ru";

export const metadata: Metadata = {
  title: "Mira Brands | Burker | Официальный магазин",
  description: "Элегантные женские часы и украшения от Mira Brands | Burker",
  metadataBase: new URL(baseUrl),
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: baseUrl,
    siteName: "Mira Brands | Burker",
    title: "Mira Brands | Burker | Официальный магазин",
    description: "Элегантные женские часы и украшения от Mira Brands | Burker",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Mira Brands | Burker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mira Brands | Burker | Официальный магазин",
    description: "Элегантные женские часы и украшения от Mira Brands | Burker",
    images: ["/og.png"],
  },
  verification: {
    yandex: "b3064b64a4d24ac9",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
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

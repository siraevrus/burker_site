import type { Metadata } from "next";
import { Geist, Geist_Mono, Open_Sans } from "next/font/google";
import "./globals.css";
import ConditionalLayout from "@/components/ConditionalLayout";
import YandexMetrika from "@/components/YandexMetrika/YandexMetrika";
import StoreHydration from "@/components/StoreHydration";
import { CatalogMapsProvider } from "@/components/CatalogMapsProvider";
import { CANONICAL_SITE_URL } from "@/lib/site-url";
import { getCatalogMaps } from "@/lib/catalog-lines";

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

const baseUrl = CANONICAL_SITE_URL.replace(/\/+$/, "");

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Мира Брендс | Буркер",
  url: baseUrl,
  logo: `${baseUrl}/og.png`,
  description: "Элегантные женские часы и украшения от Мира Брендс | Буркер",
};

export const metadata: Metadata = {
  title: "Мира Брендс | Буркер | Официальный магазин",
  description: "Элегантные женские часы и украшения от Мира Брендс | Буркер",
  metadataBase: new URL(baseUrl),
  alternates: { canonical: baseUrl },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: baseUrl,
    siteName: "Мира Брендс | Буркер",
    title: "Мира Брендс | Буркер | Официальный магазин",
    description: "Элегантные женские часы и украшения от Мира Брендс | Буркер",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Мира Брендс | Буркер",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Мира Брендс | Буркер | Официальный магазин",
    description: "Элегантные женские часы и украшения от Мира Брендс | Буркер",
    images: ["/og.png"],
  },
  verification: {
    yandex: "b3064b64a4d24ac9",
  },
  icons: {
    icon: { url: `${baseUrl}/favicon.ico`, type: "image/x-icon" },
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const catalogMaps = await getCatalogMaps();

  return (
    <html lang="ru">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${openSans.variable} antialiased bg-[#FCFAF8]`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <CatalogMapsProvider maps={catalogMaps}>
          <StoreHydration />
          <YandexMetrika />
          <ConditionalLayout>{children}</ConditionalLayout>
        </CatalogMapsProvider>
      </body>
    </html>
  );
}

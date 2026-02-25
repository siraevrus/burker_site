import type { Metadata } from "next";
import { getProductById, getAllProducts } from "@/lib/products";
import { notFound } from "next/navigation";
import ProductPageClient from "./ProductPageClient";

export const dynamic = "force-dynamic";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://www.burker-watches.ru";

function absoluteImageUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return path.startsWith("/") ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return { title: "Товар | Mira Brands | Burker" };

  const title = `${product.name} | Mira Brands | Burker`;
  const description =
    product.description?.replace(/<[^>]+>/g, "").slice(0, 160) ||
    `Купить ${product.name} в официальном магазине Mira Brands | Burker`;
  const canonicalUrl = `${baseUrl}/product/${id}`;
  const imageUrl =
    product.images?.length > 0
      ? absoluteImageUrl(product.images[0])
      : `${baseUrl}/og.png`;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      locale: "ru_RU",
      url: canonicalUrl,
      siteName: "Mira Brands | Burker",
      title,
      description,
      images: [
        { url: imageUrl, width: 1200, height: 630, alt: product.name },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);
  const allProducts = await getAllProducts();

  if (!product) {
    notFound();
  }

  return <ProductPageClient product={product} allProducts={allProducts} />;
}

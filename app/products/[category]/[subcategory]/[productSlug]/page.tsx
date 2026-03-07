import type { Metadata } from "next";
import { getProductByPath, getAllProducts } from "@/lib/products";
import { notFound } from "next/navigation";
import ProductPageClient from "./ProductPageClient";
import { CANONICAL_SITE_URL } from "@/lib/site-url";
import { generateProductPath } from "@/lib/utils";

export const dynamic = "force-dynamic";

const baseUrl = CANONICAL_SITE_URL.replace(/\/+$/, "");

function absoluteImageUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return path.startsWith("/") ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; subcategory: string; productSlug: string }>;
}): Promise<Metadata> {
  const { category, subcategory, productSlug } = await params;
  const product = await getProductByPath(category, subcategory, productSlug);
  if (!product) return { title: "Товар | Mira Brands | Burker" };

  const title = `${product.name} | Mira Brands | Burker`;
  const description =
    product.description?.replace(/<[^>]+>/g, "").slice(0, 160) ||
    `Купить ${product.name} в официальном магазине Mira Brands | Burker`;
  const productPath = generateProductPath(product);
  const canonicalUrl = productPath ? `${baseUrl}${productPath}` : `${baseUrl}/products/${category}/${subcategory}/${productSlug}`;
  const imageUrl =
    product.images?.length > 0
      ? absoluteImageUrl(product.images[0])
      : `${baseUrl}/og.png`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
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
  params: Promise<{ category: string; subcategory: string; productSlug: string }>;
}) {
  const { category, subcategory, productSlug } = await params;
  const product = await getProductByPath(category, subcategory, productSlug);
  const allProducts = await getAllProducts();

  if (!product) {
    notFound();
  }

  const productPath = generateProductPath(product);
  const productUrl = productPath ? `${baseUrl}${productPath}` : `${baseUrl}/products/${category}/${subcategory}/${productSlug}`;
  const imageUrls =
    product.images?.length > 0
      ? product.images.map((img) => absoluteImageUrl(img))
      : [`${baseUrl}/og.png`];

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description:
      product.description?.replace(/<[^>]+>/g, "").slice(0, 500) ||
      `Купить ${product.name} в официальном магазине Mira Brands | Burker`,
    image: imageUrls,
    url: productUrl,
    offers: {
      "@type": "Offer",
      price: product.price.toFixed(0),
      priceCurrency: "RUB",
      availability: product.soldOut
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      url: productUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <ProductPageClient product={product} allProducts={allProducts} />
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import { prisma } from "@/lib/db";
import { CANONICAL_SITE_URL } from "@/lib/site-url";

const baseUrl = CANONICAL_SITE_URL;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await prisma.page.findFirst({
    where: { slug, published: true },
  });
  if (!page) return { title: "Mira Brands | Burker" };
  const title = `${page.seoTitle?.trim() || page.title} | Mira Brands | Burker`;
  const description = page.seoDescription?.trim() || page.title;
  const url = `${baseUrl}/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "ru_RU",
      url,
      siteName: "Mira Brands | Burker",
      title,
      description,
      images: [{ url: `${baseUrl}/og.png`, width: 1200, height: 630, alt: "Mira Brands | Burker" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${baseUrl}/og.png`],
    },
  };
}

export default async function DynamicPage({ params }: Props) {
  const { slug } = await params;
  const page = await prisma.page.findFirst({
    where: { slug, published: true },
  });
  if (!page) notFound();

  const sanitizedContent = DOMPurify.sanitize(page.content, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "hr",
      "table", "thead", "tbody", "tr", "th", "td", "span", "div",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class", "style"],
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">{page.title}</h1>
      <div
        className="prose prose-lg max-w-none text-gray-700 [&_a]:text-[#A13D42] [&_a]:underline"
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
    </div>
  );
}

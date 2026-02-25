import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = await prisma.page.findFirst({
    where: { slug, published: true },
  });
  if (!page) return { title: "Mira Brands | Burker" };
  const title = page.seoTitle?.trim() || page.title;
  const description = page.seoDescription?.trim() || page.title;
  return {
    title: `${title} | Mira Brands | Burker`,
    description,
  };
}

export default async function DynamicPage({ params }: Props) {
  const { slug } = await params;
  const page = await prisma.page.findFirst({
    where: { slug, published: true },
  });
  if (!page) notFound();

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">{page.title}</h1>
      <div
        className="prose prose-lg max-w-none text-gray-700 [&_a]:text-[#A13D42] [&_a]:underline"
        dangerouslySetInnerHTML={{ __html: page.content }}
      />
    </div>
  );
}

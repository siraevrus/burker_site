import { getProductById, getAllProducts } from "@/lib/products";
import { notFound } from "next/navigation";
import ProductPageClient from "./ProductPageClient";

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

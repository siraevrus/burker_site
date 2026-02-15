import { notFound } from "next/navigation";
import { getProductById } from "@/lib/products";
import AdminProductEditClient from "./AdminProductEditClient";

export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  return <AdminProductEditClient product={product} />;
}
import { getProductsOnSale } from "@/lib/products";
import SalePageClient from "./SalePageClient";

export default async function SalePage() {
  const saleProducts = await getProductsOnSale();

  return <SalePageClient saleProducts={saleProducts} />;
}

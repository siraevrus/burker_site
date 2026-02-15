import { getJewelryProducts } from "@/lib/products";
import JewelryPageClient from "./JewelryPageClient";

export default async function JewelryPage() {
  const products = await getJewelryProducts();

  return <JewelryPageClient products={products} />;
}

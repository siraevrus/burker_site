import { getAllProducts, getBestsellers } from "@/lib/products";
import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [allProducts, bestsellers] = await Promise.all([
    getAllProducts(),
    getBestsellers(20),
  ]);

  return <HomeClient products={allProducts} bestsellers={bestsellers} />;
}

import { getAllProducts, getBestsellers } from "@/lib/products";
import { getHomeBrandCollections } from "@/lib/catalog-lines";
import HomeClient from "./HomeClient";
import { getMetadataForPath } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return getMetadataForPath("/", {
    title: "Мира Брендс | Буркер | Официальный магазин",
    description: "Элегантные женские часы и украшения от Мира Брендс | Буркер",
  });
}

export default async function Home() {
  const [allProducts, bestsellers, homeBrands] = await Promise.all([
    getAllProducts(),
    getBestsellers(20),
    getHomeBrandCollections(),
  ]);

  return (
    <HomeClient
      products={allProducts}
      bestsellers={bestsellers}
      homeBrands={homeBrands}
    />
  );
}

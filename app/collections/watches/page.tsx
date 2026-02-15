import { getWatchesProducts } from "@/lib/products";
import WatchesPageClient from "./WatchesPageClient";

export default async function WatchesPage() {
  const products = await getWatchesProducts();

  return <WatchesPageClient products={products} />;
}

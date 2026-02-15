import { getBestsellers } from "@/lib/products";
import NotFoundClient from "./not-found/NotFoundClient";

export default async function NotFound() {
  const bestsellers = await getBestsellers(8);

  return <NotFoundClient bestsellers={bestsellers} />;
}

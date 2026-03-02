import { getBestsellers } from "@/lib/products";
import NotFoundClient from "./not-found/NotFoundClient";

export const metadata = {
  title: "404 — Страница не найдена | Mira Brands | Burker",
  description: "Запрашиваемая страница не найдена. Вернитесь на главную или в каталог Mira Brands | Burker.",
};

export default async function NotFound() {
  let bestsellers: Awaited<ReturnType<typeof getBestsellers>> = [];
  try {
    bestsellers = await getBestsellers(8);
  } catch {
    // показываем 404 без блока рекомендаций при ошибке БД
  }

  return <NotFoundClient bestsellers={bestsellers} />;
}

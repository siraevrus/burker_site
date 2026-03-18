import type { Metadata } from "next";
import { getBestsellers } from "@/lib/products";
import NotFoundClient from "./not-found/NotFoundClient";

export const metadata: Metadata = {
  title: "404 — Страница не найдена | Мира Брендс | Буркер",
  description: "Запрашиваемая страница не найдена. Вернитесь на главную или в каталог Мира Брендс | Буркер.",
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

"use client";

import Link from "next/link";
import ProductCard from "@/components/ProductCard/ProductCard";
import { Product } from "@/lib/types";
import { motion } from "framer-motion";

interface NotFoundClientProps {
  bestsellers: Product[];
}

export default function NotFoundClient({ bestsellers }: NotFoundClientProps) {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Заголовок */}
      <div className="text-center mb-12">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            fontFamily: '"Open Sans", sans-serif',
            fontSize: "47.81px",
            fontWeight: 500,
            lineHeight: "59.7625px",
            color: "rgb(0, 0, 0)",
          }}
          className="mb-4"
        >
          Упс, к сожалению, этот товар больше не продается
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          style={{
            fontFamily: '"Open Sans", sans-serif',
            fontSize: "21.58px",
            fontWeight: 400,
            lineHeight: "34.528px",
            color: "rgb(0, 0, 0)",
          }}
        >
          Ниже приведены другие основные моменты из нашей коллекции!
        </motion.p>
      </div>

      {/* Бестселлеры */}
      <section className="mb-16">
        <div className="mb-8">
          <h2 className="text-xl text-center uppercase">Бестселлеры</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {bestsellers.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Кнопка возврата на главную */}
      <div className="text-center">
        <Link
          href="/"
          className="inline-block bg-black text-white px-8 py-3 rounded-md hover:bg-gray-800 transition-colors font-semibold"
        >
          Вернуться на главную
        </Link>
      </div>
    </div>
  );
}

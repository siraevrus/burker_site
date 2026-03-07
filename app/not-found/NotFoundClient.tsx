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
      {/* Заголовок 404 */}
      <div className="text-center mb-14">
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-6xl md:text-8xl font-light text-[#A13D42] mb-4"
          style={{ fontFamily: '"Open Sans", sans-serif' }}
        >
          404
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            fontFamily: '"Open Sans", sans-serif',
            fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
            fontWeight: 500,
            lineHeight: 1.3,
            color: "rgb(0, 0, 0)",
          }}
          className="mb-4"
        >
          Страница не найдена
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{
            fontFamily: '"Open Sans", sans-serif',
            fontSize: "1rem",
            fontWeight: 400,
            lineHeight: 1.5,
            color: "rgb(100, 100, 100)",
          }}
          className="max-w-md mx-auto mb-10"
        >
          Возможно, адрес изменился или страница удалена. Перейдите на главную или в каталог.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/"
            className="inline-block bg-[#A13D42] text-white px-8 py-3 rounded-md hover:bg-[#8a3540] transition-colors font-medium"
            style={{ fontFamily: '"Open Sans", sans-serif' }}
          >
            На главную
          </Link>
          <Link
            href="/products/watches"
            className="inline-block border border-black px-8 py-3 rounded-md hover:bg-black hover:text-white transition-colors font-medium"
            style={{ fontFamily: '"Open Sans", sans-serif' }}
          >
            Каталог часов
          </Link>
          <Link
            href="/search"
            className="inline-block border border-gray-400 text-gray-700 px-8 py-3 rounded-md hover:border-black hover:text-black transition-colors font-medium"
            style={{ fontFamily: '"Open Sans", sans-serif' }}
          >
            Поиск
          </Link>
        </motion.div>
      </div>

      {/* Рекомендации (если есть бестселлеры) */}
      {bestsellers.length > 0 && (
        <section className="mb-16">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-center uppercase mb-8"
            style={{ fontFamily: '"Open Sans", sans-serif' }}
          >
            Вам может понравиться
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {bestsellers.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.05, duration: 0.3 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard/ProductCard";
import { products } from "@/lib/data";
import { motion } from "framer-motion";

export default function Home() {
  const [activeBrand, setActiveBrand] = useState("Ruby");

  // Бестселлеры (первые 8 товаров с наибольшей скидкой)
  const bestsellers = [...products]
    .sort((a, b) => b.discount - a.discount)
    .slice(0, 8);

  // Коллекции для секции
  const collections = [
    { name: "Macy", image: "/collections/macy.jpg" },
    { name: "Olivia", image: "/collections/olivia.jpg" },
    { name: "Julia", image: "/collections/julia.jpg" },
    { name: "Isabell", image: "/collections/isabell.jpg" },
    { name: "Ruby", image: "/collections/ruby.jpg" },
  ];

  const brands = ["Macy", "Olivia", "Julia", "Isabell", "Ruby"];

  return (
    <div>
      {/* Hero Section - Valentine's Sale */}
      <section className="bg-gradient-to-r from-pink-100 to-red-100" style={{ height: "701px" }}>
        <div className="container mx-auto px-4 text-center h-full flex flex-col items-center justify-center">
          <motion.h1
            className="text-5xl md:text-6xl font-bold mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            VALENTINE&apos;S SALE
          </motion.h1>
          <motion.p
            className="text-xl mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            ЧАСЫ • УКРАШЕНИЯ
          </motion.p>
        </div>
      </section>

      {/* Бестселлеры */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-xl mb-8 text-center uppercase">Бестселлеры</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
        </div>
      </section>

      {/* Познакомьтесь с коллекцией часов */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-xl mb-4 text-center uppercase">
            ПОЗНАКОМЬТЕСЬ С НАШЕЙ КОЛЛЕКЦИЕЙ ЧАСОВ
          </h2>
          {/* Brands list */}
          <div className="flex justify-center gap-4 mb-8 flex-wrap">
            {brands.map((brand) => (
              <button
                key={brand}
                onClick={() => setActiveBrand(brand)}
                className={`px-4 py-2 rounded-full transition-colors ${
                  activeBrand === brand
                    ? "bg-gray-200 text-gray-900"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {brand.toUpperCase()}
              </button>
            ))}
          </div>
          {/* Products from active brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {products
              .filter((p) => p.collection === activeBrand && p.collection !== "Украшения")
              .slice(0, 4)
              .map((product, index) => (
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
        </div>
      </section>

      {/* Секция с товарами по коллекциям */}
      <section className="py-16" style={{ backgroundColor: "#FCFAF8" }}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Часы */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Часы</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {products
                  .filter((p) => p.collection !== "Украшения")
                  .slice(0, 4)
                  .map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
              </div>
            </div>

            {/* Украшения */}
            <div>
              <h2 className="text-2xl font-bold mb-6">УКРАШЕНИЯ</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {products
                  .filter((p) => p.collection === "Украшения")
                  .slice(0, 4)
                  .map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

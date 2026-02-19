"use client";

import { useState } from "react";
import ProductCard from "@/components/ProductCard/ProductCard";
import PromoBannerGallery from "@/components/PromoBanner/PromoBanner";
import { Product } from "@/lib/types";
import { motion } from "framer-motion";

interface HomeClientProps {
  products: Product[];
  bestsellers: Product[];
}

export default function HomeClient({ products, bestsellers }: HomeClientProps) {
  const [activeBrand, setActiveBrand] = useState("Ruby");

  const brands = ["Macy", "Olivia", "Julia", "Isabell", "Ruby"];

  return (
    <div>
      {/* Promo Banner Gallery */}
      <PromoBannerGallery />

      {/* Бестселлеры */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-xl mb-4 text-center uppercase">Бестселлеры</h2>
          <div className="flex justify-center mb-8">
            <div style={{ width: 35, height: 3, backgroundColor: "#CAC8C6" }} />
          </div>
          <div className="overflow-x-auto pb-4 scrollbar-hide">
            <div className="flex gap-6">
              {bestsellers.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  className="flex-shrink-0 w-64"
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Познакомьтесь с коллекцией часов */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-xl mb-4 text-center uppercase">
            ПОЗНАКОМЬТЕСЬ С НАШЕЙ КОЛЛЕКЦИЕЙ ЧАСОВ
          </h2>
          <div className="flex justify-center mb-8">
            <div style={{ width: 35, height: 3, backgroundColor: "#CAC8C6" }} />
          </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
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

      {/* Секция с украшениями */}
      <section className="py-16" style={{ backgroundColor: "#FCFAF8" }}>
        <div className="container mx-auto px-4">
          <h2 
            className="mb-4 text-center"
            style={{
              fontFamily: 'Geist, "Geist Fallback", -apple-system, "system-ui", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              fontSize: "20px",
              fontWeight: 400,
              lineHeight: "28px",
              color: "rgb(23, 23, 23)",
            }}
          >УКРАШЕНИЯ</h2>
          <div className="flex justify-center mb-6">
            <div style={{ width: 35, height: 3, backgroundColor: "#CAC8C6" }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {products
              .filter((p) => p.collection === "Украшения")
              .slice(0, 4)
              .map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}

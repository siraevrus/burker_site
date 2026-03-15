"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard/ProductCard";
import PromoBannerGallery from "@/components/PromoBanner/PromoBanner";
import { Product } from "@/lib/types";
import { motion } from "framer-motion";
import { generateProductPath } from "@/lib/utils";

interface HomeClientProps {
  products: Product[];
  bestsellers: Product[];
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface FaqData {
  title: string;
  items: FaqItem[];
}

const SCROLL_STEP = 280; // ширина карточки (w-64 = 256px) + gap

const BRANDS = ["Macy", "Olivia", "Julia", "Isabell", "Ruby"];

function getRandomBrand() {
  return BRANDS[Math.floor(Math.random() * BRANDS.length)];
}

export default function HomeClient({ products, bestsellers }: HomeClientProps) {
  const [activeBrand, setActiveBrand] = useState(() => getRandomBrand());
  const bestsellersRef = useRef<HTMLDivElement>(null);
  const [faq, setFaq] = useState<FaqData | null>(null);
  const [faqOpenId, setFaqOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/faq")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: FaqData | null) => data && setFaq(data))
      .catch(() => {});
  }, []);

  const scrollBestsellers = (direction: "left" | "right") => {
    if (!bestsellersRef.current) return;
    const delta = direction === "left" ? -SCROLL_STEP : SCROLL_STEP;
    bestsellersRef.current.scrollBy({ left: delta, behavior: "smooth" });
  };

  const brands = BRANDS;

  return (
    <div>
      {/* Единственный h1 страницы — для SEO */}
      <h1 className="sr-only">Женские часы и украшения Burker | Официальный магазин Mira Brands</h1>
      {/* Promo Banner Gallery */}
      <PromoBannerGallery />

      {/* Бестселлеры */}
      <section className="py-16">
        <div className="container mx-auto px-4 relative">
          <h2 className="text-xl mb-4 text-center uppercase">Бестселлеры</h2>
          <div className="flex justify-center mb-8">
            <div style={{ width: 35, height: 3, backgroundColor: "#CAC8C6" }} />
          </div>
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => scrollBestsellers("left")}
              className="absolute left-0 z-10 flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-md hover:bg-gray-50 hover:border-gray-300 transition-colors"
              aria-label="Прокрутить влево"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div
              ref={bestsellersRef}
              className="overflow-x-auto pb-4 scrollbar-hide mx-12"
            >
              <div className="flex gap-6">
                {bestsellers.map((product, index) => {
                  const productPath = generateProductPath(product);
                  return (
                    <Link
                      key={product.id}
                      href={productPath ?? "#"}
                      className="flex-shrink-0 w-64 block"
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.3 }}
                      >
                        <ProductCard product={product} disableInternalLink />
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => scrollBestsellers("right")}
              className="absolute right-0 z-10 flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-md hover:bg-gray-50 hover:border-gray-300 transition-colors"
              aria-label="Прокрутить вправо"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Познакомьтесь с коллекцией часов */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-xl mb-4 text-center uppercase">
            ПОЗНАКОМЬТЕСЬ С КОЛЛЕКЦИЕЙ ЧАСОВ БУРКЕР
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

      {/* Вопрос-Ответ */}
      {(faq?.items?.length ?? 0) > 0 && (
        <section className="py-16" style={{ backgroundColor: "#FCFAF8" }}>
          <div className="container mx-auto px-4">
            {faq?.title && (
              <h2
                className="mb-4 text-center uppercase"
                style={{
                  fontFamily: 'Geist, "Geist Fallback", -apple-system, "system-ui", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  fontSize: "20px",
                  fontWeight: 400,
                  lineHeight: "28px",
                  color: "rgb(23, 23, 23)",
                }}
              >
                {faq.title}
              </h2>
            )}
            {faq?.title && (
              <div className="flex justify-center mb-6">
                <div style={{ width: 35, height: 3, backgroundColor: "#CAC8C6" }} />
              </div>
            )}
            {faq?.items && faq.items.length > 0 && (
              <div className="max-w-4xl mx-auto divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden bg-white">
                {faq.items.map((item) => {
                  const isOpen = faqOpenId === item.id;
                  return (
                    <div key={item.id}>
                      <button
                        type="button"
                        onClick={() => setFaqOpenId(isOpen ? null : item.id)}
                        className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-gray-50 transition-colors"
                        style={{
                          fontFamily: 'Geist, "Geist Fallback", -apple-system, "system-ui", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                          fontSize: "15px",
                          fontWeight: 500,
                          color: "rgb(23, 23, 23)",
                        }}
                      >
                        {item.question}
                        <svg
                          className={`w-5 h-5 text-gray-500 flex-shrink-0 ml-2 transition-transform ${isOpen ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div
                        className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-96" : "max-h-0"}`}
                      >
                        <div
                          className="px-4 pb-4 pt-0 text-gray-600 whitespace-pre-wrap"
                          style={{
                            fontFamily: 'Geist, "Geist Fallback", -apple-system, "system-ui", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                            fontSize: "14px",
                            lineHeight: "1.6",
                          }}
                        >
                          {item.answer}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

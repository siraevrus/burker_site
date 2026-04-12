"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard/ProductCard";
import PromoBannerGallery from "@/components/PromoBanner/PromoBanner";
import { Product } from "@/lib/types";
import { motion } from "framer-motion";
import { useCatalogMaps } from "@/components/CatalogMapsProvider";
import { generateProductPath } from "@/lib/utils";

interface HomeClientProps {
  products: Product[];
  bestsellers: Product[];
  /** Коллекции для вкладок на главной (из админки CatalogLine.showOnHome) */
  homeBrands: string[];
  /** Заголовок секции бестселлеров (админка → Настройки → Главная страница) */
  bestsellersSectionTitle: string;
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

// Ширина слайда ≈ колонка сетки (container + lg:grid-cols-4 + gap-5) + gap между слайдами
const SCROLL_STEP = 320;

export default function HomeClient({
  products,
  bestsellers,
  homeBrands,
  bestsellersSectionTitle,
}: HomeClientProps) {
  const maps = useCatalogMaps();
  const brands = homeBrands.length > 0 ? homeBrands : ["Macy"];
  /** Детерминированный старт для SSR = гидратация без расхождений; случайный бренд — только после mount. */
  const [activeBrand, setActiveBrand] = useState(brands[0]);
  const bestsellersRef = useRef<HTMLDivElement>(null);
  const [faq, setFaq] = useState<FaqData | null>(null);
  const [faqOpenId, setFaqOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (brands.length === 0) return;
    setActiveBrand(brands[Math.floor(Math.random() * brands.length)]);
  }, [brands]);

  useEffect(() => {
    fetch("/api/faq")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: FaqData | null) => {
        if (data) {
          setFaq(data);
          if (data.items?.[0]?.id) setFaqOpenId(data.items[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const scrollBestsellers = (direction: "left" | "right") => {
    if (!bestsellersRef.current) return;
    const delta = direction === "left" ? -SCROLL_STEP : SCROLL_STEP;
    bestsellersRef.current.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div>
      {/* Единственный h1 страницы — для SEO */}
      <h1 className="sr-only">Женские часы и украшения Буркер | Официальный магазин Мира Брендс</h1>
      {/* Promo Banner Gallery */}
      <PromoBannerGallery />

      {/* Преимущества — под hero */}
      <div
        className="container mx-auto px-4 mt-6 mb-5 md:mt-7 md:mb-8"
        style={{
          fontFamily: 'Geist, "Geist Fallback", -apple-system, sans-serif',
          fontSize: "15px",
          fontWeight: 500,
          color: "#2B2B2B",
        }}
      >
        <div className="flex flex-col md:flex-row md:flex-wrap md:justify-center md:items-center gap-3 md:gap-x-10 md:gap-y-2">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 flex-shrink-0 text-[#333]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Оригинальные модели</span>
          </div>
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 flex-shrink-0 text-[#333]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Проверка перед отправкой</span>
          </div>
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 flex-shrink-0 text-[#333]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Доставка до СДЭК</span>
          </div>
        </div>
      </div>

      {/* Бестселлеры */}
      <section className="pt-5 md:pt-8 pb-12 md:pb-16">
        <div className="container mx-auto px-4 relative">
          <h2 className="text-xl font-semibold mb-2 md:mb-4 text-center uppercase">
            {bestsellersSectionTitle}
          </h2>
          <div className="flex justify-center mb-6 md:mb-8">
            <div className="w-10 h-[3px] md:w-[35px]" style={{ backgroundColor: "#9a9794" }} />
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
              <div className="flex gap-5">
                {bestsellers
                  .filter((p) => generateProductPath(p, maps))
                  .map((product, index) => {
                    const productPath = generateProductPath(product, maps)!;
                    return (
                      <Link
                        key={product.id}
                        href={productPath}
                        className="flex-shrink-0 block w-[min(300px,calc(100vw-8rem))] cursor-pointer hover:opacity-95 transition-opacity"
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1, duration: 0.3 }}
                          className="h-full"
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

      {/* FAQ — Частые вопросы */}
      {(faq?.items?.length ?? 0) > 0 && (
        <section
          className="py-20 md:py-28"
          style={{ backgroundColor: "#F5F0E8" }}
        >
          <div className="container mx-auto px-4 flex flex-col items-center">
            <h2
              className="text-center text-3xl md:text-4xl font-normal text-[#1a1a1a] tracking-tight"
              style={{ fontFamily: 'Geist, "Geist Fallback", -apple-system, sans-serif' }}
            >
              Частые вопросы
            </h2>
            <p
              className="mt-3 text-center text-base md:text-lg text-[#6b6b6b] font-normal max-w-xl"
              style={{
                fontFamily: 'Geist, "Geist Fallback", -apple-system, sans-serif',
                lineHeight: 1.5,
              }}
            >
              Всё, что важно знать о заказе, сроках доставки и стоимости
            </p>
            <div
              className="w-full max-w-[1100px] mt-12 md:mt-16 bg-white rounded-[26px] overflow-hidden"
              style={{
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              {(faq?.items ?? []).map((item, index) => {
                const items = faq?.items ?? [];
                const isOpen = faqOpenId === item.id;
                const nextItem = items[index + 1];
                const nextClosed = nextItem && faqOpenId !== nextItem.id;
                const showDivider = !isOpen && nextClosed;
                return (
                  <div key={item.id}>
                    <button
                      type="button"
                      onClick={() => setFaqOpenId(isOpen ? null : item.id)}
                      className={`w-full flex items-center justify-between text-left transition-colors px-4 md:px-[38px] ${
                        isOpen ? "bg-[#faf8f5]" : "bg-white hover:bg-[#fcfcfb]"
                      }`}
                      style={{
                        paddingTop: "20px",
                        paddingBottom: "20px",
                        fontFamily: 'Geist, "Geist Fallback", -apple-system, sans-serif',
                        fontSize: "17px",
                        fontWeight: isOpen ? 600 : 500,
                        color: isOpen ? "#1a1a1a" : "#333",
                      }}
                    >
                      <span className="pr-4 text-left">{item.question}</span>
                      <svg
                        className={`w-5 h-5 flex-shrink-0 text-[#888] transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-200 ease-out ${
                        isOpen ? "max-h-[500px]" : "max-h-0"
                      }`}
                    >
                      <div
                        className="whitespace-pre-wrap px-4 pt-2 pb-3 md:px-[38px] md:pt-1 md:pb-5"
                        style={{
                          fontFamily: 'Geist, "Geist Fallback", -apple-system, sans-serif',
                          fontSize: "15px",
                          fontWeight: 400,
                          lineHeight: 1.65,
                          color: "#5c5c5c",
                        }}
                      >
                        {item.answer}
                      </div>
                    </div>
                    {showDivider && (
                      <div
                        className="mx-4 md:mx-[38px] h-px"
                        style={{ backgroundColor: "rgba(0,0,0,0.05)" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

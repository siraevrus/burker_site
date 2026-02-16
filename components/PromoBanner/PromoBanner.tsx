"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { PromoBanner } from "@/lib/types";

export default function PromoBannerGallery() {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    // Загружаем баннеры через API
    const loadBanners = async () => {
      try {
        const response = await fetch("/api/promo-banners");
        if (response.ok) {
          const data = await response.json();
          setBanners(data.banners || []);
        }
      } catch (error) {
        console.error("Error loading promo banners:", error);
      }
    };
    loadBanners();
    
    // Проверяем изменения каждые 5 секунд
    const interval = setInterval(() => {
      loadBanners();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (banners.length === 0 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length, isPaused]);

  if (banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 10000); // Возобновляем автопрокрутку через 10 секунд
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 10000);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 10000);
  };

  return (
    <section
      className="relative h-[500px] overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="relative w-full h-full"
        >
          <Link href={currentBanner.productLink || "#"}>
            <div className="relative w-full h-full bg-gradient-to-r from-pink-100 to-red-100 flex items-center justify-center">
              {currentBanner.image.startsWith("data:image") ? (
                <img
                  src={currentBanner.image}
                  alt={currentBanner.title || "Promo banner"}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : currentBanner.image.startsWith('/promo/') ? (
                // Для локальных файлов используем обычный img, чтобы избежать проблем с оптимизацией
                <img
                  src={currentBanner.image}
                  alt={currentBanner.title || "Promo banner"}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <Image
                  src={currentBanner.image}
                  alt={currentBanner.title || "Promo banner"}
                  fill
                  className="object-cover"
                  priority={currentIndex === 0}
                />
              )}
              {(currentBanner.title || currentBanner.subtitle) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black bg-opacity-20">
                  {currentBanner.title && (
                    <h1 className="text-5xl md:text-6xl font-bold mb-4 text-white">
                      {currentBanner.title}
                    </h1>
                  )}
                  {currentBanner.subtitle && (
                    <p className="text-xl text-white">{currentBanner.subtitle}</p>
                  )}
                </div>
              )}
            </div>
          </Link>
        </motion.div>
      </AnimatePresence>

      {/* Стрелки навигации */}
      {banners.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full transition-all z-20"
            aria-label="Предыдущий"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full transition-all z-20"
            aria-label="Следующий"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </>
      )}

      {/* Индикаторы */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "w-8 bg-white"
                  : "w-2 bg-white bg-opacity-50 hover:bg-opacity-75"
              }`}
              aria-label={`Перейти к слайду ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

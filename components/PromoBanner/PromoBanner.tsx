"use client";

import { useState, useEffect } from "react";
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
  const desktopImage = currentBanner.image;
  const mobileImage = currentBanner.imageMobile || currentBanner.image;

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

  const desktopImgClass = "w-full h-[520px] object-cover object-center block";
  const mobileImgClass = "w-full h-[280px] object-cover object-center block";
  const renderDesktopImg = () => {
    if (desktopImage.startsWith("data:image")) {
      return <img src={desktopImage} alt={currentBanner.title || "Promo banner"} className={desktopImgClass} />;
    }
    if (desktopImage.startsWith("/api/promo-images/") || desktopImage.startsWith("/api/products/") || desktopImage.startsWith("/promo/") || desktopImage.startsWith("/products/") || desktopImage.startsWith("http")) {
      return <img src={desktopImage} alt={currentBanner.title || "Promo banner"} className={desktopImgClass} />;
    }
    return <img src={desktopImage} alt={currentBanner.title || "Promo banner"} className={desktopImgClass} onError={(e) => { e.currentTarget.src = "/api/promo-images/placeholder"; }} />;
  };
  const renderMobileImg = () => {
    if (mobileImage.startsWith("data:image")) {
      return <img src={mobileImage} alt={currentBanner.title || "Promo banner"} className={mobileImgClass} />;
    }
    if (mobileImage.startsWith("/api/promo-images/") || mobileImage.startsWith("/api/products/") || mobileImage.startsWith("/promo/") || mobileImage.startsWith("/products/") || mobileImage.startsWith("http")) {
      return <img src={mobileImage} alt={currentBanner.title || "Promo banner"} className={mobileImgClass} />;
    }
    return <img src={mobileImage} alt={currentBanner.title || "Promo banner"} className={mobileImgClass} onError={(e) => { e.currentTarget.src = "/api/promo-images/placeholder"; }} />;
  };

  return (
    <section
      className="relative overflow-hidden bg-[#FCFAF8] h-[280px] md:h-[520px]"
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
          className="relative w-full"
        >
          {currentBanner.productLink ? (
            <Link href={currentBanner.productLink} className="block relative">
              <div className="hidden md:block w-full">{renderDesktopImg()}</div>
              <div className="md:hidden w-full">{renderMobileImg()}</div>
              {(currentBanner.title || currentBanner.subtitle) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black bg-opacity-20">
                  {currentBanner.title && (
                    <h2 className="text-5xl md:text-6xl font-bold mb-4 text-white">
                      {currentBanner.title}
                    </h2>
                  )}
                  {currentBanner.subtitle && (
                    <p className="text-xl text-white">{currentBanner.subtitle}</p>
                  )}
                </div>
              )}
            </Link>
          ) : (
            <div className="relative w-full">
              <div className="hidden md:block w-full">{renderDesktopImg()}</div>
              <div className="md:hidden w-full">{renderMobileImg()}</div>
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
          )}
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

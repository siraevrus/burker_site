"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Product } from "@/lib/types";
import { useStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import ProductCard from "@/components/ProductCard/ProductCard";

interface ProductPageClientProps {
  product: Product;
  allProducts: Product[];
}

export default function ProductPageClient({
  product,
  allProducts,
}: ProductPageClientProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState<{
    description: boolean;
    specifications: boolean;
    shipping: boolean;
  }>({
    description: false,
    specifications: false,
    shipping: false,
  });

  const addToCart = useStore((state) => state.addToCart);

  // Используем реальные изображения из product.images
  // Если изображений меньше 9, заполняем оставшиеся последним изображением или заглушкой
  const getProductImages = () => {
    const images = product.images && product.images.length > 0 ? product.images : ["/Isabell_gold_burgundy_1.webp"];
    const fallbackImage = images[images.length - 1];
    
    // Создаем массив из 9 изображений
    const result = [];
    for (let i = 0; i < 9; i++) {
      result.push({
        id: i,
        src: images[i] || fallbackImage,
        alt: `${product.name} - изображение ${i + 1}`,
      });
    }
    return result;
  };
  
  const productImages = getProductImages();

  // Варианты цветов для этого товара
  const colorVariants = allProducts.filter(
    (p) =>
      p.name.split(" ")[0] === product.name.split(" ")[0] &&
      p.id !== product.id
  );

  // Сопутствующие товары
  const relatedProducts = allProducts
    .filter((p) => product.relatedProducts?.includes(p.id))
    .slice(0, 2);

  // Рекомендуемые товары (Вам также может понравиться)
  const recommendedProducts = allProducts
    .filter((p) => p.id !== product.id && p.collection !== "Украшения")
    .slice(0, 4);

  const handleAddToCart = () => {
    addToCart({
      ...product,
      quantity: 1,
      selectedColor: selectedColor || product.colors[0] || "золото",
    });
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const discountPercentage = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1.86fr_1fr] gap-8 lg:gap-12">
        {/* Левая часть - Галерея изображений */}
        <div>
          {/* Сетка фотографий */}
          <div className="grid grid-cols-3 gap-2">
            {productImages.map((img, index) => (
              <button
                key={img.id}
                onClick={() => setFullscreenImage(index)}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-zoom-in ${
                  selectedImageIndex === index
                    ? "border-black"
                    : "border-transparent hover:border-gray-300"
                }`}
                style={{ cursor: "zoom-in" }}
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Полноэкранный просмотр */}
        <AnimatePresence>
          {fullscreenImage !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ backgroundColor: "#FCFAF8", cursor: "zoom-out" }}
              onClick={() => setFullscreenImage(null)}
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                className="relative w-full h-full max-w-7xl max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <Image
                  src={productImages[fullscreenImage].src}
                  alt={productImages[fullscreenImage].alt}
                  fill
                  className="object-contain"
                />
                <button
                  onClick={() => setFullscreenImage(null)}
                  className="absolute top-4 right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 transition-all"
                  aria-label="Закрыть"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                {fullscreenImage > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFullscreenImage(fullscreenImage - 1);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 transition-all"
                    aria-label="Предыдущее"
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
                )}
                {fullscreenImage < productImages.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFullscreenImage(fullscreenImage + 1);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 transition-all"
                    aria-label="Следующее"
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
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Правая часть - Информация о товаре */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <h1
            className="mb-2 product-title"
            style={{
              fontFamily: '"Open Sans", sans-serif',
              fontSize: "39.19px",
              fontWeight: 400,
              lineHeight: "39.19px",
              color: "rgb(0, 0, 0)",
            }}
          >
            {product.name}
          </h1>

          {/* Цена */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl font-bold" style={{ color: "#A13D42" }}>
              €{product.price.toFixed(2)}
            </span>
            {product.originalPrice > product.price && (
              <>
                <span className="text-lg text-gray-500 line-through">
                  €{product.originalPrice.toFixed(2)}
                </span>
                {discountPercentage > 0 && (
                  <span className="text-sm text-red-600 font-semibold">
                    -{discountPercentage}%
                  </span>
                )}
              </>
            )}
          </div>

          {/* Варианты цветов */}
          {colorVariants.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3">
                КУПИТЬ В ДРУГИХ ЦВЕТАХ
              </h3>
              <div className="flex gap-2 flex-wrap">
                <Link
                  href={`/product/${product.bodyId || product.id}`}
                  className="relative w-16 h-16 rounded-full border-2 border-black overflow-hidden"
                >
                  <Image
                    src={product.images && product.images.length > 0 ? product.images[0] : "/Isabell_gold_burgundy_1.webp"}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                </Link>
                {colorVariants.map((variant) => (
                  <Link
                    key={variant.id}
                    href={`/product/${variant.bodyId || variant.id}`}
                    className="relative w-16 h-16 rounded-full border-2 border-gray-300 overflow-hidden hover:border-black transition-colors"
                  >
                    <Image
                      src={variant.images && variant.images.length > 0 ? variant.images[0] : "/Isabell_gold_burgundy_1.webp"}
                      alt={variant.name}
                      fill
                      className="object-cover"
                    />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Кнопка добавления в корзину */}
          <button
            onClick={handleAddToCart}
            className="w-full bg-black text-white py-4 rounded-md hover:bg-gray-800 transition-colors font-semibold mb-6"
          >
            ДОБАВИТЬ В КОРЗИНУ
          </button>

          {/* Информация о возврате и гарантии */}
          <div className="space-y-3 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>СРОК ВОЗВРАТА 14 ДНЕЙ</span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span>1 ГОД ГАРАНТИИ НА ВСЕ ПРОДУКТЫ</span>
            </div>
          </div>

          {/* Сопутствующие товары */}
          {relatedProducts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-4">КУПИТЬ С</h3>
              <div className="space-y-3">
                {relatedProducts.map((related) => (
                  <div
                    key={related.id}
                    className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={related.images && related.images.length > 0 ? related.images[0] : "/Isabell_gold_burgundy_1.webp"}
                        alt={related.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{related.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: "#A13D42" }}>
                          €{related.price.toFixed(2)}
                        </span>
                        {related.originalPrice > related.price && (
                          <span className="text-xs text-gray-500 line-through">
                            €{related.originalPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        addToCart({
                          ...related,
                          quantity: 1,
                          selectedColor: related.colors[0] || "золото",
                        })
                      }
                      className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                      aria-label="Добавить в корзину"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Раскрывающиеся секции */}
          <div className="space-y-2">
            {/* Описание */}
            <div className="border-b border-gray-200">
              <button
                onClick={() => toggleSection("description")}
                className="w-full flex items-center justify-between py-4 text-left"
              >
                <span className="font-semibold">ОПИСАНИЕ</span>
                <svg
                  className={`w-5 h-5 transition-transform ${
                    expandedSections.description ? "rotate-90" : ""
                  }`}
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
              {expandedSections.description && (
                <div className="pb-4 text-sm text-gray-600">
                  {product.description ||
                    "Элегантные женские часы с премиальным дизайном. Идеально подходят для повседневной носки и особых случаев."}
                </div>
              )}
            </div>

            {/* Технические характеристики */}
            <div className="border-b border-gray-200">
              <button
                onClick={() => toggleSection("specifications")}
                className="w-full flex items-center justify-between py-4 text-left"
              >
                <span className="font-semibold">ТЕХНИЧЕСКИЕ ХАРАКТЕРИСТИКИ</span>
                <svg
                  className={`w-5 h-5 transition-transform ${
                    expandedSections.specifications ? "rotate-90" : ""
                  }`}
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
              {expandedSections.specifications && (
                <div className="pb-4 text-sm text-gray-600 space-y-2">
                  <p>
                    <strong>Размеры:</strong>{" "}
                    {product.specifications?.dimensions || "29 мм x 10 мм"}
                  </p>
                  <p>
                    <strong>Материал:</strong>{" "}
                    {product.specifications?.material || "Нержавеющая сталь"}
                  </p>
                  <p>
                    <strong>Водонепроницаемость:</strong>{" "}
                    {product.specifications?.waterResistant || "30 м"}
                  </p>
                  <p>
                    <strong>Гарантия:</strong>{" "}
                    {product.specifications?.warranty || "1 год"}
                  </p>
                </div>
              )}
            </div>

            {/* Доставка и возврат */}
            <div className="border-b border-gray-200">
              <button
                onClick={() => toggleSection("shipping")}
                className="w-full flex items-center justify-between py-4 text-left"
              >
                <span className="font-semibold">ДОСТАВКА И ВОЗВРАТ</span>
                <svg
                  className={`w-5 h-5 transition-transform ${
                    expandedSections.shipping ? "rotate-90" : ""
                  }`}
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
              {expandedSections.shipping && (
                <div className="pb-4 text-sm text-gray-600 space-y-2">
                  <p>Срок доставки: 3-7 рабочих дней</p>
                  <p>Возврат в течение 14 дней с момента получения</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Вам также может понравиться */}
      <section className="mt-16 py-8">
        <div className="container mx-auto px-4">
          <h2 className="text-xl mb-8 text-center uppercase">
            Вам также может понравиться
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendedProducts.map((recommendedProduct, index) => (
              <motion.div
                key={recommendedProduct.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
              >
                <ProductCard product={recommendedProduct} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

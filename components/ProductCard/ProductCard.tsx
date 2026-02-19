"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Product } from "@/lib/types";
import { useStore, getCustomsCategory } from "@/lib/store";
import { motion } from "framer-motion";
import Image from "next/image";

const CUSTOMS_HINT =
  "По таможенным правилам доставка одного типа товара не более 3 вещей в один заказ";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const addToCart = useStore((state) => state.addToCart);
  const getTotalQuantityByCategory = useStore((state) => state.getTotalQuantityByCategory);
  const [showCustomsHint, setShowCustomsHint] = useState(false);

  useEffect(() => {
    if (!showCustomsHint) return;
    const t = setTimeout(() => setShowCustomsHint(false), 4000);
    return () => clearTimeout(t);
  }, [showCustomsHint]);

  const handleAddToCart = () => {
    if (product.soldOut) {
      return; // Товар распродан, не добавляем в корзину
    }
    const category = getCustomsCategory(product);
    if (getTotalQuantityByCategory(category) >= 3) {
      setShowCustomsHint(true);
      return;
    }
    addToCart({
      ...product,
      quantity: 1,
      selectedColor: product.colors[0] || "золото",
    });
  };

  const discountPercentage = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );

  return (
    <motion.div
      className="group relative rounded-lg overflow-hidden transition-all duration-300 w-[90%] mx-auto"
      whileHover={{ y: -6, scale: 1.02 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Discount badge */}
      {discountPercentage > 0 && (
        <motion.div
          className="absolute top-3 right-3 text-white text-xs font-bold px-3 py-1.5 z-10"
          style={{ backgroundColor: "#A13D42" }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          -{discountPercentage}%
        </motion.div>
      )}

      {/* Product Image */}
      <div className="relative w-full aspect-square overflow-hidden">
        <Link href={`/product/${product.bodyId || product.id}`}>
          <Image
            src={product.images && product.images.length > 0 ? product.images[0] : "/Isabell_gold_burgundy_1.webp"}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </Link>
        {/* Cart icon button - bottom right */}
        <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1">
          {showCustomsHint && (
            <p className="text-amber-700 text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1.5 shadow max-w-[220px] text-right z-10">
              {CUSTOMS_HINT}
            </p>
          )}
          {product.soldOut ? (
            <button
              disabled
              className="bg-gray-400 text-white p-2 cursor-not-allowed opacity-60"
              style={{ borderRadius: "0" }}
              aria-label="Товар распродан"
            >
              <span className="text-xs font-medium">Товар распродан</span>
            </button>
          ) : (
            <motion.button
              onClick={handleAddToCart}
              className="bg-black text-white p-2 hover:bg-gray-800 transition-colors duration-300"
              style={{ borderRadius: "0" }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
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
            </motion.button>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        <Link href={`/product/${product.bodyId || product.id}`}>
          <h3 className="font-semibold text-sm mb-2 text-gray-900 line-clamp-2 text-center hover:text-gray-600 transition-colors">
            {product.name}
          </h3>
        </Link>
        
        {/* Price */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <span
            style={{
              fontFamily: '"Open Sans", sans-serif',
              fontSize: "11.5px",
              fontWeight: 600,
              lineHeight: "18px",
              color: "rgb(162, 60, 66)",
            }}
          >
            {product.price.toFixed(0)} ₽
          </span>
          {product.originalPrice > product.price && (
            <span className="text-xs text-gray-500 line-through">
              {product.originalPrice.toFixed(0)} ₽
            </span>
          )}
        </div>

      </div>
    </motion.div>
  );
}

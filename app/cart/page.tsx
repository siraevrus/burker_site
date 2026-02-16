"use client";

import { useStore } from "@/lib/store";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

export default function CartPage() {
  const cart = useStore((state) => state.cart);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const updateQuantity = useStore((state) => state.updateQuantity);
  const getTotalPrice = useStore((state) => state.getTotalPrice);

  const totalPrice = getTotalPrice();
  const freeShippingThreshold = 39;

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Ваша корзина пуста</h1>
          <p className="text-gray-600 mb-8">Продолжить просмотр</p>
          <Link
            href="/"
            className="inline-block bg-black text-white px-8 py-3 rounded-md hover:bg-gray-800 transition-colors"
          >
            Вернуться к покупкам
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Корзина</h1>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {cart.map((item) => (
              <motion.div
                key={`${item.id}-${item.selectedColor}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row gap-4"
              >
                {/* Product Image */}
                <div className="w-full sm:w-24 h-24 bg-gray-200 rounded-md flex-shrink-0 relative overflow-hidden">
                  <Image
                    src={item.images && item.images.length > 0 ? item.images[0] : "/Isabell_gold_burgundy_1.webp"}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>

                {/* Product Info */}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">{item.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Цвет: {item.selectedColor}
                  </p>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg font-bold">€{item.price.toFixed(2)}</span>
                    {item.originalPrice > item.price && (
                      <span className="text-sm text-gray-500 line-through">
                        €{item.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border border-gray-300 rounded-md">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-3 py-1 hover:bg-gray-100"
                      >
                        -
                      </button>
                      <span className="px-4 py-1">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-3 py-1 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Удалить
                    </button>
                  </div>
                </div>

                {/* Subtotal */}
                <div className="text-right">
                  <p className="font-semibold text-lg">
                    €{(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 rounded-lg p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-4">Итого</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Товары</span>
                <span>€{totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Доставка</span>
                <span>
                  {totalPrice >= freeShippingThreshold ? (
                    <span className="text-green-600">Бесплатно</span>
                  ) : (
                    <span>€5.00</span>
                  )}
                </span>
              </div>
            </div>
            <div className="border-t border-gray-300 pt-4 mb-4">
              <div className="flex justify-between text-xl font-bold">
                <span>Всего</span>
                <span>
                  €
                  {(
                    totalPrice + (totalPrice >= freeShippingThreshold ? 0 : 5)
                  ).toFixed(2)}
                </span>
              </div>
            </div>
            <Link
              href="/checkout"
              className="block w-full bg-black text-white py-3 rounded-md hover:bg-gray-800 transition-colors font-semibold text-center"
            >
              Оформить заказ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useStore, getCustomsCategory } from "@/lib/store";
import { calculateShipping } from "@/lib/shipping";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

const CUSTOMS_HINT =
  "По таможенным правилам доставка одного типа товара не более 3 вещей в один заказ";

export default function CartPage() {
  const cart = useStore((state) => state.cart);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const updateQuantity = useStore((state) => state.updateQuantity);
  const getTotalPrice = useStore((state) => state.getTotalPrice);
  const getTotalQuantityByCategory = useStore((state) => state.getTotalQuantityByCategory);
  const [customsHintKey, setCustomsHintKey] = useState<string | null>(null);

  useEffect(() => {
    if (!customsHintKey) return;
    const t = setTimeout(() => setCustomsHintKey(null), 4000);
    return () => clearTimeout(t);
  }, [customsHintKey]);

  const totalPrice = getTotalPrice();
  const { totalWeight, totalCost: shippingCost } = calculateShipping(cart);

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
                <Link 
                  href={`/product/${item.bodyId || item.id}`}
                  className="w-[150px] h-[150px] bg-white border border-[#e5e6eb] rounded-md flex-shrink-0 relative overflow-hidden hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Image
                    src={item.images && item.images.length > 0 ? item.images[0] : "/Isabell_gold_burgundy_1.webp"}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="150px"
                  />
                </Link>

                {/* Product Info */}
                <div className="flex-1">
                  <Link 
                    href={`/product/${item.bodyId || item.id}`}
                    className="font-semibold text-lg mb-2 hover:text-gray-600 transition-colors block"
                  >
                    {item.name}
                  </Link>
                  <p className="text-sm text-gray-600 mb-2">
                    Цвет: {item.selectedColor}
                  </p>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg font-bold">{item.price.toFixed(0)} ₽</span>
                    {item.originalPrice > item.price && (
                      <span className="text-sm text-gray-500 line-through">
                        {item.originalPrice.toFixed(0)} ₽
                      </span>
                    )}
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center border border-gray-300 rounded-md">
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1, item.selectedColor)
                          }
                          className="px-3 py-1 hover:bg-gray-100"
                        >
                          -
                        </button>
                        <span className="px-4 py-1">{item.quantity}</span>
                        <button
                          onClick={() => {
                            const category = getCustomsCategory(item);
                            if (getTotalQuantityByCategory(category) >= 3) {
                              setCustomsHintKey(`${item.id}-${item.selectedColor}`);
                              return;
                            }
                            updateQuantity(item.id, item.quantity + 1, item.selectedColor);
                          }}
                          className="px-3 py-1 hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id, item.selectedColor)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Удалить
                      </button>
                    </div>
                    {customsHintKey === `${item.id}-${item.selectedColor}` && (
                      <p className="text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                        {CUSTOMS_HINT}
                      </p>
                    )}
                  </div>
                </div>

                {/* Subtotal */}
                <div className="text-right">
                  <p className="font-semibold text-lg">
                    Итого: {(item.price * item.quantity).toFixed(0)} ₽
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg p-6 sticky top-24 border border-[#e5e6ea]">
            <h2 className="text-xl font-bold mb-4">Итого</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Товары</span>
                <span>{totalPrice.toFixed(0)} ₽</span>
              </div>
              <div className="flex justify-between">
                <span>Доставка до РФ</span>
                <span>
                  {totalWeight.toFixed(1)} кг / {shippingCost.toFixed(0)} ₽
                </span>
              </div>
            </div>
            <div className="border-t border-gray-300 pt-4 mb-4">
              <div className="flex justify-between text-xl font-bold">
                <span>Всего</span>
                <span>
                  {(totalPrice + shippingCost).toFixed(0)} ₽
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

      {/* Information Block */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="max-w-4xl mx-auto space-y-3 text-sm text-gray-700">
          <p>
            <strong>Выкуп осуществляется с официального сайта производителя.</strong> Товар поставляется под индивидуальный заказ клиента.
          </p>
          <p>
            В стоимость товара включена комиссия агента за услугу выкупа.
          </p>
          <p>
            Доставка до РФ рассчитывается исходя из фактического веса и тарифа перевозчика.
          </p>
          <p>
            Средний срок доставки — около 30 дней с момента выкупа.
          </p>
          <p className="pt-2 border-t border-blue-200">
            <strong>Оплачивая заказ, вы подтверждаете согласие с условиями сервиса.</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useStore, getCustomsCategory } from "@/lib/store";
import { calculateShipping, type ShippingRateEntry } from "@/lib/shipping";
import { CartItem } from "@/lib/types";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { generateProductSlug } from "@/lib/utils";

const CUSTOMS_HINT =
  "По таможенным правилам доставка одного типа товара не более 3 вещей в один заказ";

interface ExchangeRates {
  eurRate: number;
  rubRate: number;
}

function getItemCommission(item: CartItem, rates: ExchangeRates | null): number | null {
  console.log('=== Commission Debug ===');
  console.log('item.name:', item.name);
  console.log('originalPriceEur:', item.originalPriceEur);
  console.log('item.price:', item.price);
  console.log('rates:', rates);
  
  if (!rates || item.originalPriceEur == null || item.originalPriceEur <= 0) {
    console.log('Early return: missing data - rates:', !!rates, 'originalPriceEur:', item.originalPriceEur);
    return null;
  }
  
  const originalPriceInRub = item.originalPriceEur / rates.eurRate * rates.rubRate;
  const commission = (item.price - originalPriceInRub) * item.quantity;
  
  console.log('originalPriceInRub:', originalPriceInRub);
  console.log('raw commission:', commission);
  console.log('final commission:', Math.max(0, commission));
  console.log('=== End Debug ===');
  
  return Math.max(0, commission);
}

export default function CartPage() {
  const cart = useStore((state) => state.cart);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const updateQuantity = useStore((state) => state.updateQuantity);
  const getTotalPrice = useStore((state) => state.getTotalPrice);
  const getTotalQuantityByCategory = useStore((state) => state.getTotalQuantityByCategory);
  const [customsHintKey, setCustomsHintKey] = useState<string | null>(null);
  const [shippingRates, setShippingRates] = useState<ShippingRateEntry[]>([]);
  const [rates, setRates] = useState<ExchangeRates | null>(null);

  useEffect(() => {
    if (!customsHintKey) return;
    const t = setTimeout(() => setCustomsHintKey(null), 4000);
    return () => clearTimeout(t);
  }, [customsHintKey]);

  useEffect(() => {
    Promise.all([
      fetch("/api/shipping/rates").then((r) => r.json()),
      fetch("/api/exchange-rates").then((r) => r.json()),
    ])
      .then(([shippingData, ratesData]) => {
        if (Array.isArray(shippingData.rates) && shippingData.rates.length > 0) {
          setShippingRates(shippingData.rates);
        }
        if (ratesData.eurRate && ratesData.rubRate) {
          setRates({ eurRate: ratesData.eurRate, rubRate: ratesData.rubRate });
        }
      })
      .catch(() => {});
  }, []);

  const totalPrice = getTotalPrice();
  const { totalWeight, totalCost: shippingCost } = calculateShipping(
    cart,
    shippingRates.length > 0 ? shippingRates : undefined
  );

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
                  href={`/product/${generateProductSlug(item.name)}`}
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
                    href={`/product/${generateProductSlug(item.name)}`}
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
                        className="p-1.5 text-gray-500 hover:text-red-600 transition-colors rounded hover:bg-gray-100"
                        aria-label="Удалить из корзины"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
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
                  <p className="font-semibold text-lg mb-1">
                    Итого: {(item.price * item.quantity).toFixed(0)} ₽
                  </p>
                  {getItemCommission(item, rates) !== null && (
                    <p className="text-xs text-gray-400">
                      В том числе вознаграждение комиссионера: {getItemCommission(item, rates)?.toFixed(0)} ₽
                    </p>
                  )}
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

            {/* Information Block */}
            <div className="mt-6 bg-white border border-gray-300 rounded-lg p-4">
              <div className="space-y-3 text-sm text-gray-700">
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
                <p className="pt-2 border-t border-gray-200">
                  <strong>Оплачивая заказ, вы подтверждаете согласие с условиями сервиса.</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

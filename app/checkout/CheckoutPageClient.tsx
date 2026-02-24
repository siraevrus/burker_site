"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { CartItem } from "@/lib/types";
import Link from "next/link";
import Image from "next/image";
import CheckoutForm from "@/components/Checkout/CheckoutForm";
import OrderSummaryBlock from "@/components/Checkout/OrderSummaryBlock";

interface CheckoutPageClientProps {
  user?: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  } | null;
}

function getItemCommission(item: CartItem): number | null {
  if (!item.originalPrice || item.originalPrice <= 0) return null;
  return Math.max(0, (item.price - item.originalPrice) * item.quantity);
}

export default function CheckoutPageClient({ user }: CheckoutPageClientProps) {
  const cart = useStore((state) => state.cart);
  const [formData, setFormData] = useState<{
    totalPrice: number;
    totalWeight: number;
    shippingCost: number;
    promoCode: string;
    promoCodeError: string;
    appliedPromoCode: { code: string; discount: number } | null;
    checkingPromoCode: boolean;
    requiresConfirmation: boolean;
    loading: boolean;
    onSubmit: () => void;
    setPromoCode: (value: string) => void;
    onCheckPromoCode: () => void;
    onCancelPromoCode: () => void;
    setRequiresConfirmation: (value: boolean) => void;
  } | null>(null);

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Ваша корзина пуста</h1>
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
      <Link
        href="/cart"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <span>Вернуться в корзину</span>
      </Link>
      <h1 className="text-3xl font-bold mb-8">Оформление заказа</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Форма заказа */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {!user && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800 mb-2">
                  У вас есть аккаунт?
                </p>
                <Link
                  href={`/login?redirect=/checkout`}
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  Войти для быстрого оформления
                </Link>
              </div>
            )}
            <CheckoutForm 
              user={user ? {
                email: user.email,
                firstName: user.firstName ?? undefined,
                lastName: user.lastName ?? undefined,
                phone: user.phone ?? undefined,
              } : undefined}
              onFormDataChange={setFormData}
            />
          </div>
        </div>

        {/* Итоги заказа */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg p-6 sticky top-24 border border-[#e5e6ea]">
            <h2 className="text-xl font-bold mb-4">Ваш заказ</h2>
            <div className="space-y-3 mb-4">
              {cart.map((item) => {
                const itemCommission = getItemCommission(item);
                return (
                  <div key={`${item.id}-${item.selectedColor}`} className="flex gap-3">
                    <div className="w-48 h-48 sm:w-32 sm:h-32 bg-white border border-[#e5e6eb] rounded-md flex-shrink-0 relative overflow-hidden">
                      <Image
                        src={item.images && item.images.length > 0 ? item.images[0] : "/Isabell_gold_burgundy_1.webp"}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="192px"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:justify-between sm:items-start">
                      <div className="min-w-0 flex-1">
                        <p className="text-[16.8px] font-medium truncate">{item.name}</p>
                        <p className="text-[14.4px] text-gray-600">Цвет: {item.selectedColor}</p>
                        <p className="text-[14.4px] text-gray-600">Кол-во: {item.quantity}</p>
                        {itemCommission !== null && (
                          <p className="text-[12px] text-gray-400 mt-1">
                            В том числе вознаграждение комиссионера: {itemCommission.toFixed(0)} ₽
                          </p>
                        )}
                      </div>
                      <p className="text-[16.8px] font-semibold mt-1 sm:mt-0 sm:ml-3 flex-shrink-0">
                        {(item.price * item.quantity).toFixed(0)} ₽
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            {formData && (
              <OrderSummaryBlock
                totalPrice={formData.totalPrice}
                totalWeight={formData.totalWeight}
                shippingCost={formData.shippingCost}
                promoCode={formData.promoCode}
                setPromoCode={formData.setPromoCode}
                promoCodeError={formData.promoCodeError}
                appliedPromoCode={formData.appliedPromoCode}
                checkingPromoCode={formData.checkingPromoCode}
                onCheckPromoCode={formData.onCheckPromoCode}
                onCancelPromoCode={formData.onCancelPromoCode}
                requiresConfirmation={formData.requiresConfirmation}
                setRequiresConfirmation={formData.setRequiresConfirmation}
                loading={formData.loading}
                onSubmit={formData.onSubmit}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

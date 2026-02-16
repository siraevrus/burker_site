"use client";

import { useStore } from "@/lib/store";
import Link from "next/link";
import Image from "next/image";
import CheckoutForm from "@/components/Checkout/CheckoutForm";

interface CheckoutPageClientProps {
  user?: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  } | null;
}

export default function CheckoutPageClient({ user }: CheckoutPageClientProps) {
  const cart = useStore((state) => state.cart);

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
            <CheckoutForm user={user || undefined} />
          </div>
        </div>

        {/* Итоги заказа */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 rounded-lg p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-4">Ваш заказ</h2>
            <div className="space-y-3 mb-4">
              {cart.map((item) => (
                <div key={`${item.id}-${item.selectedColor}`} className="flex gap-3">
                  <div className="w-16 h-16 bg-gray-200 rounded-md flex-shrink-0 relative overflow-hidden">
                    <Image
                      src={item.images && item.images.length > 0 ? item.images[0] : "/Isabell_gold_burgundy_1.webp"}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-gray-600">Цвет: {item.selectedColor}</p>
                    <p className="text-xs text-gray-600">Кол-во: {item.quantity}</p>
                    <p className="text-sm font-semibold mt-1">
                      €{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

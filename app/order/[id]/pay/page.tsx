"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Order } from "@/lib/types";

export default function OrderPayPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = typeof params.id === "string" ? params.id : null;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    fetch(`/api/orders/${orderId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.order) setOrder(data.order);
        else setError(data.error || "Заказ не найден");
        setLoading(false);
      })
      .catch(() => {
        setError("Ошибка загрузки заказа");
        setLoading(false);
      });
  }, [orderId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p>Загрузка...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-xl font-semibold mb-4">{error || "Заказ не найден"}</h1>
          <Link
            href="/"
            className="inline-block bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800"
          >
            На главную
          </Link>
        </div>
      </div>
    );
  }

  const isPaid = order.paymentStatus === "paid";
  const hasPaymentLink = Boolean(order.paymentLink);

  if (isPaid) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Заказ уже оплачен</h1>
          <p className="text-gray-600 mb-6">Номер заказа: #{order.orderNumber || order.id}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/order-confirmation?id=${order.id}`}
              className="inline-block bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800"
            >
              Подтверждение заказа
            </Link>
            <Link
              href="/orders"
              className="inline-block border border-gray-300 px-6 py-3 rounded-md hover:bg-gray-50"
            >
              Мои заказы
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!hasPaymentLink) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-xl font-semibold mb-2">Оплата через СБП — ссылка не сформирована</h1>
          <p className="text-gray-600 mb-6">
            Оплата заказов подключена через СБП (Т-Банк), но ссылка на этот заказ не была создана. Обратитесь в поддержку или попробуйте оформить заказ позже.
          </p>
          <Link
            href={`/order-confirmation?id=${order.id}`}
            className="inline-block bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800"
          >
            Подтверждение заказа
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-2">Оплата заказа (СБП)</h1>
        <p className="text-gray-600 mb-1">Система быстрых платежей — оплата картой любого банка</p>
        <p className="text-gray-600 mb-6">Номер заказа: #{order.orderNumber || order.id}</p>
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-baseline mb-6">
            <span className="text-gray-600">Сумма к оплате:</span>
            <span className="text-2xl font-bold">{order.totalAmount.toFixed(0)} ₽</span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Нажмите кнопку ниже — откроется страница оплаты Т-Банка. Выберите свой банк и завершите платёж через СБП.
          </p>
          <a
            href={order.paymentLink!}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-black text-white py-3 px-6 rounded-md hover:bg-gray-800 font-medium"
          >
            Перейти к оплате (СБП)
          </a>
        </div>
        <div className="text-center">
          <Link href={`/order-confirmation?id=${order.id}`} className="text-gray-500 hover:underline text-sm">
            Вернуться к подтверждению заказа
          </Link>
        </div>
      </div>
    </div>
  );
}

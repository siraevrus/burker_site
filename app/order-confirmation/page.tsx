"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { Order, OrderItem } from "@/lib/types";
import { formatRub } from "@/lib/utils";

interface ExchangeRates {
  eurRate: number;
  rubRate: number;
}

const paymentStatusLabels: Record<string, string> = {
  paid: "Оплачено",
  pending: "Ожидает оплаты",
  expired: "Ссылка истекла",
  cancelled: "Отменена",
  failed: "Ошибка",
};

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");
  const token = searchParams.get("token");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState<ExchangeRates | null>(null);

  const statusLabels: Record<string, string> = {
    accepted: "Заказ принят",
    purchased: "Выкуплен",
    in_transit_de: "В пути на склад",
    in_transit_ru: "В пути в РФ",
    delivered: "Доставлен",
  };

  const fetchOrder = useCallback(() => {
    if (!orderId) return;
    const url = token ? `/api/orders/${orderId}?token=${encodeURIComponent(token)}` : `/api/orders/${orderId}`;
    fetch(url)
      .then((res) => res.json())
      .then((orderData) => {
        if (orderData.order) setOrder(orderData.order);
      })
      .catch(() => {});
  }, [orderId, token]);

  useEffect(() => {
    if (orderId) {
      const orderUrl = token ? `/api/orders/${orderId}?token=${encodeURIComponent(token)}` : `/api/orders/${orderId}`;
      Promise.all([
        fetch(orderUrl).then((res) => res.json()),
        fetch("/api/exchange-rates").then((res) => res.json()),
      ])
        .then(([orderData, ratesData]) => {
          if (orderData.order) {
            setOrder(orderData.order);
          }
          if (ratesData.eurRate && ratesData.rubRate) {
            setRates({
              eurRate: ratesData.eurRate,
              rubRate: ratesData.rubRate,
            });
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [orderId, token]);

  // После редиректа с банка (paid=1 — успех, без paid — неуспех) опрашиваем заказ через 2 с (вебхук может прийти с задержкой)
  useEffect(() => {
    if (!orderId) return;
    const t = setTimeout(fetchOrder, 2000);
    return () => clearTimeout(t);
  }, [orderId, fetchOrder]);

  // Курсы на момент заказа (приоритет) или текущие из API для старых заказов
  const ratesForCommission =
    order?.eurRate != null && order?.rubRate != null
      ? { eurRate: order.eurRate, rubRate: order.rubRate }
      : rates;

  const calculateCommission = () => {
    if (!order) return null;

    let totalCommission = 0;
    let hasCommission = false;

    for (const item of order.items) {
      const itemComm = getItemCommission(item, ratesForCommission);
      if (itemComm !== null) {
        hasCommission = true;
        totalCommission += itemComm;
      }
    }

    return hasCommission ? totalCommission : null;
  };

  function getItemCommission(item: OrderItem, ratesToUse: ExchangeRates | null): number | null {
    if (item.commissionAmount != null) return item.commissionAmount;
    if (!ratesToUse || !item.originalPriceEur) return null;
    const originalPriceInUsd = item.originalPriceEur / ratesToUse.eurRate;
    const originalPriceInRub = originalPriceInUsd * ratesToUse.rubRate;
    return (item.productPrice - originalPriceInRub) * item.quantity;
  }

  const commission = calculateCommission();

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Заказ не найден</h1>
          <Link
            href="/"
            className="inline-block bg-black text-white px-8 py-3 rounded-md hover:bg-gray-800 transition-colors"
          >
            Вернуться на главную
          </Link>
        </div>
      </div>
    );
  }

  const isPaymentCancelled =
    order.paymentStatus === "cancelled" ||
    order.paymentStatus === "expired" ||
    order.paymentStatus === "failed";

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          {isPaymentCancelled ? (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
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
              </div>
              <h1 className="text-3xl font-bold mb-2 text-red-800">Заказ отменён</h1>
              <p className="text-gray-600">
                Номер заказа: <strong>#{order.orderNumber || order.id}</strong>
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold mb-2">
                {order.paymentStatus === "pending" ? "Заказ в ожидании оплаты" : "Заказ успешно оформлен!"}
              </h1>
              <p className="text-gray-600">
                Номер заказа: <strong>#{order.orderNumber || order.id}</strong>
              </p>
            </>
          )}
        </div>

        {order.paymentStatus === "pending" && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-amber-800 mb-1">Ожидает оплаты</p>
            <p className="text-sm text-amber-800 mb-3">
              {order.paymentLink
                ? "Заказ ожидает оплаты. Нажмите кнопку ниже, чтобы перейти к оплате в платёжной форме банка."
                : "Ссылка на оплату пока не была сформирована. Обновите страницу через несколько секунд или свяжитесь с нами, если проблема не исчезает."}
            </p>
            {order.paymentLink ? (
              <Link
                href={token ? `/order/${order.id}/pay?token=${encodeURIComponent(token)}` : `/order/${order.id}/pay`}
                className="inline-block bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 text-sm font-medium"
              >
                Оплатить заказ
              </Link>
            ) : (
              <div className="flex gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-block bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 text-sm font-medium"
                >
                  Обновить страницу
                </button>
                <Link
                  href="/contact"
                  className="inline-block border border-amber-300 text-amber-900 px-6 py-2 rounded-md hover:bg-amber-100 text-sm font-medium"
                >
                  Связаться с нами
                </Link>
              </div>
            )}
          </div>
        )}
        {order.paymentStatus === "paid" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800 font-medium">
              Оплачено
              {order.paidAt && (
                <span className="ml-1">
                  {new Date(order.paidAt).toLocaleString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </p>
          </div>
        )}
        {(order.paymentStatus === "expired" || order.paymentStatus === "cancelled" || order.paymentStatus === "failed") && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-red-800 mb-1">
              {paymentStatusLabels[order.paymentStatus] ?? order.paymentStatus}
            </p>
            <p className="text-sm text-red-700 mb-3">
              {order.paymentStatus === "expired"
                ? "Срок действия ссылки на оплату истёк. Оформите новый заказ или свяжитесь с нами для возобновления."
                : order.paymentStatus === "cancelled"
                  ? "Платёж отменён или отклонён. Вы можете перейти на страницу оплаты и попробовать снова."
                  : "Ошибка при проведении платежа. Попробуйте другую карту или способ оплаты, либо свяжитесь с нами."}
            </p>
            {order.paymentStatus !== "expired" && order.paymentLink && (
              <Link
                href={token ? `/order/${order.id}/pay?token=${encodeURIComponent(token)}` : `/order/${order.id}/pay`}
                className="inline-block bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 text-sm font-medium"
              >
                Попробовать оплатить снова
              </Link>
            )}
            {order.paymentStatus === "expired" && (
              <div className="flex gap-3 flex-wrap">
                <Link
                  href="/"
                  className="inline-block bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 text-sm font-medium"
                >
                  Оформить новый заказ
                </Link>
                <Link
                  href="/contact"
                  className="inline-block border border-red-300 text-red-800 px-6 py-2 rounded-md hover:bg-red-50 text-sm font-medium"
                >
                  Связаться с нами
                </Link>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Детали заказа</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium">{order.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Имя:</span>
              <span className="font-medium">{order.firstName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Фамилия:</span>
              <span className="font-medium">{order.lastName}</span>
            </div>
            {order.middleName && (
              <div className="flex justify-between">
                <span className="text-gray-600">Отчество:</span>
                <span className="font-medium">{order.middleName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Телефон:</span>
              <span className="font-medium">{order.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Пункт выдачи СДЭК (ПВЗ):</span>
              <span className="font-medium text-right">
                {order.cdekAddress}
                {order.cdekPointCode && ` (код ${order.cdekPointCode})`}
              </span>
            </div>
            {order.address && (
              <div className="flex justify-between">
                <span className="text-gray-600">Адрес доставки:</span>
                <span className="font-medium text-right">{order.address}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-2 mt-2">
              <p className="text-sm font-semibold text-gray-700 mb-2">Данные для таможенного оформления:</p>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ИНН:</span>
              <span className="font-medium">{order.inn}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Серия паспорта:</span>
              <span className="font-medium">{order.passportSeries}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Номер паспорта:</span>
              <span className="font-medium">{order.passportNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Дата выдачи паспорта:</span>
              <span className="font-medium">
                {order.passportIssueDate 
                  ? new Date(order.passportIssueDate).toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : order.passportIssueDate}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Кем выдан паспорт:</span>
              <span className="font-medium text-right">{order.passportIssuedBy}</span>
            </div>
            {order.paymentStatus === "paid" && (
              <div className="flex justify-between">
                <span className="text-gray-600">Статус:</span>
                <span className="font-medium">{statusLabels[order.status] || order.status}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Оплата (СБП):</span>
              <span className="font-medium">
                {paymentStatusLabels[order.paymentStatus ?? "pending"] ?? order.paymentStatus ?? "Ожидает оплаты"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Товары</h2>
          {order.eurRate != null && order.rubRate != null && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
              <p className="font-medium text-gray-700 mb-1">Курс на дату заказа</p>
              <p className="text-gray-600">
                EUR/USD: {order.eurRate.toFixed(4)} · RUB/USD: {order.rubRate.toFixed(4)}
              </p>
            </div>
          )}
          <div className="space-y-3">
            {order.items.map((item) => {
              const itemCommission = getItemCommission(item, ratesForCommission);
              return (
                <div key={item.id} className="border-b border-gray-200 pb-3 last:border-b-0">
                  <div className="flex justify-between mb-2">
                    <p className="font-medium">{item.productName}</p>
                    <p className="font-semibold">
                      {formatRub(item.productPrice * item.quantity)} ₽
                    </p>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Цена за шт.:</span>
                      <span>{formatRub(item.productPrice)} ₽</span>
                    </div>
                    {item.selectedColor ? (
                      <p className="text-gray-600">
                        Цвет: {item.selectedColor}
                      </p>
                    ) : null}
                    <p className="text-gray-600">
                      Количество: {item.quantity}
                    </p>
                    {itemCommission !== null && (
                      <div className="flex justify-between items-baseline gap-x-2 text-gray-500">
                        <span className="min-w-0">Комиссия товара:</span>
                        <span className="whitespace-nowrap flex-shrink-0">{formatRub(itemCommission)} ₽</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 bg-white">
            <div className="flex justify-between mb-2">
              <span>Доставка:</span>
              <span>
                {order.shippingCost === 0 ? (
                  <span className="text-green-600">Бесплатно</span>
                ) : (
                  <span>{formatRub(order.shippingCost)} ₽</span>
                )}
              </span>
            </div>
            {order.promoCode && (order.promoDiscount ?? 0) > 0 && (
              <div className="flex justify-between mb-2 text-green-600">
                <span>Промокод {order.promoCode}:</span>
                <span className="font-medium">-{formatRub(order.promoDiscount ?? 0)} ₽</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold mb-1">
              <span>Итого:</span>
              <span>{formatRub(order.totalAmount)} ₽</span>
            </div>
            {commission !== null && (
              <p className="text-xs text-gray-400">
                Итого вознаграждение комиссионера: {formatRub(commission)} ₽
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/"
            className="bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition-colors"
          >
            Вернуться на главную
          </Link>
          <Link
            href="/orders"
            className="border border-gray-300 px-6 py-3 rounded-md hover:bg-gray-50 transition-colors"
          >
            Мои заказы
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-16 text-center">
        <p>Загрузка...</p>
      </div>
    }>
      <OrderConfirmationContent />
    </Suspense>
  );
}

"use client";

import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState, useCallback } from "react";
import { Order } from "@/lib/types";
import { formatRub } from "@/lib/utils";
import {
  getItemCommission,
  getOrderCommissionTotal,
  getRatesForOrder,
  type ExchangeRates,
} from "@/lib/order-commission";
import { appendAccessToken, getOrderApiUrl } from "@/lib/order-access";

const statusLabels: Record<string, string> = {
  accepted: "Заказ принят",
  purchased: "Выкуплен",
  in_transit_de: "В пути на склад",
  in_transit_ru: "В пути в РФ",
  delivered: "Доставлен",
};

const paymentStatusLabels: Record<string, string> = {
  paid: "Оплачено",
  pending: "Ожидает оплаты",
  expired: "Ссылка истекла",
  cancelled: "Отменена",
  failed: "Ошибка",
};

function formatDateTime(d: Date | string | null | undefined): string {
  if (d == null) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(d: Date | string | null | undefined): string {
  if (d == null) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function OrderDashboardContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = typeof params.id === "string" ? params.id : null;
  const accessToken = searchParams.get("token");
  const [order, setOrder] = useState<Order | null>(null);
  const [liveRates, setLiveRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(() => {
    if (!orderId) return;
    fetch(getOrderApiUrl(orderId, accessToken))
      .then((res) => res.json())
      .then((data) => {
        if (data.order) setOrder(data.order);
      })
      .catch(() => {});
  }, [orderId, accessToken]);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    Promise.all([
      fetch(getOrderApiUrl(orderId, accessToken)).then((res) => res.json()),
      fetch("/api/exchange-rates").then((res) => res.json()),
    ])
      .then(([data, ratesData]) => {
        if (data.error) {
          setError(data.error === "Доступ запрещен" ? "Доступ запрещён" : data.error);
        } else if (data.order) {
          setOrder(data.order);
        } else {
          setError("Заказ не найден");
        }
        if (ratesData.eurRate && ratesData.rubRate) {
          setLiveRates({
            eurRate: ratesData.eurRate,
            rubRate: ratesData.rubRate,
          });
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Ошибка загрузки");
        setLoading(false);
      });
  }, [orderId, accessToken]);

  useEffect(() => {
    if (!orderId || !order || order.paymentStatus !== "paid") return;
    const t = setTimeout(fetchOrder, 2000);
    return () => clearTimeout(t);
  }, [orderId, order?.paymentStatus, order?.status, fetchOrder]);

  const ratesForCommission = order ? getRatesForOrder(order, liveRates) : null;
  const commissionTotal = order ? getOrderCommissionTotal(order, liveRates) : null;

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

  if (!isPaid) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Сводка по заказу</h1>
          <p className="text-gray-600 mb-6">
            Номер заказа: <strong>#{order.orderNumber || order.id}</strong>
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 mb-6">
            <p className="font-medium text-amber-900 mb-2">Дашборд доступен после оплаты</p>
            <p className="text-sm text-amber-800 mb-4">
              Статус оплаты:{" "}
              {paymentStatusLabels[order.paymentStatus ?? "pending"] ?? order.paymentStatus}
            </p>
            <div className="flex flex-wrap gap-3">
              {order.paymentLink ? (
                <Link
                  href={appendAccessToken(`/order/${order.id}/pay`, accessToken)}
                  className="inline-block bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 text-sm font-medium"
                >
                  Перейти к оплате
                </Link>
              ) : null}
              <Link
                href={appendAccessToken(`/order-confirmation?id=${order.id}`, accessToken)}
                className="inline-block border border-amber-300 text-amber-900 px-6 py-2 rounded-md hover:bg-amber-100 text-sm font-medium"
              >
                Страница заказа
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusLabel = statusLabels[order.status] || order.status;

  return (
    <div className="container mx-auto px-4 py-12 md:py-16">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <p className="text-sm text-gray-500 uppercase tracking-wide mb-1">Оплаченный заказ</p>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Заказ #{order.orderNumber || order.id}
          </h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Дата заказа
            </p>
            <p className="text-lg font-semibold text-gray-900">{formatDateOnly(order.createdAt)}</p>
            <p className="text-sm text-gray-500 mt-1">{formatDateTime(order.createdAt)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Дата оплаты
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {order.paidAt ? formatDateOnly(order.paidAt) : "—"}
            </p>
            {order.paidAt ? (
              <p className="text-sm text-gray-500 mt-1">{formatDateTime(order.paidAt)}</p>
            ) : null}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Общая сумма заказа
            </p>
            <p className="text-2xl font-bold text-gray-900">{formatRub(order.totalAmount)} ₽</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Агентская комиссия
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {commissionTotal !== null ? `${formatRub(commissionTotal)} ₽` : "—"}
            </p>
            {order.eurRate == null || order.rubRate == null ? (
              <p className="text-xs text-amber-700 mt-2">
                Курсы на момент заказа не сохранены — комиссия по старым заказам может не считаться.
              </p>
            ) : null}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Стоимость доставки
            </p>
            <p className="text-xl font-semibold text-gray-900">
              {order.shippingCost === 0 ? (
                <span className="text-green-700">Бесплатно</span>
              ) : (
                `${formatRub(order.shippingCost)} ₽`
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Статус заказа
            </p>
            <p className="text-xl font-semibold text-gray-900">{statusLabel}</p>
            <p className="text-sm text-gray-500 mt-1">
              Оплата: {paymentStatusLabels.paid}
            </p>
          </div>
        </div>

        {order.requiresConfirmation ? (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Вы просили связаться с вами для подтверждения заказа — мы учтём это при обработке.
          </div>
        ) : null}

        {order.eurRate != null && order.rubRate != null ? (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100 text-sm">
            <p className="font-medium text-gray-700 mb-1">Курс на дату заказа</p>
            <p className="text-gray-600">
              EUR/USD: {order.eurRate.toFixed(2)} · RUB/USD: {order.rubRate.toFixed(2)}
            </p>
          </div>
        ) : null}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Состав заказа</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {order.items.map((item) => {
              const lineTotal = item.productPrice * item.quantity;
              const itemComm = getItemCommission(item, ratesForCommission);
              return (
                <div key={item.id} className="px-5 py-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div>
                      <p className="font-medium text-gray-900">{item.productName}</p>
                      {item.selectedColor ? (
                        <p className="text-sm text-gray-500">Цвет: {item.selectedColor}</p>
                      ) : null}
                      <p className="text-sm text-gray-500">
                        {formatRub(item.productPrice)} ₽ × {item.quantity}
                      </p>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <p className="font-semibold text-gray-900">{formatRub(lineTotal)} ₽</p>
                      {itemComm !== null ? (
                        <p className="text-sm text-gray-500">
                          Комиссия: {formatRub(itemComm)} ₽
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {(order.cdekAddress ||
          order.sellerTrackNumber ||
          order.russiaTrackNumber ||
          order.address) && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Доставка и отслеживание</h2>
            <dl className="space-y-2 text-sm">
              {order.cdekAddress ? (
                <div>
                  <dt className="text-gray-500">ПВЗ СДЭК</dt>
                  <dd className="font-medium text-gray-900">
                    {order.cdekAddress}
                    {order.cdekPointCode ? ` (код ${order.cdekPointCode})` : ""}
                  </dd>
                </div>
              ) : null}
              {order.address ? (
                <div>
                  <dt className="text-gray-500">Адрес</dt>
                  <dd className="font-medium text-gray-900">{order.address}</dd>
                </div>
              ) : null}
              {order.sellerTrackNumber ? (
                <div>
                  <dt className="text-gray-500">Трек продавца</dt>
                  <dd className="font-mono font-medium text-gray-900">{order.sellerTrackNumber}</dd>
                </div>
              ) : null}
              {order.russiaTrackNumber ? (
                <div>
                  <dt className="text-gray-500">Трек в РФ</dt>
                  <dd className="font-mono font-medium text-gray-900">{order.russiaTrackNumber}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        )}

        <div className="rounded-xl border-2 border-gray-900 bg-gray-50 p-6 mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Итого
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-baseline gap-4">
              <span className="text-gray-700">Общая сумма заказа</span>
              <span className="text-xl font-bold tabular-nums">{formatRub(order.totalAmount)} ₽</span>
            </div>
            {order.promoCode && (order.promoDiscount ?? 0) > 0 ? (
              <div className="flex justify-between text-green-700 text-sm">
                <span>Промокод {order.promoCode}</span>
                <span className="font-medium">−{formatRub(order.promoDiscount ?? 0)} ₽</span>
              </div>
            ) : null}
            <div className="flex justify-between items-baseline gap-4 pt-2 border-t border-gray-200">
              <span className="text-gray-700">Агентская комиссия (всего)</span>
              <span className="text-xl font-bold tabular-nums">
                {commissionTotal !== null ? `${formatRub(commissionTotal)} ₽` : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href={appendAccessToken(`/order-confirmation?id=${order.id}`, accessToken)}
            className="inline-block border border-gray-300 px-5 py-2.5 rounded-md hover:bg-gray-50 text-sm font-medium"
          >
            Подтверждение заказа
          </Link>
          <Link
            href="/orders"
            className="inline-block border border-gray-300 px-5 py-2.5 rounded-md hover:bg-gray-50 text-sm font-medium"
          >
            Мои заказы
          </Link>
          <Link
            href="/"
            className="inline-block bg-black text-white px-5 py-2.5 rounded-md hover:bg-gray-800 text-sm font-medium"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-16 text-center">
          <p>Загрузка...</p>
        </div>
      }
    >
      <OrderDashboardContent />
    </Suspense>
  );
}

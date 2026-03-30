"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatRub } from "@/lib/utils";

interface DashboardPayload {
  overview: {
    ordersTotal: number;
    ordersToday: number;
    ordersThisMonth: number;
    paidCount: number;
    paidThisMonth: number;
    revenuePaidRub: number;
    shippingPaidRub: number;
    promoDiscountSumRub: number;
    commissionPaidRub: number;
    ordersWithCommission: number;
    avgCheckPaidRub: number;
  };
  byStatus: Record<string, number>;
  byPaymentStatus: Record<string, number>;
}

const statusLabels: Record<string, string> = {
  accepted: "Заказ принят",
  purchased: "Выкуплен",
  in_transit_de: "В пути на склад",
  in_transit_ru: "В пути в РФ",
  delivered: "Доставлен",
  cancelled: "Отменён",
};

const statusColors: Record<string, string> = {
  accepted: "bg-yellow-100 text-yellow-800",
  purchased: "bg-blue-100 text-blue-800",
  in_transit_de: "bg-purple-100 text-purple-800",
  in_transit_ru: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-gray-200 text-gray-800",
};

const paymentLabels: Record<string, string> = {
  paid: "Оплачен",
  pending: "Ожидает оплаты",
  expired: "Истекла ссылка",
  cancelled: "Отменена",
  failed: "Ошибка",
};

export default function AdminOrdersDashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/orders/dashboard-stats", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Не удалось загрузить статистику");
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Ошибка");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center py-12 text-gray-600">Загрузка статистики…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-600">{error || "Нет данных"}</p>
        <Link href="/admin/orders" className="text-blue-600 underline mt-4 inline-block">
          К списку заказов
        </Link>
      </div>
    );
  }

  const { overview, byStatus, byPaymentStatus } = data;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Статистика заказов</h1>
          <p className="text-sm text-gray-500 mt-1">
            Сводка по всем заказам для анализа и отчётности
          </p>
        </div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
        >
          ← К списку заказов
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Всего заказов</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{overview.ordersTotal}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Сегодня (новые)</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{overview.ordersToday}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">За месяц (новые)</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{overview.ordersThisMonth}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Оплачено за месяц</p>
          <p className="text-3xl font-bold text-green-800 mt-1">{overview.paidThisMonth}</p>
        </div>
      </div>

      <div className="bg-slate-900 text-white rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Финансы по оплаченным заказам (всего)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <p className="text-slate-400 text-sm">Выручка (сумма заказов)</p>
            <p className="text-2xl font-bold mt-1">{formatRub(overview.revenuePaidRub)} ₽</p>
            <p className="text-xs text-slate-500 mt-1">Заказов оплачено: {overview.paidCount}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Средний чек</p>
            <p className="text-2xl font-bold mt-1">{formatRub(overview.avgCheckPaidRub)} ₽</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Доставка (сумма по оплаченным)</p>
            <p className="text-2xl font-bold mt-1">{formatRub(overview.shippingPaidRub)} ₽</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Скидки по промокодам</p>
            <p className="text-2xl font-bold mt-1 text-amber-200">
              −{formatRub(overview.promoDiscountSumRub)} ₽
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Вознаграждение комиссионера (оценка)</p>
            <p className="text-2xl font-bold mt-1">{formatRub(overview.commissionPaidRub)} ₽</p>
            <p className="text-xs text-slate-500 mt-1">
              По заказам с сохранёнными курсами/позициями: {overview.ordersWithCommission} шт.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">По статусу заказа</h2>
          <div className="space-y-2">
            {Object.entries(byStatus).map(([key, count]) => (
              <div
                key={key}
                className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
              >
                <span
                  className={`inline-block px-2 py-0.5 rounded text-sm font-medium ${statusColors[key] || "bg-gray-100"}`}
                >
                  {statusLabels[key] || key}
                </span>
                <span className="font-semibold tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">По оплате</h2>
          <div className="space-y-2">
            {Object.entries(byPaymentStatus)
              .sort((a, b) => b[1] - a[1])
              .map(([key, count]) => (
                <div
                  key={key}
                  className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                >
                  <span className="text-gray-800">{paymentLabels[key] || key}</span>
                  <span className="font-semibold tabular-nums">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Комиссия считается по тем же правилам, что в карточке заказа (курсы на дату и позиции). У старых
        заказов без курсов сумма может быть занижена.
      </p>
    </div>
  );
}

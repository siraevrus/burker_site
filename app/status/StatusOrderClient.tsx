"use client";

import { useState } from "react";
import Link from "next/link";
import { formatRub } from "@/lib/utils";

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
  expired: "Ссылка на оплату истекла",
  cancelled: "Оплата отменена",
  failed: "Ошибка оплаты",
};

type StatusItem = {
  productName: string;
  quantity: number;
  selectedColor: string;
};

type StatusPayload = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  paidAt: string | null;
  totalAmount: number;
  shippingCost: number;
  requiresConfirmation: boolean;
  cdekAddress: string | null;
  cdekPointCode: string | null;
  address: string | null;
  sellerTrackNumber: string | null;
  russiaTrackNumber: string | null;
  items: StatusItem[];
};

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StatusOrderClient() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<StatusPayload | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch("/api/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.orderNumber) {
        setResult(data as StatusPayload);
      } else {
        setError(data.error || "Не удалось получить статус заказа.");
      }
    } catch {
      setError("Ошибка сети. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = result
    ? statusLabels[result.status] || result.status
    : "";
  const paymentLabel = result
    ? paymentStatusLabels[result.paymentStatus] || result.paymentStatus
    : "";

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-center">Статус заказа</h1>
      <p className="text-gray-600 text-center text-sm mb-8">
        Введите номер заказа (например, BRK_0104251430_00042) и телефон, указанный при
        оформлении.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-5 mb-8"
      >
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        ) : null}

        <div>
          <label htmlFor="status-order-number" className="block text-sm font-medium mb-2">
            Номер заказа *
          </label>
          <input
            id="status-order-number"
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm"
            placeholder="BRK_0104251430_00042"
            autoComplete="off"
            required
          />
        </div>

        <div>
          <label htmlFor="status-phone" className="block text-sm font-medium mb-2">
            Телефон *
          </label>
          <input
            id="status-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="+7 900 000-00-00"
            autoComplete="tel"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-3 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-60"
        >
          {loading ? "Проверка…" : "Узнать статус"}
        </button>
      </form>

      {result ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Номер заказа
            </p>
            <p className="text-xl font-bold font-mono">#{result.orderNumber}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Статус заказа
              </p>
              <p className="font-semibold text-gray-900">{statusLabel}</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Оплата</p>
              <p className="font-semibold text-gray-900">{paymentLabel}</p>
            </div>
          </div>

          <dl className="text-sm space-y-2 border-t border-gray-100 pt-4">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Оформлен</dt>
              <dd className="font-medium text-right">{formatDateTime(result.createdAt)}</dd>
            </div>
            {result.paidAt ? (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Оплачен</dt>
                <dd className="font-medium text-right">{formatDateTime(result.paidAt)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Сумма заказа</dt>
              <dd className="font-medium text-right tabular-nums">
                {formatRub(result.totalAmount)} ₽
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Доставка</dt>
              <dd className="font-medium text-right tabular-nums">
                {result.shippingCost === 0 ? (
                  <span className="text-green-700">Бесплатно</span>
                ) : (
                  `${formatRub(result.shippingCost)} ₽`
                )}
              </dd>
            </div>
          </dl>

          {result.requiresConfirmation ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              Вы просили связаться с вами для подтверждения заказа — мы учтём это при обработке.
            </div>
          ) : null}

          {result.items.length > 0 ? (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Состав заказа</h2>
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                {result.items.map((it, idx) => (
                  <li key={`${it.productName}-${idx}`} className="px-4 py-3 text-sm">
                    <span className="font-medium text-gray-900">{it.productName}</span>
                    {it.selectedColor ? (
                      <span className="text-gray-500"> · {it.selectedColor}</span>
                    ) : null}
                    <span className="text-gray-500"> × {it.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {(result.cdekAddress ||
            result.address ||
            result.sellerTrackNumber ||
            result.russiaTrackNumber) && (
            <div className="border-t border-gray-100 pt-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Доставка и отслеживание</h2>
              <dl className="space-y-2 text-sm">
                {result.cdekAddress ? (
                  <div>
                    <dt className="text-gray-500">ПВЗ СДЭК</dt>
                    <dd className="font-medium text-gray-900">
                      {result.cdekAddress}
                      {result.cdekPointCode ? ` (код ${result.cdekPointCode})` : ""}
                    </dd>
                  </div>
                ) : null}
                {result.address ? (
                  <div>
                    <dt className="text-gray-500">Адрес</dt>
                    <dd className="font-medium text-gray-900">{result.address}</dd>
                  </div>
                ) : null}
                {result.sellerTrackNumber ? (
                  <div>
                    <dt className="text-gray-500">Трек продавца</dt>
                    <dd className="font-mono font-medium text-gray-900">
                      {result.sellerTrackNumber}
                    </dd>
                  </div>
                ) : null}
                {result.russiaTrackNumber ? (
                  <div>
                    <dt className="text-gray-500">Трек в РФ</dt>
                    <dd className="font-mono font-medium text-gray-900">
                      {result.russiaTrackNumber}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          )}

          <p className="text-xs text-gray-500">
            Оплатить заказ или открыть полную сводку можно по ссылке из письма после оформления.
          </p>

          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Link
              href="/contact"
              className="inline-block border border-gray-300 px-5 py-2 rounded-md hover:bg-gray-50 text-sm font-medium"
            >
              Связаться с нами
            </Link>
            <Link
              href="/"
              className="inline-block bg-black text-white px-5 py-2 rounded-md hover:bg-gray-800 text-sm font-medium"
            >
              На главную
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

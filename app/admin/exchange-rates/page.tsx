"use client";

import { useState, useEffect } from "react";

interface RatesData {
  eurRate: number;
  rubRate: number;
  rubPerEur: number;
  updatedAt: string | null;
}

export default function AdminExchangeRatesPage() {
  const [data, setData] = useState<RatesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const loadRates = async () => {
    try {
      const res = await fetch("/api/admin/exchange-rates", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setData(null);
      }
    } catch (e) {
      console.error(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
  }, []);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/exchange-rates/update", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        setData({
          eurRate: json.rates.eurRate,
          rubRate: json.rates.rubRate,
          rubPerEur: json.rubPerEur,
          updatedAt: json.updatedAt,
        });
      } else {
        const err = await res.json();
        alert(err.error || "Ошибка обновления курсов");
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка обновления курсов");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Загрузка...</p>
      </div>
    );
  }

  const formatDate = (s: string | null) => {
    if (!s) return "—";
    try {
      const d = new Date(s);
      return d.toLocaleString("ru-RU");
    } catch {
      return s;
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Курсы валют</h1>
        <button
          type="button"
          onClick={handleUpdate}
          disabled={updating}
          className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updating ? "Обновление…" : "Обновить курсы"}
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Курсы используются при парсинге и расчёте цен. Обновление загружает данные с сайта ЦБ РФ; при ошибке подставляются значения по умолчанию (80 ₽/USD, 95 ₽/EUR).
      </p>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-sm font-semibold text-gray-700">Валюта</th>
              <th className="px-4 py-3 text-sm font-semibold text-gray-700">Курс (₽ за 1 ед.)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="px-4 py-3 font-medium">USD</td>
              <td className="px-4 py-3">{data?.rubRate != null ? `${data.rubRate.toFixed(2)} ₽` : "—"}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="px-4 py-3 font-medium">EUR</td>
              <td className="px-4 py-3">{data?.rubPerEur != null ? `${data.rubPerEur.toFixed(2)} ₽` : "—"}</td>
            </tr>
          </tbody>
        </table>
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
          Обновлено: {formatDate(data?.updatedAt ?? null)}
        </div>
      </div>
    </div>
  );
}

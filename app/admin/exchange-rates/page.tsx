"use client";

import { useState, useEffect } from "react";

interface RatesData {
  eurRate: number;
  rubRate: number;
  rubPerEur: number;
  updatedAt: string | null;
}

interface HistoryItem {
  id: string;
  eurRate: number;
  rubRate: number;
  rubPerEur: number;
  source: string;
  createdAt: string;
}

export default function AdminExchangeRatesPage() {
  const [data, setData] = useState<RatesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = async () => {
    try {
      const res = await fetch("/api/admin/exchange-rates/history?limit=50", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setHistory(json.items ?? []);
      } else {
        setHistory([]);
      }
    } catch (e) {
      console.error(e);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

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
    loadHistory();
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
        loadHistory();
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

  const sourceLabel = (s: string) => (s === "cbr" ? "ЦБ РФ" : s === "default" ? "по умолчанию" : s);

  return (
    <div className="p-6 max-w-4xl">
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

      {/* История парсинга курсов */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-8">
        <h2 className="text-xl font-bold px-4 py-3 border-b border-gray-200 bg-gray-50">История парсинга</h2>
        {loadingHistory ? (
          <div className="px-4 py-8 text-center text-gray-500">Загрузка истории…</div>
        ) : history.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">История парсинга пуста</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата и время</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">USD (₽)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EUR (₽)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Источник</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.rubRate.toFixed(2)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.rubPerEur.toFixed(2)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{sourceLabel(item.source)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

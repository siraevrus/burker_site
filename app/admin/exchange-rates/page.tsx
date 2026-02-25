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

interface HistoryResponse {
  items: HistoryItem[];
  total: number;
  limit: number;
  offset: number;
}

const SOURCE_LABELS: Record<string, string> = {
  cbr: "ЦБ РФ",
  default: "Дефолт (ошибка ЦБ)",
  manual: "Вручную",
};

export default function AdminExchangeRatesPage() {
  const [data, setData] = useState<RatesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(true);

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

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/admin/exchange-rates/history?limit=100", { credentials: "include" });
      if (res.ok) {
        const json: HistoryResponse = await res.json();
        setHistory(json.items);
        setHistoryTotal(json.total);
      } else {
        setHistory([]);
      }
    } catch (e) {
      console.error(e);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
  }, []);

  useEffect(() => {
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

  const formatDate = (s: string | null) => {
    if (!s) return "—";
    try {
      const d = new Date(s);
      return d.toLocaleString("ru-RU");
    } catch {
      return s;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Загрузка...</p>
      </div>
    );
  }

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

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-8">
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

      <h2 className="text-lg font-semibold text-gray-900 mb-3">История парсинга курсов</h2>
      <p className="text-sm text-gray-600 mb-4">
        Последние обновления курсов (cron или ручное). Всего записей: {historyTotal}.
      </p>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {historyLoading ? (
          <div className="px-4 py-8 text-center text-gray-500">Загрузка истории…</div>
        ) : history.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">История пуста. Обновите курсы вручную или дождитесь запуска cron.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-semibold text-gray-700">Дата и время</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">USD, ₽</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">EUR, ₽</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Источник</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-gray-700">{formatDate(row.createdAt)}</td>
                    <td className="px-4 py-2.5">{row.rubRate.toFixed(2)}</td>
                    <td className="px-4 py-2.5">{row.rubPerEur.toFixed(2)}</td>
                    <td className="px-4 py-2.5">{SOURCE_LABELS[row.source] ?? row.source}</td>
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

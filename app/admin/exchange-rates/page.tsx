"use client";

import { useState, useEffect } from "react";
import { formatRub } from "@/lib/utils";

interface RatesData {
  eurRate: number;
  rubRate: number;
  rubPerEur: number;
  updatedAt: string | null;
}

interface ImportHistoryItem {
  id: string;
  type: string;
  added: number;
  updated: number;
  errors: number;
  total: number;
  createdAt: string;
}

export default function AdminExchangeRatesPage() {
  const [data, setData] = useState<RatesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>([]);
  const [loadingImportHistory, setLoadingImportHistory] = useState(true);

  const loadImportHistory = async () => {
    try {
      const res = await fetch("/api/admin/import/history?limit=20", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setImportHistory(json.history ?? []);
      } else {
        setImportHistory([]);
      }
    } catch (e) {
      console.error(e);
      setImportHistory([]);
    } finally {
      setLoadingImportHistory(false);
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
    loadImportHistory();
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

  const importTypeLabel = (t: string) => {
    if (t === "automatic") return "Авто (cron)";
    if (t === "manual") return "Вручную";
    if (t === "file") return "Файл";
    return t;
  };

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
              <td className="px-4 py-3">{data?.rubRate != null ? `${formatRub(data.rubRate)} ₽` : "—"}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="px-4 py-3 font-medium">EUR</td>
              <td className="px-4 py-3">{data?.rubPerEur != null ? `${formatRub(data.rubPerEur)} ₽` : "—"}</td>
            </tr>
          </tbody>
        </table>
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
          Обновлено: {formatDate(data?.updatedAt ?? null)}
        </div>
      </div>

      {/* История парсинга товаров */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-8">
        <h2 className="text-xl font-bold px-4 py-3 border-b border-gray-200 bg-gray-50">История парсинга</h2>
        {loadingImportHistory ? (
          <div className="px-4 py-8 text-center text-gray-500">Загрузка истории…</div>
        ) : importHistory.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">История парсинга пуста</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата и время</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тип</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Всего</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Добавлено</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Обновлено</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ошибки</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {importHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{importTypeLabel(item.type)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.total}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 font-medium">{item.added > 0 ? `+${item.added}` : item.added}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 font-medium">{item.updated}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {item.errors > 0 ? (
                        <span className="text-red-600 font-medium">{item.errors}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
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

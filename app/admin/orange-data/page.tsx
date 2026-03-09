"use client";

import { useState, useEffect } from "react";

interface OrangeDataStatus {
  configured: boolean;
  disabled: boolean;
  enabled: boolean;
  diagnostics?: {
    paths: { path: string; exists: boolean; note?: string }[];
    configOk: boolean;
    failReason?: string;
  };
}

export default function AdminOrangeDataPage() {
  const [data, setData] = useState<OrangeDataStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const loadStatus = async () => {
    try {
      const res = await fetch("/api/admin/orange-data", { credentials: "include" });
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
    loadStatus();
  }, []);

  const handleToggle = async () => {
    if (!data) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/orange-data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ disabled: !data.disabled }),
      });
      if (res.ok) {
        const json = await res.json();
        setData((prev) =>
          prev ? { ...prev, disabled: json.disabled, enabled: !json.disabled } : null
        );
        alert(json.message);
      } else {
        const err = await res.json();
        alert(err.error || "Ошибка сохранения");
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка сохранения");
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

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Orange Data (54-ФЗ)</h1>

      <p className="text-sm text-gray-600 mb-6">
        Фискализация чеков через Orange Data при оплате заказов. При отключении чеки не будут
        формироваться и отправляться в ОФД.
      </p>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-gray-900">
              {data?.disabled ? "Фискализация отключена" : "Фискализация включена"}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {data?.configured
                ? data.disabled
                  ? "Конфигурация настроена. Чеки не отправляются."
                  : "Чеки будут отправляться при каждой оплате."
                : "Конфигурация не настроена (сертификаты, ИНН)."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            disabled={updating || !data?.configured}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              data?.disabled ? "bg-gray-300" : "bg-gray-700"
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                data?.disabled ? "translate-x-1" : "translate-x-6"
              }`}
            />
          </button>
        </div>

        {!data?.configured && data?.diagnostics && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm font-medium text-amber-700 mb-2">Диагностика:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              {data.diagnostics.paths.map(({ path, exists, note }) => (
                <li key={path}>
                  {exists ? "✓" : "✗"} {path} {note}
                </li>
              ))}
              {data.diagnostics.failReason && (
                <li className="text-amber-600">Причина: {data.diagnostics.failReason}</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

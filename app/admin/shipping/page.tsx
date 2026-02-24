"use client";

import { useState, useEffect } from "react";

interface RateRow {
  id: string;
  weightKg: number;
  priceRub: number;
}

export default function AdminShippingPage() {
  const [rates, setRates] = useState<RateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadRates = async () => {
    try {
      const res = await fetch("/api/admin/shipping/rates", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setRates(data.rates || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
  }, []);

  const updateRow = (index: number, field: "weightKg" | "priceRub", value: number) => {
    setRates((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addRow = () => {
    const maxWeight = rates.length > 0 ? Math.max(...rates.map((r) => r.weightKg)) : 0;
    setRates((prev) => [...prev, { id: "", weightKg: maxWeight + 0.1, priceRub: 0 }]);
  };

  const removeRow = (index: number) => {
    setRates((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/shipping/rates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          rates: rates.map((r) => ({
            id: r.id || undefined,
            weightKg: Number(r.weightKg),
            priceRub: Number(r.priceRub),
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRates(data.rates || []);
      } else {
        const data = await res.json();
        alert(data.error || "Ошибка сохранения");
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">Стоимость доставки</h1>
      <p className="text-gray-600 mb-6">
        Таблица соответствия веса (кг) и цены доставки (₽). Стоимость считается по весу корзины с округлением вверх до ближайшего значения. Вес товаров: часы — 0,3 кг/шт., украшения — 0,1 кг/шт.
      </p>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden max-w-2xl">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-700">Вес (кг)</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Цена (₽)</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {rates.map((row, index) => (
              <tr key={row.id || index} className="border-b border-gray-100">
                <td className="py-2 px-4">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={row.weightKg}
                    onChange={(e) => updateRow(index, "weightKg", parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-1.5 border border-gray-300 rounded-md"
                  />
                </td>
                <td className="py-2 px-4">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={row.priceRub}
                    onChange={(e) => updateRow(index, "priceRub", parseInt(e.target.value, 10) || 0)}
                    className="w-28 px-2 py-1.5 border border-gray-300 rounded-md"
                  />
                </td>
                <td className="py-2 px-2">
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4 border-t border-gray-200 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={addRow}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            + Добавить строку
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

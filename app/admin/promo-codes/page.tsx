"use client";

import { useState, useEffect } from "react";
import { PromoCode } from "@/lib/types";

export default function AdminPromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    discount: "",
    validFrom: "",
    validUntil: "",
    isActive: true,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    loadPromoCodes();
  }, []);

  const loadPromoCodes = async () => {
    try {
      const response = await fetch("/api/promo-codes");
      if (response.ok) {
        const data = await response.json();
        setPromoCodes(data.promoCodes || []);
      }
    } catch (error) {
      console.error("Error loading promo codes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const url = editingId
        ? `/api/promo-codes?id=${editingId}`
        : "/api/promo-codes";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(editingId && { id: editingId }),
          ...formData,
          discount: parseFloat(formData.discount),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Ошибка при сохранении промокода");
        return;
      }

      await loadPromoCodes();
      resetForm();
    } catch (error) {
      console.error("Error saving promo code:", error);
      setError("Ошибка при сохранении промокода");
    }
  };

  const handleEdit = (promoCode: PromoCode) => {
    setEditingId(promoCode.id);
    setFormData({
      code: promoCode.code,
      discount: promoCode.discount.toString(),
      validFrom: new Date(promoCode.validFrom).toISOString().slice(0, 16),
      validUntil: new Date(promoCode.validUntil).toISOString().slice(0, 16),
      isActive: promoCode.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот промокод?")) {
      return;
    }

    try {
      const response = await fetch(`/api/promo-codes?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadPromoCodes();
      } else {
        const data = await response.json();
        alert(data.error || "Ошибка при удалении промокода");
      }
    } catch (error) {
      console.error("Error deleting promo code:", error);
      alert("Ошибка при удалении промокода");
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      discount: "",
      validFrom: "",
      validUntil: "",
      isActive: true,
    });
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  const isPromoCodeValid = (promoCode: PromoCode) => {
    if (!promoCode.isActive) return false;
    const now = new Date();
    return now >= new Date(promoCode.validFrom) && now <= new Date(promoCode.validUntil);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">Загрузка промокодов...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Промокоды</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 transition-colors"
        >
          + Создать промокод
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">
            {editingId ? "Редактировать промокод" : "Создать промокод"}
          </h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Код промокода *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
                placeholder="Например: SUMMER2024"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Сумма скидки (₽) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.discount}
                onChange={(e) =>
                  setFormData({ ...formData, discount: e.target.value })
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
                placeholder="1000"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Дата начала действия *
                </label>
                <input
                  type="datetime-local"
                  value={formData.validFrom}
                  onChange={(e) =>
                    setFormData({ ...formData, validFrom: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Дата окончания действия *
                </label>
                <input
                  type="datetime-local"
                  value={formData.validUntil}
                  onChange={(e) =>
                    setFormData({ ...formData, validUntil: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                />
                <span className="text-sm">Активен</span>
              </label>
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 transition-colors"
              >
                {editingId ? "Сохранить" : "Создать"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Код
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Скидка
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Период действия
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Статус
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {promoCodes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Нет промокодов
                </td>
              </tr>
            ) : (
              promoCodes.map((promoCode) => {
                const isValid = isPromoCodeValid(promoCode);
                return (
                  <tr key={promoCode.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {promoCode.code}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {promoCode.discount.toFixed(0)} ₽
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {new Date(promoCode.validFrom).toLocaleDateString("ru-RU")} -{" "}
                        {new Date(promoCode.validUntil).toLocaleDateString("ru-RU")}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          isValid
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {isValid ? "Действителен" : "Не действителен"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(promoCode)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleDelete(promoCode.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

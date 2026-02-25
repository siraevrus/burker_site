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
    discountType: "fixed" as "fixed" | "percent",
    discount: "",
    validFrom: "",
    validUntil: "",
    minOrderAmount: "",
    firstOrderOnly: false,
    usageLimit: "1",
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingId && { id: editingId }),
          code: formData.code,
          discountType: formData.discountType,
          discount: parseFloat(formData.discount),
          validFrom: formData.validFrom,
          validUntil: formData.validUntil,
          minOrderAmount: formData.minOrderAmount || null,
          firstOrderOnly: formData.firstOrderOnly,
          usageLimit: formData.usageLimit,
          isActive: formData.isActive,
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
      discountType: promoCode.discountType || "fixed",
      discount: promoCode.discount.toString(),
      validFrom: new Date(promoCode.validFrom).toISOString().slice(0, 16),
      validUntil: new Date(promoCode.validUntil).toISOString().slice(0, 16),
      minOrderAmount: promoCode.minOrderAmount?.toString() || "",
      firstOrderOnly: promoCode.firstOrderOnly ?? false,
      usageLimit: (promoCode.usageLimit ?? 1).toString(),
      isActive: promoCode.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот промокод?")) return;

    try {
      const response = await fetch(`/api/promo-codes?id=${id}`, { method: "DELETE" });
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
      discountType: "fixed",
      discount: "",
      validFrom: "",
      validUntil: "",
      minOrderAmount: "",
      firstOrderOnly: false,
      usageLimit: "1",
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

  const formatDiscount = (pc: PromoCode) =>
    pc.discountType === "percent" ? `${pc.discount}%` : `${pc.discount.toFixed(0)} ₽`;

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
          onClick={() => { resetForm(); setShowForm(true); }}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Код промокода *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                  placeholder="SUMMER2024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Тип скидки *</label>
                <select
                  value={formData.discountType}
                  onChange={(e) =>
                    setFormData({ ...formData, discountType: e.target.value as "fixed" | "percent" })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="fixed">Фиксированная (₽)</option>
                  <option value="percent">Процент (%)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Размер скидки {formData.discountType === "percent" ? "(%)" : "(₽)"} *
                </label>
                <input
                  type="number"
                  step={formData.discountType === "percent" ? "1" : "0.01"}
                  min="0"
                  max={formData.discountType === "percent" ? "100" : undefined}
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                  placeholder={formData.discountType === "percent" ? "10" : "1000"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Минимальная сумма заказа (₽)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minOrderAmount}
                  onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Не ограничена"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Дата начала действия *</label>
                <input
                  type="datetime-local"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Дата окончания действия *</label>
                <input
                  type="datetime-local"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Лимит на пользователя</label>
                <input
                  type="number"
                  min="1"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.firstOrderOnly}
                    onChange={(e) => setFormData({ ...formData, firstOrderOnly: e.target.checked })}
                    className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                  />
                  <span className="text-sm">Только на первый заказ</span>
                </label>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                  />
                  <span className="text-sm">Активен</span>
                </label>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Код
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Скидка
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Период
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Мин. сумма
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Первый заказ
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Использ.
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {promoCodes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-4 text-center text-gray-500">
                    Нет промокодов
                  </td>
                </tr>
              ) : (
                promoCodes.map((pc) => {
                  const isValid = isPromoCodeValid(pc);
                  return (
                    <tr key={pc.id}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono font-medium text-gray-900">
                          {pc.code}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDiscount(pc)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {new Date(pc.validFrom).toLocaleDateString("ru-RU")} –{" "}
                        {new Date(pc.validUntil).toLocaleDateString("ru-RU")}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {pc.minOrderAmount ? `${pc.minOrderAmount.toFixed(0)} ₽` : "—"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {pc.firstOrderOnly ? "Да" : "Нет"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {pc.usageCount ?? 0}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
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
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(pc)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleDelete(pc.id)}
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
    </div>
  );
}

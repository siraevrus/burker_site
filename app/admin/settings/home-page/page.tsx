"use client";

import { useState, useEffect } from "react";

export default function AdminHomePageSettingsPage() {
  const [bestsellersTitle, setBestsellersTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/admin/home-page-settings");
        if (response.ok) {
          const data = await response.json();
          setBestsellersTitle(data.bestsellersTitle ?? "Бестселлеры");
        }
      } catch (error) {
        console.error("Error loading home page settings:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/home-page-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bestsellersTitle }),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await response.json();
        alert(data.error || "Ошибка при сохранении");
      }
    } catch (error) {
      console.error("Error saving:", error);
      alert("Ошибка при сохранении");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-600">Загрузка…</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">Главная страница</h1>
      <p className="text-gray-600 text-sm mb-8">
        Тексты блоков на главной. Меняется только отображаемый заголовок, не логика подбора товаров.
      </p>

      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label
              htmlFor="bestsellersTitle"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Заголовок блока «Бестселлеры»
            </label>
            <input
              id="bestsellersTitle"
              type="text"
              value={bestsellersTitle}
              onChange={(e) => {
                if (e.target.value.length <= 120) {
                  setBestsellersTitle(e.target.value);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              maxLength={120}
              required
              placeholder="Бестселлеры"
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-500">{bestsellersTitle.length} / 120</p>
              {saved && <p className="text-xs text-green-600">Сохранено</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {isSaving ? "Сохранение…" : "Сохранить"}
          </button>
        </form>
      </div>
    </div>
  );
}

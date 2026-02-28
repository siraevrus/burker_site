"use client";

import { useState, useEffect } from "react";

export default function AdminFooterPage() {
  const [customerServiceTitle, setCustomerServiceTitle] = useState("");
  const [policiesTitle, setPoliciesTitle] = useState("");
  const [socialTitle, setSocialTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/admin/footer");
        if (response.ok) {
          const data = await response.json();
          setCustomerServiceTitle(data.customerServiceTitle ?? "");
          setPoliciesTitle(data.policiesTitle ?? "");
          setSocialTitle(data.socialTitle ?? "");
        }
      } catch (error) {
        console.error("Error loading footer settings:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaved(false);
    try {
      const response = await fetch("/api/admin/footer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerServiceTitle: customerServiceTitle.trim(),
          policiesTitle: policiesTitle.trim(),
          socialTitle: socialTitle.trim(),
        }),
      });
      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await response.json();
        alert(data.error || "Ошибка при сохранении");
      }
    } catch (error) {
      console.error("Error saving footer:", error);
      alert("Ошибка при сохранении");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-600">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Футер</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-gray-600 mb-6">
          Заголовки блоков в подвале сайта. Пустые поля заменяются значениями по умолчанию.
        </p>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Обслуживание клиентов (заголовок блока)
            </label>
            <input
              type="text"
              value={customerServiceTitle}
              onChange={(e) => setCustomerServiceTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Обслуживание клиентов"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Политики (заголовок блока)
            </label>
            <input
              type="text"
              value={policiesTitle}
              onChange={(e) => setPoliciesTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Политики"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Социальные сети (заголовок блока)
            </label>
            <input
              type="text"
              value={socialTitle}
              onChange={(e) => setSocialTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Социальные сети"
            />
          </div>
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {isSaving ? "Сохранение..." : "Сохранить"}
            </button>
            {saved && <span className="text-green-600 text-sm">Сохранено!</span>}
          </div>
        </form>
      </div>
    </div>
  );
}

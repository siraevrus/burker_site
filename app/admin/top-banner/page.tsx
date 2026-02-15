"use client";

import { useState, useEffect } from "react";
import { getTopBannerText, saveTopBannerText } from "@/lib/topBanner";

export default function AdminTopBannerPage() {
  const [text, setText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadText = async () => {
      const loaded = await getTopBannerText();
      setText(loaded);
    };
    loadText();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await saveTopBannerText(text);
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Верхняя строка</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Текст верхней строки (максимум 200 символов)
            </label>
            <textarea
              value={text}
              onChange={(e) => {
                if (e.target.value.length <= 200) {
                  setText(e.target.value);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              maxLength={200}
              required
              placeholder="Введите текст для верхней строки..."
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-500">
                {text.length} / 200 символов
              </p>
              {saved && (
                <p className="text-xs text-green-600">Сохранено!</p>
              )}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {isSaving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </form>

        {/* Предпросмотр */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Предпросмотр</h2>
          <div className="bg-gray-50 rounded-md p-4">
            <div
              className="text-center py-2 text-sm"
              style={{ backgroundColor: "#FCFAF8" }}
            >
              <p className="text-gray-900">{text || "Введите текст для предпросмотра"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

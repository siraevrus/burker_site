"use client";

import { useState, useEffect } from "react";

interface FaqItem {
  id?: string;
  question: string;
  answer: string;
}

export default function AdminFaqPage() {
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<FaqItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/admin/faq");
        if (response.ok) {
          const data = await response.json();
          setTitle(data.title ?? "Вопрос-Ответ");
          setItems(
            (data.items ?? []).map((i: { id: string; question: string; answer: string }) => ({
              id: i.id,
              question: i.question,
              answer: i.answer,
            }))
          );
        }
      } catch (error) {
        console.error("Error loading FAQ:", error);
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
      const response = await fetch("/api/admin/faq", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "Вопрос-Ответ",
          items: items.filter((i) => i.question.trim() || i.answer.trim()),
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
      console.error("Error saving FAQ:", error);
      alert("Ошибка при сохранении");
    } finally {
      setIsSaving(false);
    }
  };

  const addItem = () => {
    setItems([...items, { question: "", answer: "" }]);
  };

  const updateItem = (index: number, field: "question" | "answer", value: string) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, dir: "up" | "down") => {
    const next = [...items];
    const j = dir === "up" ? index - 1 : index + 1;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setItems(next);
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
        <h1 className="text-3xl font-bold">Вопрос-Ответ</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-gray-600 mb-6">
          Блок «Вопрос-Ответ» на главной странице. Отображается как аккордеон — клик по вопросу раскрывает ответ.
        </p>
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Заголовок секции</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Вопрос-Ответ"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">Вопросы и ответы</label>
              <button
                type="button"
                onClick={addItem}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                + Добавить вопрос
              </button>
            </div>

            {items.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">Нет вопросов. Нажмите «Добавить вопрос».</p>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={item.id ?? index}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50/50"
                  >
                    <div className="flex gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => moveItem(index, "up")}
                        disabled={index === 0}
                        className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                        title="Поднять"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(index, "down")}
                        disabled={index === items.length - 1}
                        className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                        title="Опустить"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="ml-auto p-1 text-red-600 hover:text-red-800 text-sm"
                      >
                        Удалить
                      </button>
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={item.question}
                        onChange={(e) => updateItem(index, "question", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Вопрос"
                      />
                      <textarea
                        value={item.answer}
                        onChange={(e) => updateItem(index, "answer", e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Ответ"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
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

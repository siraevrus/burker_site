"use client";

import { useState, useEffect } from "react";

interface FeedbackItem {
  id: string;
  name: string;
  contact: string;
  comment: string;
  processed: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "processed" | "new">("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const processedParam =
        filter === "processed" ? "true" : filter === "new" ? "false" : "";
      const url = `/api/admin/feedback?page=${pagination.page}&limit=${pagination.limit}${
        processedParam ? `&processed=${processedParam}` : ""
      }`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setFeedback(data.feedback || []);
        setPagination(data.pagination || pagination);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, [filter, pagination.page]);

  const handleToggleProcessed = async (id: string, processed: boolean) => {
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processed }),
      });
      if (res.ok) {
        setFeedback((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, processed } : item
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">ФОС — Форма обратной связи</h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-md ${
            filter === "all" ? "bg-gray-700 text-white" : "bg-white border border-gray-300"
          }`}
        >
          Все
        </button>
        <button
          onClick={() => setFilter("new")}
          className={`px-4 py-2 rounded-md ${
            filter === "new" ? "bg-gray-700 text-white" : "bg-white border border-gray-300"
          }`}
        >
          Новые
        </button>
        <button
          onClick={() => setFilter("processed")}
          className={`px-4 py-2 rounded-md ${
            filter === "processed" ? "bg-gray-700 text-white" : "bg-white border border-gray-300"
          }`}
        >
          Отработанные
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500">Загрузка...</div>
      ) : feedback.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          Сообщений пока нет
        </div>
      ) : (
        <div className="space-y-4">
          {feedback.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-lg border p-5 ${
                item.processed ? "border-gray-200 opacity-80" : "border-gray-300"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-semibold">{item.name}</span>
                    <span className="text-gray-500 text-sm">
                      {formatDate(item.createdAt)}
                    </span>
                    {item.processed && (
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                        Отработано
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 text-sm mb-1">
                    <span className="text-gray-500">Контакт:</span> {item.contact}
                  </p>
                  <p className="text-gray-800 whitespace-pre-wrap">{item.comment}</p>
                </div>
                <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.processed}
                    onChange={(e) =>
                      handleToggleProcessed(item.id, e.target.checked)
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium">Сообщение отработано</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            disabled={pagination.page <= 1}
            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50"
          >
            Назад
          </button>
          <span className="py-2 text-gray-600">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            disabled={pagination.page >= pagination.totalPages}
            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50"
          >
            Вперёд
          </button>
        </div>
      )}
    </div>
  );
}

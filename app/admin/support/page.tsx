'use client';

import Link from "next/link";
import { useEffect, useState } from "react";

type SessionRow = {
  id: string;
  status: string;
  lastMessageAt: string;
  hasUnreadForAdmin: boolean;
  visitorName: string | null;
  visitorEmail: string | null;
  messages: { body: string }[];
  user: { email: string; firstName: string | null } | null;
};

export default function AdminSupportListPage() {
  const [status, setStatus] = useState<"all" | "open" | "closed">("open");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/support/sessions?page=${page}&limit=30&status=${status}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status, page]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Чат поддержки</h1>
        <Link
          href="/admin/support/settings"
          className="text-sm px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Настройки виджета
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        {(["open", "closed", "all"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setPage(1);
              setStatus(s);
            }}
            className={`px-3 py-1.5 rounded-md text-sm ${
              status === s ? "bg-neutral-900 text-white" : "bg-white border border-gray-300"
            }`}
          >
            {s === "open" ? "Открытые" : s === "closed" ? "Закрытые" : "Все"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-600">Загрузка…</p>
      ) : (
        <ul className="divide-y divide-gray-200 bg-white rounded-lg border border-gray-200">
          {sessions.length === 0 ? (
            <li className="p-6 text-gray-600">Нет диалогов</li>
          ) : (
            sessions.map((s) => {
              const preview = s.messages[0]?.body?.slice(0, 120) || "—";
              const label =
                s.user?.email ||
                s.visitorEmail ||
                s.visitorName ||
                "Гость";
              return (
                <li key={s.id}>
                  <Link
                    href={`/admin/support/${s.id}`}
                    className="block p-4 hover:bg-gray-50"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-gray-900">{label}</span>
                      <span className="text-xs text-gray-500 shrink-0">
                        {new Date(s.lastMessageAt).toLocaleString("ru-RU")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{preview}</p>
                    {s.hasUnreadForAdmin && (
                      <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                        Не прочитано
                      </span>
                    )}
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Назад
          </button>
          <span className="py-1 text-sm">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Вперёд
          </button>
        </div>
      )}
    </div>
  );
}

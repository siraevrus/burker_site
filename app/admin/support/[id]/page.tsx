'use client';

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Msg = { id: string; role: string; body: string; createdAt: string };

type Session = {
  id: string;
  status: string;
  messages: Msg[];
  visitorName: string | null;
  visitorEmail: string | null;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    phone: string | null;
  } | null;
};

export default function AdminSupportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const [session, setSession] = useState<Session | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchSession = useCallback(
    async (markRead: boolean) => {
      const q = markRead ? "?markRead=1" : "";
      const res = await fetch(`/api/admin/support/sessions/${id}${q}`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.session as Session;
    },
    [id]
  );

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchSession(true).then((s) => {
      setSession(s);
      if (s?.messages?.length)
        lastIdRef.current = s.messages[s.messages.length - 1].id;
      setLoading(false);
    });
  }, [id, fetchSession]);

  useEffect(() => {
    if (!id || !session || session.status !== "open") return;
    const t = setInterval(async () => {
      const s = await fetchSession(false);
      if (!s) return;
      setSession((prev) => {
        if (!prev) return s;
        const prevIds = new Set(prev.messages.map((m) => m.id));
        const extra = s.messages.filter((m) => !prevIds.has(m.id));
        if (!extra.length) return prev;
        lastIdRef.current = s.messages[s.messages.length - 1]?.id ?? lastIdRef.current;
        return { ...prev, messages: [...prev.messages, ...extra] };
      });
    }, 4000);
    return () => clearInterval(t);
  }, [id, session?.status, fetchSession]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending || !id) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/support/sessions/${id}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        setText("");
        setSession((prev) =>
          prev
            ? { ...prev, messages: [...prev.messages, data.message] }
            : prev
        );
        lastIdRef.current = data.message.id;
      }
    } finally {
      setSending(false);
    }
  };

  const closeChat = async () => {
    if (!id || !confirm("Закрыть этот диалог?")) return;
    const res = await fetch(`/api/admin/support/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
      credentials: "include",
    });
    if (res.ok) router.push("/admin/support");
  };

  if (loading || !session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-600">{loading ? "Загрузка…" : "Не найдено"}</p>
        <Link href="/admin/support" className="text-blue-600 underline mt-4 inline-block">
          К списку
        </Link>
      </div>
    );
  }

  const extraContactLines: string[] = [];
  if (session.user) {
    if (session.user.firstName) extraContactLines.push(`Имя: ${session.user.firstName}`);
    if (session.user.phone) extraContactLines.push(`Телефон: ${session.user.phone}`);
  } else {
    if (session.visitorName) extraContactLines.push(`Имя (гость): ${session.visitorName}`);
    if (session.visitorEmail) extraContactLines.push(`Email (гость): ${session.visitorEmail}`);
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <Link href="/admin/support" className="text-sm text-blue-600 hover:underline">
            ← Все диалоги
          </Link>
          {session.user ? (
            <>
              <p className="text-xs text-gray-500 mt-2 uppercase tracking-wide">
                Авторизованный пользователь
              </p>
              <h1 className="text-xl font-bold mt-1">
                <Link
                  href={`/admin/users/${session.user.id}`}
                  className="text-blue-700 hover:underline break-all"
                >
                  {session.user.email}
                </Link>
              </h1>
              <p className="text-xs text-gray-500 mt-2 font-mono break-all" title={session.id}>
                ID сессии: {session.id}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500 mt-2 uppercase tracking-wide">ID сессии</p>
              <h1
                className="text-lg sm:text-xl font-semibold mt-0.5 font-mono break-all"
                title={session.id}
              >
                {session.id}
              </h1>
            </>
          )}
          {extraContactLines.length > 0 && (
            <div className="text-sm text-gray-600 mt-3 space-y-0.5">
              {extraContactLines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}
        </div>
        {session.status === "open" && (
          <button
            type="button"
            onClick={closeChat}
            className="text-sm px-3 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
          >
            Закрыть диалог
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-[320px] max-h-[60vh] overflow-y-auto space-y-3">
        {session.messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              m.role === "admin"
                ? "bg-emerald-50 border border-emerald-100 ml-auto"
                : "bg-gray-100 mr-auto"
            }`}
          >
            <p className="text-xs text-gray-500 mb-1">
              {m.role === "admin" ? "Вы" : "Клиент"} ·{" "}
              {new Date(m.createdAt).toLocaleString("ru-RU")}
            </p>
            <p className="whitespace-pre-wrap break-words">{m.body}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {session.status === "open" ? (
        <div className="mt-4 flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Ответ…"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !text.trim()}
            className="self-end px-4 py-2 bg-neutral-900 text-white rounded-lg disabled:opacity-50"
          >
            Отправить
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-gray-600">Диалог закрыт</p>
      )}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from "react";

type Msg = { id: string; role: string; body: string; createdAt: string };

type WidgetConfig = {
  enabled: boolean;
  timezone: string;
  isWithinSchedule: boolean;
  offlineMessage: string;
  welcomeTitle: string;
};

export default function SupportChatWidget() {
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/support/widget-config")
      .then(async (r) => {
        if (!r.ok) return;
        const c = (await r.json()) as WidgetConfig;
        if (
          c &&
          typeof c.enabled === "boolean" &&
          typeof c.isWithinSchedule === "boolean" &&
          typeof c.timezone === "string" &&
          typeof c.welcomeTitle === "string" &&
          typeof c.offlineMessage === "string"
        ) {
          if (!cancelled) setConfig(c);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMessages = useCallback(async (mode: "full" | "poll") => {
    try {
      const url =
        mode === "poll" && lastIdRef.current
          ? `/api/support/messages?afterId=${encodeURIComponent(lastIdRef.current)}`
          : "/api/support/messages";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.disabled) {
        setMessages([]);
        return;
      }
      const raw = data.messages;
      if (!Array.isArray(raw)) return;
      const incoming: Msg[] = raw.filter(
        (m: unknown): m is Msg =>
          !!m &&
          typeof m === "object" &&
          typeof (m as Msg).id === "string" &&
          typeof (m as Msg).body === "string" &&
          typeof (m as Msg).createdAt === "string" &&
          ((m as Msg).role === "visitor" || (m as Msg).role === "admin")
      );
    if (mode === "full") {
      setMessages(incoming);
      lastIdRef.current = incoming.length ? incoming[incoming.length - 1].id : null;
    } else if (incoming.length) {
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const merged = [...prev];
        for (const m of incoming) {
          if (!ids.has(m.id)) merged.push(m);
        }
        lastIdRef.current = merged.length ? merged[merged.length - 1].id : lastIdRef.current;
        return merged;
      });
    }
    } catch {
      /* сеть / JSON — не ломаем UI */
    }
  }, []);

  useEffect(() => {
    if (!open || !config?.enabled) return;
    setLoading(true);
    loadMessages("full").finally(() => setLoading(false));
  }, [open, config?.enabled, loadMessages]);

  useEffect(() => {
    if (!open || !config?.enabled) return;
    const t = setInterval(() => {
      loadMessages("poll");
    }, 5000);
    return () => clearInterval(t);
  }, [open, config?.enabled, loadMessages]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/support/messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Не удалось отправить");
        return;
      }
      setText("");
      if (data.message) {
        setMessages((prev) => {
          const next = [...prev, data.message];
          lastIdRef.current = data.message.id;
          return next;
        });
      }
    } catch {
      setError("Ошибка сети");
    } finally {
      setSending(false);
    }
  };

  if (!config?.enabled) return null;

  const title = config.welcomeTitle || "Поддержка";
  const offlineBanner =
    !config.isWithinSchedule && config.offlineMessage ? (
      <div className="text-xs text-amber-900 bg-amber-50 border-b border-amber-100 px-3 py-2">
        {config.offlineMessage}
      </div>
    ) : null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2 font-sans">
      {open && (
        <div className="w-[min(100vw-2rem,22rem)] h-[min(70vh,26rem)] flex flex-col bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 bg-neutral-900 text-white">
            <span className="text-sm font-medium">{title}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-white/10"
              aria-label="Закрыть"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {offlineBanner}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 bg-gray-50">
            {loading && messages.length === 0 ? (
              <p className="text-sm text-gray-500">Загрузка…</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-gray-600">Напишите нам — ответим в рабочее время.</p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[90%] rounded-lg px-2.5 py-1.5 text-sm ${
                    m.role === "admin"
                      ? "bg-white border border-gray-200 text-gray-900 ml-0 mr-auto"
                      : "bg-neutral-800 text-white ml-auto mr-0"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
          {error && <p className="px-3 text-xs text-red-600">{error}</p>}
          <div className="p-2 border-t border-gray-200 bg-white flex gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Сообщение…"
              rows={2}
              className="flex-1 resize-none text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            />
            <button
              type="button"
              onClick={send}
              disabled={sending || !text.trim()}
              className="shrink-0 self-end px-3 py-2 text-sm rounded-lg bg-neutral-900 text-white disabled:opacity-50"
            >
              Отпр.
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg hover:bg-neutral-800 transition"
        aria-label={open ? "Свернуть чат" : "Открыть чат"}
      >
        {open ? (
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        )}
      </button>
    </div>
  );
}

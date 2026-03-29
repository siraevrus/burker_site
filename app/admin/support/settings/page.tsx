"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
  type DayScheduleRow,
  dayRowsToScheduleJson,
  scheduleJsonToDayRows,
  scheduleRowsHaveWorkingDay,
} from "@/lib/support-schedule";

type Settings = {
  enabled: boolean;
  timezone: string;
  scheduleJson: string;
  offlineMessage: string;
  welcomeTitle: string;
  telegramNotifyOn: string;
};

export default function AdminSupportSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [roundTheClock, setRoundTheClock] = useState(true);
  const [dayRows, setDayRows] = useState<DayScheduleRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/support/settings", { credentials: "include" })
      .then(async (r) => {
        const d = (await r.json()) as { settings?: Settings; error?: string };
        if (!r.ok) {
          if (!cancelled) {
            setLoadError(
              r.status === 401
                ? "Сессия администратора истекла. Войдите снова."
                : d.error || `Ошибка ${r.status}`
            );
          }
          return;
        }
        if (d.settings && !cancelled) {
          setSettings(d.settings);
        } else if (!cancelled) {
          setLoadError("Некорректный ответ сервера");
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError("Не удалось загрузить настройки");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!settings) return;
    const parsed = scheduleJsonToDayRows(settings.scheduleJson);
    setRoundTheClock(parsed.roundTheClock);
    setDayRows(parsed.rows);
  }, [settings?.scheduleJson]);

  const updateDayRow = (day: number, patch: Partial<DayScheduleRow>) => {
    setDayRows((prev) => prev.map((r) => (r.day === day ? { ...r, ...patch } : r)));
  };

  const save = async () => {
    if (!settings) return;
    setSaveError(null);
    setMessage(null);

    if (!scheduleRowsHaveWorkingDay(dayRows, roundTheClock)) {
      setSaveError(
        "Включите хотя бы один рабочий день с временем или отметьте «Круглосуточно»."
      );
      return;
    }

    const scheduleJson = dayRowsToScheduleJson(dayRows, roundTheClock);

    setSaving(true);
    try {
      const res = await fetch("/api/admin/support/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, scheduleJson }),
      });
      if (res.ok) {
        const d = await res.json();
        setSettings(d.settings);
        setMessage("Сохранено");
      } else {
        setSaveError("Ошибка сохранения");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Загрузка…</p>
      </div>
    );
  }

  if (loadError || !settings) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <p className="text-red-700 mb-4">{loadError || "Нет данных"}</p>
        <Link href="/admin/login" className="text-blue-600 underline">
          Страница входа
        </Link>
        {" · "}
        <Link href="/admin/support" className="text-blue-600 underline">
          К чату поддержки
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link href="/admin/support" className="text-sm text-blue-600 hover:underline">
        ← Чат поддержки
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-6">Настройки виджета чата</h1>

      <div className="space-y-4 bg-white border border-gray-200 rounded-lg p-6">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
          />
          <span>Виджет включён</span>
        </label>

        <div>
          <label className="block text-sm font-medium mb-1">Заголовок</label>
          <input
            type="text"
            value={settings.welcomeTitle}
            onChange={(e) => setSettings({ ...settings, welcomeTitle: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Часовой пояс (IANA)</label>
          <input
            type="text"
            value={settings.timezone}
            onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            placeholder="Europe/Moscow"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Расписание</label>
          <p className="text-xs text-gray-600 mb-3">
            Время «начало — конец» в выбранном часовом поясе. Если отмечено круглосуточно, проверка
            графика не применяется.
          </p>

          <label className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              checked={roundTheClock}
              onChange={(e) => setRoundTheClock(e.target.checked)}
            />
            <span>Круглосуточно (без ограничения по времени)</span>
          </label>

          {!roundTheClock && (
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 font-medium">День</th>
                    <th className="text-left px-3 py-2 font-medium w-28">Начало</th>
                    <th className="text-left px-3 py-2 font-medium w-28">Конец</th>
                    <th className="text-left px-3 py-2 font-medium">Выходной</th>
                  </tr>
                </thead>
                <tbody>
                  {WEEKDAY_ORDER.map((day) => {
                    const row = dayRows.find((r) => r.day === day);
                    if (!row) return null;
                    return (
                      <tr key={day} className="border-b border-gray-100 last:border-0">
                        <td className="px-3 py-2 align-middle">{WEEKDAY_LABELS[day]}</td>
                        <td className="px-3 py-2 align-middle">
                          <input
                            type="time"
                            value={row.start}
                            disabled={row.closed}
                            onChange={(e) => updateDayRow(day, { start: e.target.value })}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm disabled:opacity-50"
                          />
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <input
                            type="time"
                            value={row.end}
                            disabled={row.closed}
                            onChange={(e) => updateDayRow(day, { end: e.target.value })}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm disabled:opacity-50"
                          />
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={row.closed}
                              onChange={(e) => updateDayRow(day, { closed: e.target.checked })}
                            />
                            <span className="text-gray-600">не работаем</span>
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Текст вне графика</label>
          <textarea
            value={settings.offlineMessage}
            onChange={(e) => setSettings({ ...settings, offlineMessage: e.target.value })}
            rows={2}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Telegram</label>
          <select
            value={settings.telegramNotifyOn}
            onChange={(e) =>
              setSettings({ ...settings, telegramNotifyOn: e.target.value })
            }
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="every_visitor">Каждое сообщение посетителя</option>
            <option value="first_message_only">Только первое сообщение в диалоге</option>
          </select>
        </div>

        {saveError && <p className="text-sm text-red-700">{saveError}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-neutral-900 text-white rounded-md disabled:opacity-50"
        >
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
      </div>
    </div>
  );
}

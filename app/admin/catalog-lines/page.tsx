"use client";

import { useState, useEffect, useCallback } from "react";

type CatalogLineRow = {
  id: string;
  kind: string;
  subcategory: string;
  slug: string;
  sortOrder: number;
  enabled: boolean;
  showOnHome: boolean;
  publishedAt: string | null;
};

export default function AdminCatalogLinesPage() {
  const [lines, setLines] = useState<CatalogLineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [draft, setDraft] = useState({
    kind: "watches" as "watches" | "jewelry",
    subcategory: "",
    slug: "",
    sortOrder: 0,
    enabled: true,
    showOnHome: false,
    publish: false,
  });

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/catalog-lines");
      if (!res.ok) {
        setError("Не удалось загрузить");
        return;
      }
      const data = await res.json();
      setLines(data.lines || []);
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patchLine = async (id: string, body: Record<string, unknown>) => {
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/catalog-lines/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Ошибка сохранения");
        return;
      }
      await load();
    } catch {
      setError("Ошибка сети");
    } finally {
      setSavingId(null);
    }
  };

  const deleteLine = async (id: string) => {
    if (!confirm("Удалить линию каталога? Ссылки на товары могут перестать работать, если нет другого соответствия.")) {
      return;
    }
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/catalog-lines/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Ошибка удаления");
        return;
      }
      await load();
    } catch {
      setError("Ошибка сети");
    } finally {
      setSavingId(null);
    }
  };

  const createLine = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingId("new");
    setError(null);
    try {
      const res = await fetch("/api/admin/catalog-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Ошибка создания");
        return;
      }
      setDraft({
        kind: "watches",
        subcategory: "",
        slug: "",
        sortOrder: 0,
        enabled: true,
        showOnHome: false,
        publish: false,
      });
      await load();
    } catch {
      setError("Ошибка сети");
    } finally {
      setSavingId(null);
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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-2">Линии каталога (бренды / подкатегории)</h1>
      <p className="text-gray-600 mb-6 text-sm">
        Поле subcategory должно совпадать с импортом товаров. Slug — сегмент URL; после публикации линии его
        менять нельзя.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-md text-sm">{error}</div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6 mb-8 border border-gray-100">
        <h2 className="text-lg font-semibold mb-4">Новая линия</h2>
        <form onSubmit={createLine} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span>Тип</span>
            <select
              className="border rounded px-2 py-2"
              value={draft.kind}
              onChange={(e) =>
                setDraft((d) => ({ ...d, kind: e.target.value as "watches" | "jewelry" }))
              }
            >
              <option value="watches">Часы</option>
              <option value="jewelry">Украшения</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Subcategory (как в товаре)</span>
            <input
              className="border rounded px-2 py-2"
              value={draft.subcategory}
              onChange={(e) => setDraft((d) => ({ ...d, subcategory: e.target.value }))}
              placeholder="Например Macy Petite"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Slug URL (латиница, дефисы)</span>
            <input
              className="border rounded px-2 py-2"
              value={draft.slug}
              onChange={(e) =>
                setDraft((d) => ({ ...d, slug: e.target.value.toLowerCase() }))
              }
              placeholder="macy-petite"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Порядок</span>
            <input
              type="number"
              className="border rounded px-2 py-2"
              value={draft.sortOrder}
              onChange={(e) =>
                setDraft((d) => ({ ...d, sortOrder: parseInt(e.target.value, 10) || 0 }))
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
            />
            В меню и выдаче
          </label>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={draft.showOnHome}
              onChange={(e) => setDraft((d) => ({ ...d, showOnHome: e.target.checked }))}
            />
            Участвует во вкладках на главной (часы)
          </label>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={draft.publish}
              onChange={(e) => setDraft((d) => ({ ...d, publish: e.target.checked }))}
            />
            Сразу опубликовать (зафиксировать slug)
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={savingId === "new"}
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {savingId === "new" ? "Создание…" : "Создать"}
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto border rounded-lg bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left border-b">
              <th className="p-2">Тип</th>
              <th className="p-2">Subcategory</th>
              <th className="p-2">Slug</th>
              <th className="p-2">Порядок</th>
              <th className="p-2">Меню</th>
              <th className="p-2">Главная</th>
              <th className="p-2">Публикация</th>
              <th className="p-2">Действия</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <LineRow
                key={line.id}
                line={line}
                saving={savingId === line.id}
                onPatch={patchLine}
                onDelete={deleteLine}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LineRow({
  line,
  saving,
  onPatch,
  onDelete,
}: {
  line: CatalogLineRow;
  saving: boolean;
  onPatch: (id: string, body: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}) {
  const [slugEdit, setSlugEdit] = useState(line.slug);
  const [sortEdit, setSortEdit] = useState(String(line.sortOrder));
  const published = Boolean(line.publishedAt);

  useEffect(() => {
    setSlugEdit(line.slug);
    setSortEdit(String(line.sortOrder));
  }, [line.slug, line.sortOrder]);

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/80">
      <td className="p-2 whitespace-nowrap">{line.kind}</td>
      <td className="p-2">{line.subcategory}</td>
      <td className="p-2">
        {published ? (
          <span className="font-mono text-xs bg-gray-100 px-1 rounded">{line.slug}</span>
        ) : (
          <input
            className="border rounded px-1 py-0.5 w-36 font-mono text-xs"
            value={slugEdit}
            onChange={(e) => setSlugEdit(e.target.value.toLowerCase())}
          />
        )}
      </td>
      <td className="p-2">
        <input
          type="number"
          className="border rounded w-20 px-1 py-0.5"
          value={sortEdit}
          onChange={(e) => setSortEdit(e.target.value)}
          onBlur={() =>
            onPatch(line.id, { sortOrder: parseInt(sortEdit, 10) || 0 })
          }
        />
      </td>
      <td className="p-2">
        <input
          type="checkbox"
          checked={line.enabled}
          disabled={saving}
          onChange={(e) => onPatch(line.id, { enabled: e.target.checked })}
        />
      </td>
      <td className="p-2">
        <input
          type="checkbox"
          checked={line.showOnHome}
          disabled={saving || line.kind !== "watches"}
          onChange={(e) => onPatch(line.id, { showOnHome: e.target.checked })}
        />
      </td>
      <td className="p-2 text-xs">
        {published ? (
          <span className="text-green-700">зафиксирован</span>
        ) : (
          <button
            type="button"
            className="text-blue-700 underline"
            disabled={saving}
            onClick={() => {
              if (confirm("Опубликовать линию? После этого slug изменить будет нельзя.")) {
                onPatch(line.id, { publish: true });
              }
            }}
          >
            Опубликовать
          </button>
        )}
      </td>
      <td className="p-2 whitespace-nowrap">
        {!published && (
          <button
            type="button"
            className="text-sm text-blue-700 mr-2"
            disabled={saving || slugEdit === line.slug}
            onClick={() => onPatch(line.id, { slug: slugEdit })}
          >
            Сохранить slug
          </button>
        )}
        <button
          type="button"
          className="text-sm text-red-600"
          disabled={saving}
          onClick={() => onDelete(line.id)}
        >
          Удалить
        </button>
      </td>
    </tr>
  );
}

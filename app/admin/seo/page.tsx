"use client";

import { useState, useEffect } from "react";

const DEFAULT_PATHS = [
  { path: "/", label: "Главная" },
  { path: "/contact", label: "Контакты" },
  { path: "/cart", label: "Корзина" },
  { path: "/checkout", label: "Оформление заказа" },
  { path: "/sale", label: "Распродажа" },
  { path: "/privacy", label: "Политика конфиденциальности" },
  { path: "/terms", label: "Условия использования" },
  { path: "/orders", label: "Мои заказы" },
  { path: "/login", label: "Вход" },
  { path: "/register", label: "Регистрация" },
  { path: "/search", label: "Поиск" },
  { path: "/collections/watches", label: "Коллекция — Часы" },
  { path: "/collections/jewelry", label: "Коллекция — Украшения" },
];

interface SeoRow {
  id: string;
  path: string;
  title: string;
  description: string | null;
}

export default function AdminSeoPage() {
  const [seoList, setSeoList] = useState<SeoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPath, setSavingPath] = useState<string | null>(null);
  const [customPath, setCustomPath] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [extraPaths, setExtraPaths] = useState<{ path: string; label: string }[]>([]);

  const loadSeo = async () => {
    try {
      const res = await fetch("/api/admin/seo", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSeoList(data.seo || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSeo();
  }, []);

  const getRow = (path: string) =>
    seoList.find((r) => r.path === path) ?? null;

  const handleSave = async (
    path: string,
    title: string,
    description: string
  ) => {
    if (!title.trim()) {
      alert("Укажите заголовок (title)");
      return;
    }
    setSavingPath(path);
    try {
      const res = await fetch("/api/admin/seo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          path,
          title: title.trim(),
          description: description.trim() || null,
        }),
      });
      if (res.ok) {
        await loadSeo();
      } else {
        const data = await res.json();
        alert(data.error || "Ошибка сохранения");
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка сохранения");
    } finally {
      setSavingPath(null);
    }
  };

  const paths = [...DEFAULT_PATHS, ...extraPaths];
  seoList.forEach((r) => {
    if (!paths.some((p) => p.path === r.path)) {
      paths.push({ path: r.path, label: r.path });
    }
  });
  paths.sort((a, b) => a.path.localeCompare(b.path));

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">SEO — Title и Description</h1>
      <p className="text-gray-600 mb-6">
        Укажите заголовок и описание для выбранных страниц. Они подставятся в
        meta title и meta description на сайте.
      </p>

      <div className="space-y-6">
        {paths.map(({ path, label }) => (
          <SeoCard
            key={path}
            path={path}
            label={label}
            initial={getRow(path)}
            onSave={handleSave}
            saving={savingPath === path}
          />
        ))}
      </div>

      {showAddForm ? (
        <div className="mt-8 bg-white rounded-lg border p-4">
          <h2 className="font-semibold mb-3">Добавить свою страницу</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Путь (path)</label>
              <input
                type="text"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="/my-page"
                className="px-3 py-2 border border-gray-300 rounded-md w-64"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const raw = customPath.trim().replace(/^\/+/, "");
                const p = raw ? `/${raw}` : "/";
                if (!paths.some((x) => x.path === p)) {
                  setExtraPaths((prev) => [...prev, { path: p, label: p }]);
                  setCustomPath("");
                  setShowAddForm(false);
                }
              }}
              className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700"
            >
              Добавить
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="mt-8 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          + Добавить страницу по пути
        </button>
      )}
    </div>
  );
}

function SeoCard({
  path,
  label,
  initial,
  onSave,
  saving,
}: {
  path: string;
  label: string;
  initial: SeoRow | null;
  onSave: (path: string, title: string, description: string) => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");

  useEffect(() => {
    setTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");
  }, [initial?.path, initial?.title, initial?.description]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-sm text-gray-500">{path}</span>
        {label !== path && (
          <span className="text-sm text-gray-400">— {label}</span>
        )}
      </div>
      <div className="grid gap-3 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Заголовок страницы для поисковиков"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Краткое описание страницы (meta description)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={2}
          />
        </div>
        <button
          type="button"
          onClick={() => onSave(path, title, description)}
          disabled={saving}
          className="w-fit px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
      </div>
    </div>
  );
}

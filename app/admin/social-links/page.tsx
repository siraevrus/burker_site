"use client";

import { useState, useEffect } from "react";

interface SocialLink {
  id: string;
  name: string;
  url: string;
  order: number;
}

export default function AdminSocialLinksPage() {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLink, setEditingLink] = useState<SocialLink | null>(null);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [draggedLinkId, setDraggedLinkId] = useState<string | null>(null);
  const [dragOverLinkId, setDragOverLinkId] = useState<string | null>(null);

  const loadLinks = async () => {
    try {
      const res = await fetch("/api/social-links", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links || []);
      }
    } catch (e) {
      console.error("Error loading social links:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLinks();
  }, []);

  const handleSave = async (link: SocialLink) => {
    try {
      const method = isAddingLink ? "POST" : "PUT";
      const res = await fetch("/api/social-links", {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(link),
      });
      if (res.ok) {
        await loadLinks();
        setEditingLink(null);
        setIsAddingLink(false);
      } else {
        const err = await res.json();
        alert(err.error || "Ошибка при сохранении");
      }
    } catch (e) {
      console.error("Error saving:", e);
      alert("Ошибка при сохранении");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить эту ссылку?")) return;
    try {
      const res = await fetch(`/api/social-links?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) await loadLinks();
      else alert("Ошибка при удалении");
    } catch (e) {
      console.error("Error deleting:", e);
      alert("Ошибка при удалении");
    }
  };

  const handleReorder = async (newLinks: SocialLink[]) => {
    try {
      const res = await fetch("/api/social-links/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ linkIds: newLinks.map((l) => l.id) }),
      });
      if (!res.ok) {
        await loadLinks();
        alert("Ошибка при сохранении порядка");
      }
    } catch (e) {
      console.error("Error reordering:", e);
      await loadLinks();
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Социальные сети</h1>
        <button
          type="button"
          onClick={() => {
            setEditingLink(null);
            setIsAddingLink(true);
          }}
          className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700"
        >
          Добавить
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        Ссылки отображаются в блоке «Социальные сети» в футере сайта.
      </p>

      {/* Форма добавления/редактирования */}
      {(isAddingLink || editingLink) && (
        <SocialLinkForm
          link={editingLink}
          onSave={handleSave}
          onCancel={() => {
            setEditingLink(null);
            setIsAddingLink(false);
          }}
          isNew={isAddingLink}
        />
      )}

      {/* Список ссылок */}
      {links.length === 0 && !isAddingLink ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          Нет добавленных ссылок. Нажмите «Добавить», чтобы добавить первую.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Название</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ссылка</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr
                  key={link.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggedLinkId(link.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedLinkId && draggedLinkId !== link.id) setDragOverLinkId(link.id);
                  }}
                  onDragLeave={() => setDragOverLinkId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverLinkId(null);
                    if (!draggedLinkId || draggedLinkId === link.id) {
                      setDraggedLinkId(null);
                      return;
                    }
                    const from = links.findIndex((l) => l.id === draggedLinkId);
                    const to = links.findIndex((l) => l.id === link.id);
                    if (from === -1 || to === -1) {
                      setDraggedLinkId(null);
                      return;
                    }
                    const newLinks = [...links];
                    const [moved] = newLinks.splice(from, 1);
                    newLinks.splice(to, 0, moved);
                    setLinks(newLinks);
                    handleReorder(newLinks);
                    setDraggedLinkId(null);
                  }}
                  onDragEnd={() => {
                    setDraggedLinkId(null);
                    setDragOverLinkId(null);
                  }}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${
                    draggedLinkId === link.id ? "opacity-50" : ""
                  } ${dragOverLinkId === link.id ? "bg-blue-50" : ""}`}
                >
                  <td className="px-4 py-3">
                    <span className="text-gray-400 cursor-move mr-2">⋮⋮</span>
                    {link.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-xs" title={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {link.url}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLink(link);
                          setIsAddingLink(false);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(link.id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SocialLinkForm({
  link,
  onSave,
  onCancel,
  isNew,
}: {
  link: SocialLink | null;
  onSave: (link: SocialLink) => void;
  onCancel: () => void;
  isNew: boolean;
}) {
  const [name, setName] = useState(link?.name ?? "");
  const [url, setUrl] = useState(link?.url ?? "");

  useEffect(() => {
    if (link) {
      setName(link.name);
      setUrl(link.url);
    } else {
      setName("");
      setUrl("");
    }
  }, [link]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      alert("Заполните название и ссылку");
      return;
    }
    onSave({
      id: link?.id ?? "",
      name: name.trim(),
      url: url.trim(),
      order: link?.order ?? 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg mb-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Например: Telegram, Instagram, VK"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ссылка</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="https://..."
          required
        />
      </div>
      <div className="flex gap-4">
        <button type="submit" className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700">
          {isNew ? "Добавить" : "Сохранить"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}

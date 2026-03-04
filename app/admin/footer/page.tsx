"use client";

import { useState, useEffect } from "react";

interface SocialLink {
  id: string;
  name: string;
  url: string;
  order: number;
}

export default function AdminFooterPage() {
  const [customerServiceTitle, setCustomerServiceTitle] = useState("");
  const [policiesTitle, setPoliciesTitle] = useState("");
  const [socialTitle, setSocialTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [editingLink, setEditingLink] = useState<SocialLink | null>(null);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [draggedLinkId, setDraggedLinkId] = useState<string | null>(null);
  const [dragOverLinkId, setDragOverLinkId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [footerResponse, linksResponse] = await Promise.all([
          fetch("/api/admin/footer"),
          fetch("/api/social-links"),
        ]);

        if (footerResponse.ok) {
          const data = await footerResponse.json();
          setCustomerServiceTitle(data.customerServiceTitle ?? "");
          setPoliciesTitle(data.policiesTitle ?? "");
          setSocialTitle(data.socialTitle ?? "");
        }

        if (linksResponse.ok) {
          const linksData = await linksResponse.json();
          setSocialLinks(linksData.links || []);
        }
      } catch (error) {
        console.error("Error loading footer settings:", error);
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
      const response = await fetch("/api/admin/footer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerServiceTitle: customerServiceTitle.trim(),
          policiesTitle: policiesTitle.trim(),
          socialTitle: socialTitle.trim(),
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
      console.error("Error saving footer:", error);
      alert("Ошибка при сохранении");
    } finally {
      setIsSaving(false);
    }
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
        <h1 className="text-3xl font-bold">Футер</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-gray-600 mb-6">
          Заголовки блоков в подвале сайта. Пустые поля заменяются значениями по умолчанию.
        </p>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Обслуживание клиентов (заголовок блока)
            </label>
            <input
              type="text"
              value={customerServiceTitle}
              onChange={(e) => setCustomerServiceTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Обслуживание клиентов"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Политики (заголовок блока)
            </label>
            <input
              type="text"
              value={policiesTitle}
              onChange={(e) => setPoliciesTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Политики"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Социальные сети (заголовок блока)
            </label>
            <input
              type="text"
              value={socialTitle}
              onChange={(e) => setSocialTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Социальные сети"
            />
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

      {/* Управление ссылками на социальные сети */}
      <div className="bg-white rounded-lg shadow-sm p-6 mt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold mb-2">Ссылки на социальные сети</h2>
            <p className="text-sm text-gray-600">
              Управление ссылками для блока "Социальные сети" в футере
            </p>
          </div>
          <button
            onClick={() => {
              setEditingLink(null);
              setIsAddingLink(true);
            }}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
          >
            Добавить ссылку
          </button>
        </div>

        {/* Форма добавления/редактирования ссылки */}
        {(isAddingLink || editingLink) && (
          <SocialLinkForm
            link={editingLink}
            onSave={async (link) => {
              try {
                const method = isAddingLink ? "POST" : "PUT";
                const response = await fetch("/api/social-links", {
                  method,
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(link),
                });

                if (response.ok) {
                  const linksResponse = await fetch("/api/social-links");
                  if (linksResponse.ok) {
                    const linksData = await linksResponse.json();
                    setSocialLinks(linksData.links || []);
                  }
                  setEditingLink(null);
                  setIsAddingLink(false);
                } else {
                  const error = await response.json();
                  alert(error.error || "Ошибка при сохранении ссылки");
                }
              } catch (error) {
                console.error("Error saving social link:", error);
                alert("Ошибка при сохранении ссылки");
              }
            }}
            onCancel={() => {
              setEditingLink(null);
              setIsAddingLink(false);
            }}
            isNew={isAddingLink}
          />
        )}

        {/* Список ссылок */}
        {socialLinks.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">Нет добавленных ссылок</p>
        ) : (
          <div className="space-y-2">
            {socialLinks.map((link) => (
              <div
                key={link.id}
                draggable
                onDragStart={(e) => {
                  setDraggedLinkId(link.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggedLinkId && draggedLinkId !== link.id) {
                    setDragOverLinkId(link.id);
                  }
                }}
                onDragLeave={() => setDragOverLinkId(null)}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragOverLinkId(null);

                  if (!draggedLinkId || draggedLinkId === link.id) {
                    setDraggedLinkId(null);
                    return;
                  }

                  const draggedIndex = socialLinks.findIndex((l) => l.id === draggedLinkId);
                  const targetIndex = socialLinks.findIndex((l) => l.id === link.id);

                  if (draggedIndex === -1 || targetIndex === -1) {
                    setDraggedLinkId(null);
                    return;
                  }

                  const newLinks = [...socialLinks];
                  const [draggedLink] = newLinks.splice(draggedIndex, 1);
                  newLinks.splice(targetIndex, 0, draggedLink);
                  setSocialLinks(newLinks);

                  try {
                    const linkIds = newLinks.map((l) => l.id);
                    const response = await fetch("/api/social-links/reorder", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ linkIds }),
                    });

                    if (!response.ok) {
                      const linksResponse = await fetch("/api/social-links");
                      if (linksResponse.ok) {
                        const linksData = await linksResponse.json();
                        setSocialLinks(linksData.links || []);
                      }
                      alert("Ошибка при сохранении порядка ссылок");
                    }
                  } catch (error) {
                    console.error("Error reordering links:", error);
                    const linksResponse = await fetch("/api/social-links");
                    if (linksResponse.ok) {
                      const linksData = await linksResponse.json();
                      setSocialLinks(linksData.links || []);
                    }
                    alert("Ошибка при сохранении порядка ссылок");
                  }

                  setDraggedLinkId(null);
                }}
                onDragEnd={() => {
                  setDraggedLinkId(null);
                  setDragOverLinkId(null);
                }}
                className={`flex items-center gap-4 p-3 border rounded-md hover:bg-gray-50 cursor-move ${
                  draggedLinkId === link.id ? "opacity-50" : ""
                } ${
                  dragOverLinkId === link.id ? "border-blue-500 border-2" : "border-gray-200"
                }`}
              >
                <div className="text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M7 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM7 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM7 14a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM13 14a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium">{link.name}</div>
                  <div className="text-sm text-gray-500">{link.url}</div>
                </div>
                <button
                  onClick={() => {
                    setEditingLink(link);
                    setIsAddingLink(false);
                  }}
                  className="text-blue-600 hover:text-blue-900 text-sm"
                >
                  Редактировать
                </button>
                <button
                  onClick={async () => {
                    if (confirm("Вы уверены, что хотите удалить эту ссылку?")) {
                      try {
                        const response = await fetch(`/api/social-links?id=${link.id}`, {
                          method: "DELETE",
                        });

                        if (response.ok) {
                          const linksResponse = await fetch("/api/social-links");
                          if (linksResponse.ok) {
                            const linksData = await linksResponse.json();
                            setSocialLinks(linksData.links || []);
                          }
                        } else {
                          alert("Ошибка при удалении ссылки");
                        }
                      } catch (error) {
                        console.error("Error deleting link:", error);
                        alert("Ошибка при удалении ссылки");
                      }
                    }
                  }}
                  className="text-red-600 hover:text-red-900 text-sm"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Компонент формы для добавления/редактирования ссылки
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
  const [formData, setFormData] = useState<SocialLink>(
    link || {
      id: "",
      name: "",
      url: "",
      order: 0,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.url.trim()) {
      alert("Заполните все поля");
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-md mb-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Название
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Например: Фейсбук, Инстаграм, Ютуб"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          URL
        </label>
        <input
          type="url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="https://..."
          required
        />
      </div>
      <div className="flex gap-4">
        <button
          type="submit"
          className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
        >
          {isNew ? "Добавить" : "Сохранить"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}

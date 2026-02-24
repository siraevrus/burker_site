"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Page } from "@/lib/types";

// Динамический импорт TinyMCE (только на клиенте)
const Editor = dynamic(() => import("@tinymce/tinymce-react").then((mod) => mod.Editor), {
  ssr: false,
  loading: () => (
    <div className="h-96 border border-gray-300 rounded-md flex items-center justify-center bg-white">
      <div className="text-gray-600">Загрузка редактора...</div>
    </div>
  ),
});

export default function AdminPages() {
  const [pages, setPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      const response = await fetch("/api/pages");
      if (response.ok) {
        const data = await response.json();
        setPages(data.pages || []);
      }
    } catch (error) {
      console.error("Error loading pages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Вы уверены, что хотите удалить эту страницу?")) {
      try {
        const response = await fetch(`/api/pages?id=${id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          await loadPages();
        } else {
          alert("Ошибка при удалении страницы");
        }
      } catch (error) {
        console.error("Error deleting page:", error);
        alert("Ошибка при удалении страницы");
      }
    }
  };

  const handleEdit = (page: Page) => {
    setEditingPage(page);
    setIsAddingNew(false);
  };

  const handleAddNew = () => {
    setEditingPage(null);
    setIsAddingNew(true);
  };

  const handleSave = async (page: Page) => {
    try {
      const method = isAddingNew ? "POST" : "PUT";
      const response = await fetch("/api/pages", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(page),
      });

      if (response.ok) {
        await loadPages();
        setEditingPage(null);
        setIsAddingNew(false);
      } else {
        const error = await response.json();
        alert(`Ошибка при сохранении страницы: ${error.error || "Неизвестная ошибка"}`);
      }
    } catch (error) {
      console.error("Error saving page:", error);
      alert("Ошибка при сохранении страницы");
    }
  };

  const handleCancel = () => {
    setEditingPage(null);
    setIsAddingNew(false);
  };

  const getCategoryLabel = (category?: string) => {
    if (!category) return "—";
    return category === "customer-service" ? "Обслуживание клиентов" : "Политики";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Управление страницами</h1>
        <button
          onClick={handleAddNew}
          className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
        >
          Добавить страницу
        </button>
      </div>

      {/* Форма добавления/редактирования */}
      {(isAddingNew || editingPage) && (
        <PageForm
          page={editingPage}
          onSave={handleSave}
          onCancel={handleCancel}
          isNew={isAddingNew}
        />
      )}

      {/* Список страниц */}
      {isLoading ? (
        <div className="text-center py-8">Загрузка страниц...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Название
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Категория
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pages.map((page) => (
                <tr key={page.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {page.title}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">/{page.slug}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {getCategoryLabel(page.category)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        page.published
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {page.published ? "Опубликовано" : "Черновик"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      href={`/${page.slug}`}
                      target="_blank"
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Просмотр
                    </Link>
                    <button
                      onClick={() => handleEdit(page)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDelete(page.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pages.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Нет добавленных страниц
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Компонент формы для добавления/редактирования страницы
function PageForm({
  page,
  onSave,
  onCancel,
  isNew,
}: {
  page: Page | null;
  onSave: (page: Page) => void;
  onCancel: () => void;
  isNew: boolean;
}) {
  const [formData, setFormData] = useState<Page>(
    page || {
      id: "",
      title: "",
      slug: "",
      content: "",
      category: undefined,
      published: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNew) {
      formData.id = Date.now().toString();
      if (!formData.slug) {
        formData.slug = formData.title
          .toLowerCase()
          .replace(/[^a-z0-9а-яё]+/g, "-")
          .replace(/(^-|-$)/g, "");
      }
    }
    // Убеждаемся, что category корректно обработан
    const pageToSave = {
      ...formData,
      category: formData.category || undefined,
    };
    onSave(pageToSave);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-8 relative z-10">
      <h2 className="text-2xl font-bold mb-6">
        {isNew ? "Добавить страницу" : "Редактировать страницу"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название страницы
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL (slug)
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
              placeholder="about-us"
            />
            <p className="text-xs text-gray-500 mt-1">
              Страница будет доступна по адресу /{formData.slug} (после включения «Опубликовать страницу»)
            </p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Категория
          </label>
          <select
            value={formData.category || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                category: e.target.value === "" ? undefined : (e.target.value as "customer-service" | "policies"),
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">— Не выбрано —</option>
            <option value="customer-service">Обслуживание клиентов</option>
            <option value="policies">Политики</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Выберите категорию для отображения страницы в соответствующем разделе футера
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Содержимое страницы
          </label>
          <div className="border border-gray-300 rounded-md relative z-0">
            <Editor
              tinymceScriptSrc="/tinymce/tinymce.min.js"
              licenseKey="gpl"
              value={formData.content}
              onEditorChange={(content) =>
                setFormData({ ...formData, content })
              }
              init={{
                height: 500,
                menubar: true,
                plugins: [
                  "advlist", "autolink", "lists", "link", "image", "charmap", "preview",
                  "anchor", "searchreplace", "visualblocks", "code", "fullscreen",
                  "insertdatetime", "media", "table", "code", "help", "wordcount"
                ],
                toolbar: "undo redo | blocks | " +
                  "bold italic forecolor | alignleft aligncenter " +
                  "alignright alignjustify | bullist numlist outdent indent | " +
                  "removeformat | link image | code | help",
                content_style: "body { font-family: Arial, sans-serif; font-size: 14px; }",
                branding: false,
                promotion: false,
                resize: true,
              }}
            />
          </div>
        </div>
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.published}
              onChange={(e) =>
                setFormData({ ...formData, published: e.target.checked })
              }
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">
              Опубликовать страницу
            </span>
          </label>
        </div>
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800"
          >
            Сохранить
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}

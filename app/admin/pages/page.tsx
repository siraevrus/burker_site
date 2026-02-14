"use client";

import { useState } from "react";
import Link from "next/link";

interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  published: boolean;
}

export default function AdminPages() {
  const [pages, setPages] = useState<Page[]>([
    {
      id: "1",
      title: "О нас",
      slug: "about",
      content: "<p>Информация о компании...</p>",
      published: true,
    },
  ]);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const handleDelete = (id: string) => {
    if (confirm("Вы уверены, что хотите удалить эту страницу?")) {
      setPages(pages.filter((p) => p.id !== id));
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

  const handleSave = (page: Page) => {
    if (isAddingNew) {
      setPages([...pages, page]);
      setIsAddingNew(false);
    } else {
      setPages(pages.map((p) => (p.id === page.id ? page : p)));
      setEditingPage(null);
    }
  };

  const handleCancel = () => {
    setEditingPage(null);
    setIsAddingNew(false);
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
      </div>
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
      published: false,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNew) {
      formData.id = Date.now().toString();
      formData.slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }
    onSave(formData);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
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
              Страница будет доступна по адресу /{formData.slug}
            </p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Содержимое страницы
          </label>
          <textarea
            value={formData.content}
            onChange={(e) =>
              setFormData({ ...formData, content: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={10}
            required
            placeholder="Введите HTML или текст содержимого страницы..."
          />
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

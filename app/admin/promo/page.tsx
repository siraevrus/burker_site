"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { PromoBanner } from "@/lib/types";

export default function AdminPromoPage() {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [editingBanner, setEditingBanner] = useState<PromoBanner | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  useEffect(() => {
    const loadBanners = async () => {
      try {
        const response = await fetch("/api/promo-banners");
        if (response.ok) {
          const data = await response.json();
          setBanners(data.banners || []);
        }
      } catch (error) {
        console.error("Error loading banners:", error);
      }
    };
    loadBanners();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm("Вы уверены, что хотите удалить этот баннер?")) {
      const updated = banners.filter((b) => b.id !== id);
      setBanners(updated);
      try {
        const response = await fetch("/api/promo-banners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ banners: updated }),
        });
        if (!response.ok) {
          throw new Error("Ошибка при сохранении");
        }
      } catch (error) {
        console.error("Error saving banners:", error);
        alert("Ошибка при сохранении. Попробуйте еще раз.");
      }
    }
  };

  const handleEdit = (banner: PromoBanner) => {
    setEditingBanner(banner);
    setIsAddingNew(false);
  };

  const handleAddNew = () => {
    setEditingBanner(null);
    setIsAddingNew(true);
  };

  const handleSave = async (banner: PromoBanner) => {
    let updated: PromoBanner[];
    if (isAddingNew) {
      updated = [...banners, banner];
    } else {
      updated = banners.map((b) => (b.id === banner.id ? banner : b));
    }
    setBanners(updated);
    try {
      const response = await fetch("/api/promo-banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banners: updated }),
      });
      if (!response.ok) {
        throw new Error("Ошибка при сохранении");
      }
      setEditingBanner(null);
      setIsAddingNew(false);
    } catch (error) {
      console.error("Error saving banners:", error);
      alert("Ошибка при сохранении. Попробуйте еще раз.");
    }
  };

  const handleCancel = () => {
    setEditingBanner(null);
    setIsAddingNew(false);
  };

  const handleReorder = async (index: number, direction: "up" | "down") => {
    const newBanners = [...banners];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < banners.length) {
      [newBanners[index], newBanners[newIndex]] = [
        newBanners[newIndex],
        newBanners[index],
      ];
      setBanners(newBanners);
      try {
        const response = await fetch("/api/promo-banners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ banners: newBanners }),
        });
        if (!response.ok) {
          throw new Error("Ошибка при сохранении");
        }
      } catch (error) {
        console.error("Error saving banners:", error);
        alert("Ошибка при сохранении. Попробуйте еще раз.");
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Управление промоблоками</h1>
        <button
          onClick={handleAddNew}
          className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
        >
          Добавить баннер
        </button>
      </div>

      {/* Форма добавления/редактирования */}
      {(isAddingNew || editingBanner) && (
        <BannerForm
          banner={editingBanner}
          onSave={handleSave}
          onCancel={handleCancel}
          isNew={isAddingNew}
        />
      )}

      {/* Список баннеров */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            Рекомендуемый размер изображения: ширина любая, высота 500px
          </p>
          <div className="space-y-4">
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                className="border border-gray-200 rounded-lg p-4 flex items-center gap-4"
              >
                <div className="relative w-32 h-32 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                  {banner.image.startsWith("data:image") || banner.image.startsWith('/promo/') ? (
                    <img
                      src={banner.image}
                      alt={banner.title || "Banner"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Image
                      src={banner.image}
                      alt={banner.title || "Banner"}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">
                    {banner.title || "Без названия"}
                  </h3>
                  {banner.subtitle && (
                    <p className="text-sm text-gray-600 mb-2">{banner.subtitle}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    Ссылка: {banner.productLink || "—"}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReorder(index, "up")}
                      disabled={index === 0}
                      className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Переместить вверх"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleReorder(index, "down")}
                      disabled={index === banners.length - 1}
                      className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Переместить вниз"
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    onClick={() => handleEdit(banner)}
                    className="px-4 py-2 text-blue-600 hover:text-blue-900 text-sm"
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={() => handleDelete(banner.id)}
                    className="px-4 py-2 text-red-600 hover:text-red-900 text-sm"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
            {banners.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Нет добавленных баннеров
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Компонент формы для добавления/редактирования баннера
function BannerForm({
  banner,
  onSave,
  onCancel,
  isNew,
}: {
  banner: PromoBanner | null;
  onSave: (banner: PromoBanner) => void;
  onCancel: () => void;
  isNew: boolean;
}) {
  const [formData, setFormData] = useState<PromoBanner>(
    banner || {
      id: "",
      image: "",
      productLink: "",
      title: "",
      subtitle: "",
    }
  );
  const [imagePreview, setImagePreview] = useState<string>("");

  const [isUploading, setIsUploading] = useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Проверяем размер файла (макс 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Файл слишком большой. Максимальный размер: 5MB");
        return;
      }

      // Создаем временный URL для превью
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      // Загружаем файл на сервер
      setIsUploading(true);
      try {
        const uploadFormData = new FormData();
        uploadFormData.append("file", file);

        const response = await fetch("/api/upload-promo", {
          method: "POST",
          credentials: "include",
          body: uploadFormData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const serverError = typeof errorData?.error === "string" ? errorData.error : "Ошибка загрузки файла";
          throw new Error(serverError);
        }

        const data = await response.json();
        setFormData({ ...formData, image: data.filename });
      } catch (error) {
        console.error("Error uploading file:", error);
        alert(error instanceof Error ? error.message : "Ошибка загрузки файла. Попробуйте еще раз.");
        setImagePreview("");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNew) {
      formData.id = Date.now().toString();
    }
    onSave(formData);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
      <h2 className="text-2xl font-bold mb-6">
        {isNew ? "Добавить баннер" : "Редактировать баннер"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Изображение (рекомендуемая высота: 500px)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required={isNew}
            disabled={isUploading}
          />
          {isUploading && (
            <p className="text-sm text-gray-500 mt-2">Загрузка изображения...</p>
          )}
          {imagePreview && (
            <div className="mt-4 relative w-full" style={{ height: "500px" }}>
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-contain border border-gray-300 rounded-md"
              />
            </div>
          )}
          {formData.image && !imagePreview && (
            <div className="mt-4 relative w-full" style={{ height: "500px" }}>
              {formData.image.startsWith("data:image") ? (
                <img
                  src={formData.image}
                  alt="Current"
                  className="w-full h-full object-contain border border-gray-300 rounded-md"
                />
              ) : formData.image.startsWith('/promo/') ? (
                <img
                  src={formData.image}
                  alt="Current"
                  className="w-full h-full object-contain border border-gray-300 rounded-md"
                />
              ) : (
                <Image
                  src={formData.image}
                  alt="Current"
                  fill
                  className="object-contain border border-gray-300 rounded-md"
                />
              )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название (опционально)
            </label>
            <input
              type="text"
              value={formData.title || ""}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="VALENTINE'S SALE"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Подзаголовок (опционально)
            </label>
            <input
              type="text"
              value={formData.subtitle || ""}
              onChange={(e) =>
                setFormData({ ...formData, subtitle: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="ЧАСЫ • УКРАШЕНИЯ"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ссылка на товар/страницу (опционально)
          </label>
          <input
            type="text"
            value={formData.productLink || ""}
            onChange={(e) =>
              setFormData({ ...formData, productLink: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="/sale или /product/id"
          />
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

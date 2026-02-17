"use client";

import { useState } from "react";
import { Product } from "@/lib/types";
import { useRouter } from "next/navigation";

interface AdminProductEditClientProps {
  product: Product;
}

export default function AdminProductEditClient({ product }: AdminProductEditClientProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: product.name,
    collection: product.collection,
    subcategory: product.subcategory || "",
    bestseller: product.bestseller || false,
    price: product.price,
    originalPrice: product.originalPrice,
    inStock: product.inStock,
    disabled: product.disabled || false,
    description: product.description || "",
  });
  const [images, setImages] = useState<string[]>(product.images || []);
  const [uploading, setUploading] = useState(false);

  const handleDeleteImage = (index: number) => {
    if (confirm("Удалить это изображение?")) {
      setImages(images.filter((_, i) => i !== index));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    try {
      // Загружаем все выбранные файлы
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/admin/products/upload-image", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload file");
        }

        const data = await response.json();
        return data.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setImages([...images, ...uploadedUrls]);
      
      // Очищаем input
      e.target.value = "";
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Ошибка при загрузке изображений");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          images: images,
        }),
      });

      if (response.ok) {
        router.push("/admin");
      } else {
        alert("Ошибка при сохранении товара");
      }
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Ошибка при сохранении товара");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Редактирование товара</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Левая колонка - основная информация */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Название</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Коллекция</label>
              <input
                type="text"
                value={formData.collection}
                onChange={(e) => setFormData({ ...formData, collection: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Подкатегория</label>
              <input
                type="text"
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="bestseller"
                checked={formData.bestseller}
                onChange={(e) => setFormData({ ...formData, bestseller: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="bestseller" className="text-sm font-medium">
                Бестселлер
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Цена</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Оригинальная цена</label>
              <input
                type="number"
                step="0.01"
                value={formData.originalPrice}
                onChange={(e) => setFormData({ ...formData, originalPrice: parseFloat(e.target.value) })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="inStock"
                checked={formData.inStock}
                onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="inStock" className="text-sm font-medium">
                В наличии
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="disabled"
                checked={formData.disabled}
                onChange={(e) => setFormData({ ...formData, disabled: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="disabled" className="text-sm font-medium">
                Товар отключен (не отображается на сайте)
              </label>
            </div>
          </div>
          
          {/* Правая колонка - изображения и описание */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-4">Изображения ({images.length})</h3>
              
              {/* Форма загрузки */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Загрузить изображения
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors ${
                      uploading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {uploading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Загрузка...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Выбрать файлы</span>
                      </>
                    )}
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    Можно выбрать несколько изображений
                  </p>
                </div>
              </div>

              {/* Список изображений */}
              {images.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-md p-3">
                  {images.map((img, index) => (
                    <div key={index} className="border-b border-gray-200 pb-2 last:border-b-0">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-gray-500 min-w-[20px]">{index + 1}.</span>
                        <div className="flex-1">
                          <a 
                            href={img} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline break-all block"
                          >
                            {img}
                          </a>
                          {img.startsWith("/products/") && (
                            <img 
                              src={img} 
                              alt={`Preview ${index + 1}`}
                              className="mt-2 max-w-full h-20 object-cover rounded border border-gray-200"
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(index)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          title="Удалить изображение"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Нет изображений</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Описание</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            
            <div className="bg-gray-50 rounded-md p-4 text-sm">
              <h4 className="font-medium mb-2">Информация о товаре</h4>
              <div className="space-y-1 text-gray-700">
                <p><strong>ID:</strong> {product.id}</p>
                {product.bodyId && <p><strong>Body ID:</strong> {product.bodyId}</p>}
                <p><strong>Категория (collection):</strong> {product.collection}</p>
                <p><strong>Подкатегория (subcategory):</strong> {product.subcategory || "—"}</p>
                <p><strong>Вариант:</strong> {product.variant || "—"}</p>
                <p><strong>Бестселлер:</strong> {product.bestseller ? "✓ Да" : "✗ Нет"}</p>
                <p><strong>Скидка:</strong> {product.discount}%</p>
                <p><strong>Цвета:</strong> {product.colors?.join(", ") || "—"}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-4">
          <button
            type="submit"
            className="bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition-colors"
          >
            Сохранить
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="border border-gray-300 px-6 py-3 rounded-md hover:bg-gray-50 transition-colors"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Product } from "@/lib/types";
import Image from "next/image";

export default function AdminPage() {
  const [productList, setProductList] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const loadProducts = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // Таймаут 10 секунд
        
        const response = await fetch("/api/admin/products", {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!cancelled) {
          if (response.ok) {
            const data = await response.json();
            setProductList(data.products || []);
          } else {
            console.error("Error loading products:", response.status, response.statusText);
            const errorData = await response.json().catch(() => ({}));
            console.error("Error details:", errorData);
            // Устанавливаем пустой список, чтобы страница загрузилась
            setProductList([]);
          }
        }
      } catch (error: any) {
        if (!cancelled) {
          if (error.name === 'AbortError') {
            console.error("Request timeout");
          } else {
            console.error("Error loading products:", error);
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    loadProducts();
    
    return () => {
      cancelled = true;
    };
  }, []);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const handleDelete = async (id: string) => {
    if (confirm("Вы уверены, что хотите удалить этот товар?")) {
      try {
        const response = await fetch(`/api/admin/products/${id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          setProductList(productList.filter((p) => p.id !== id));
        } else {
          alert("Ошибка при удалении товара");
        }
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("Ошибка при удалении товара");
      }
    }
  };

  const handleEdit = (product: Product) => {
    window.location.href = `/admin/products/${product.id}`;
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setIsAddingNew(true);
  };

  const handleSave = async (product: Product) => {
    try {
      const response = await fetch("/api/admin/products", {
        method: isAddingNew ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(product),
      });
      if (response.ok) {
        const updatedProduct = await response.json();
        if (isAddingNew) {
          setProductList([...productList, updatedProduct]);
          setIsAddingNew(false);
        } else {
          setProductList(
            productList.map((p) => (p.id === product.id ? updatedProduct : p))
          );
          setEditingProduct(null);
        }
      } else {
        alert("Ошибка при сохранении товара");
      }
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Ошибка при сохранении товара");
    }
  };

  const handleCancel = () => {
    setEditingProduct(null);
    setIsAddingNew(false);
  };

  const handleToggleDisabled = async (product: Product) => {
    try {
      const newDisabled = !product.disabled;
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...product,
          disabled: newDisabled,
        }),
      });
      if (response.ok) {
        const updatedProduct = await response.json();
        setProductList(
          productList.map((p) => (p.id === product.id ? updatedProduct : p))
        );
      } else {
        alert("Ошибка при изменении статуса товара");
      }
    } catch (error) {
      console.error("Error toggling disabled status:", error);
      alert("Ошибка при изменении статуса товара");
    }
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === productList.length && productList.length > 0) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(productList.map((p) => p.id)));
    }
  };

  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedProducts.size === 0) {
      alert("Выберите товары для удаления");
      return;
    }

    const count = selectedProducts.size;
    if (!confirm(`Вы уверены, что хотите удалить ${count} товар(ов)?`)) {
      return;
    }

    try {
      const response = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: Array.from(selectedProducts) }),
      });

      if (response.ok) {
        const result = await response.json();
        setProductList(
          productList.filter((p) => !selectedProducts.has(p.id))
        );
        setSelectedProducts(new Set());
        alert(`Успешно удалено товаров: ${result.deletedCount}`);
      } else {
        const error = await response.json();
        alert(`Ошибка при удалении товаров: ${error.error || "Неизвестная ошибка"}`);
      }
    } catch (error) {
      console.error("Error deleting products:", error);
      alert("Ошибка при удалении товаров");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Управление продуктами</h1>
        <button
          onClick={handleAddNew}
          className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
        >
          Добавить товар
        </button>
      </div>

      {/* Форма добавления/редактирования */}
      {(isAddingNew || editingProduct) && (
        <ProductForm
          product={editingProduct}
          onSave={handleSave}
          onCancel={handleCancel}
          isNew={isAddingNew}
        />
      )}

      {/* Список товаров */}
      {isLoading ? (
        <div className="text-center py-8">Загрузка товаров...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {selectedProducts.size > 0 && (
            <div className="px-6 py-4 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                Выбрано товаров: {selectedProducts.size}
              </span>
              <button
                onClick={handleDeleteSelected}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Удалить выбранные ({selectedProducts.size})
              </button>
            </div>
          )}
          <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                <input
                  type="checkbox"
                  checked={selectedProducts.size === productList.length && productList.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  title="Выделить все"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Изображение
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Название
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Коллекция
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Подкатегория
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Body ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Цена
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Скидка
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Бестселлер
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
            {productList.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedProducts.has(product.id)}
                    onChange={() => handleSelectProduct(product.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="w-16 h-16 relative bg-gray-100 rounded-md overflow-hidden">
                    {product.images && product.images.length > 0 && product.images[0] ? (
                      <Image
                        src={product.images[0].startsWith('http') || product.images[0].startsWith('/') 
                          ? product.images[0] 
                          : `/${product.images[0]}`}
                        alt={product.name}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.png';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        Нет фото
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {product.name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{product.collection}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{product.subcategory || "—"}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600 font-mono">{product.bodyId || "—"}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {product.price.toFixed(0)} ₽
                  </div>
                  {product.originalPrice > product.price && (
                    <div className="text-xs text-gray-500 line-through">
                      {product.originalPrice.toFixed(0)} ₽
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{product.discount}%</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {product.bestseller ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Да
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggleDisabled(product)}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      product.disabled
                        ? "bg-red-100 text-red-800 hover:bg-red-200"
                        : "bg-green-100 text-green-800 hover:bg-green-200"
                    }`}
                  >
                    {product.disabled ? "Отключен" : "Активен"}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(product)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
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
      )}
    </div>
  );
}

// Компонент формы для добавления/редактирования товара
function ProductForm({
  product,
  onSave,
  onCancel,
  isNew,
}: {
  product: Product | null;
  onSave: (product: Product) => void;
  onCancel: () => void;
  isNew: boolean;
}) {
  const [formData, setFormData] = useState<Product>(
    product || {
      id: "",
      name: "",
      collection: "",
      price: 0,
      originalPrice: 0,
      discount: 0,
      colors: [],
      images: [],
      inStock: true,
      disabled: false,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNew) {
      formData.id = formData.name.toLowerCase().replace(/\s+/g, "-");
    }
    onSave(formData);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
      <h2 className="text-2xl font-bold mb-6">
        {isNew ? "Добавить товар" : "Редактировать товар"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Коллекция
            </label>
            <input
              type="text"
              value={formData.collection}
              onChange={(e) =>
                setFormData({ ...formData, collection: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Оригинальная цена (₽)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.originalPrice}
              onChange={(e) => {
                const originalPrice = parseFloat(e.target.value) || 0;
                const discount = formData.originalPrice > 0
                  ? Math.round(
                      ((originalPrice - formData.price) / originalPrice) * 100
                    )
                  : 0;
                setFormData({
                  ...formData,
                  originalPrice,
                  discount: discount > 0 ? discount : formData.discount,
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Цена со скидкой (₽)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => {
                const price = parseFloat(e.target.value) || 0;
                const discount = formData.originalPrice > 0
                  ? Math.round(
                      ((formData.originalPrice - price) / formData.originalPrice) * 100
                    )
                  : 0;
                setFormData({
                  ...formData,
                  price,
                  discount: discount > 0 ? discount : formData.discount,
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Скидка (%)
            </label>
            <input
              type="number"
              value={formData.discount}
              onChange={(e) => {
                const discount = parseInt(e.target.value) || 0;
                const price = formData.originalPrice > 0
                  ? formData.originalPrice * (1 - discount / 100)
                  : formData.price;
                setFormData({
                  ...formData,
                  discount,
                  price,
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Автоматически рассчитывается при изменении цен
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Цвета (через запятую)
            </label>
            <input
              type="text"
              value={formData.colors.join(", ")}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  colors: e.target.value.split(",").map((c) => c.trim()),
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.inStock}
                onChange={(e) =>
                  setFormData({ ...formData, inStock: e.target.checked })
                }
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">
                В наличии
              </span>
            </label>
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.disabled || false}
                onChange={(e) =>
                  setFormData({ ...formData, disabled: e.target.checked })
                }
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">
                Товар отключен (не отображается на сайте)
              </span>
            </label>
          </div>
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

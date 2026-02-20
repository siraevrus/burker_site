"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ImportResult {
  added: number;
  updated: number;
  errors: Array<{ id: string; error: string }>;
  total: number;
}

interface ImportHistoryItem {
  id: string;
  type: "automatic" | "manual" | "file";
  added: number;
  updated: number;
  errors: number;
  total: number;
  createdAt: string;
}

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Загрузка истории импортов
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch("/api/admin/import/history?limit=20");
        const data = await response.json();
        if (data.success) {
          setHistory(data.history);
        }
      } catch (err) {
        console.error("Error loading import history:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadHistory();
  }, []);

  // Обновление истории после успешного импорта
  const refreshHistory = async () => {
    try {
      const response = await fetch("/api/admin/import/history?limit=20");
      const data = await response.json();
      if (data.success) {
        setHistory(data.history);
      }
    } catch (err) {
      console.error("Error refreshing import history:", err);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/json" || droppedFile.name.endsWith(".json")) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError("Пожалуйста, загрузите JSON файл");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/json" || selectedFile.name.endsWith(".json")) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError("Пожалуйста, выберите JSON файл");
      }
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError("Пожалуйста, выберите файл для импорта");
      return;
    }

    setIsImporting(true);
    setError(null);
    setResult(null);

    try {
      // Чтение файла
      const text = await file.text();
      const jsonData = JSON.parse(text);

      // Отправка на сервер
      const response = await fetch("/api/admin/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jsonData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка при импорте");
      }

      setResult(data.result);
      // Обновляем историю после успешного импорта
      await refreshHistory();
    } catch (err: any) {
      setError(err.message || "Ошибка при импорте товаров");
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadAndImport = async () => {
    setIsDownloading(true);
    setError(null);
    setResult(null);

    try {
      // Вызов API для автоматического скачивания и импорта
      const response = await fetch("/api/admin/import/auto", {
        method: "GET",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка при скачивании и импорте");
      }

      setResult(data.result);
      // Обновляем историю после успешного импорта
      await refreshHistory();
    } catch (err: any) {
      setError(err.message || "Ошибка при скачивании и импорте товаров");
    } finally {
      setIsDownloading(false);
    }
  };

  const getImportTypeLabel = (type: string) => {
    switch (type) {
      case "automatic":
        return "Автоматически";
      case "manual":
        return "Вручную";
      case "file":
        return "Загрузка файла";
      default:
        return type;
    }
  };

  const getImportTypeColor = (type: string) => {
    switch (type) {
      case "automatic":
        return "bg-blue-100 text-blue-800";
      case "manual":
        return "bg-green-100 text-green-800";
      case "file":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Europe/Moscow",
    }).format(date);
  };

  const handleDownloadExample = () => {
    const example = [
      {
        id: 1,
        url: "https://www.burkerwatches.com/ru/products/example",
        price: "97.30",
        compare_price: "139.00",
        name: "Example Product",
        color: "Золото",
        category: "часы",
        subcategory: "Diana",
        body_id: "watches",
        description: "Описание товара",
        specifications: "Case: Round\nCase Color: Gold\nГарантия: 1 год",
        bestseller: 0,
        created_at: "2026-02-15 12:32:34",
        updated_at: "2026-02-15 12:32:34",
        images: [
          {
            url: "https://www.burkerwatches.com/cdn/shop/files/example.png",
            alt: "Example",
          },
        ],
        colors: [
          {
            name: "Золото",
            selected: true,
            available: true,
            hex: "#FFD700",
          },
        ],
      },
    ];

    const blob = new Blob([JSON.stringify(example, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "example-products.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Импорт товаров из JSON</h1>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadAndImport}
            disabled={isDownloading || isImporting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDownloading ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Скачивание...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Скачать и импортировать с сервера</span>
              </>
            )}
          </button>
          <button
            onClick={handleDownloadExample}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Скачать пример JSON
          </button>
        </div>
      </div>

      {/* Форма загрузки файла */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
            id="file-input"
          />
          <label
            htmlFor="file-input"
            className="cursor-pointer flex flex-col items-center"
          >
            <svg
              className="w-12 h-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-lg font-medium text-gray-700 mb-2">
              Перетащите JSON файл сюда или нажмите для выбора
            </p>
            <p className="text-sm text-gray-500">
              Поддерживается только формат JSON
            </p>
          </label>
        </div>

        {file && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <button
                onClick={() => setFile(null)}
                className="text-red-600 hover:text-red-800"
              >
                Удалить
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleImport}
            disabled={!file || isImporting}
            className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? "Импорт..." : "Импортировать товары"}
          </button>
        </div>
      </div>

      {/* Результаты импорта */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-lg shadow-sm p-6"
          >
            <h2 className="text-2xl font-bold mb-4">Результаты импорта</h2>

            {/* Статистика */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-md">
                <p className="text-sm text-gray-600">Всего товаров</p>
                <p className="text-2xl font-bold text-blue-600">
                  {result.total}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-md">
                <p className="text-sm text-gray-600">Добавлено</p>
                <p className="text-2xl font-bold text-green-600">
                  {result.added}
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-md">
                <p className="text-sm text-gray-600">Обновлено</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {result.updated}
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded-md">
                <p className="text-sm text-gray-600">Ошибок</p>
                <p className="text-2xl font-bold text-red-600">
                  {result.errors.length}
                </p>
              </div>
            </div>

            {/* Ошибки */}
            {result.errors.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Ошибки импорта</h3>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          ID товара
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Ошибка
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {result.errors.map((error, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {error.id}
                          </td>
                          <td className="px-4 py-3 text-sm text-red-600">
                            {error.error}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Кнопка очистки результатов */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setResult(null);
                  setFile(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Закрыть
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* История импортов */}
      <div className="bg-white rounded-lg shadow-sm p-6 mt-8">
        <h2 className="text-2xl font-bold mb-4">История импортов</h2>
        
        {isLoadingHistory ? (
          <div className="text-center py-8 text-gray-500">Загрузка истории...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            История импортов пуста
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата и время
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Тип
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Всего
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Добавлено
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Обновлено
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ошибок
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getImportTypeColor(
                          item.type
                        )}`}
                      >
                        {getImportTypeLabel(item.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {item.total}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 font-medium">
                      {item.added}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-yellow-600 font-medium">
                      {item.updated}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600 font-medium">
                      {item.errors}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

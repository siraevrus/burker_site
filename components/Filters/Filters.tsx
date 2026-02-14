"use client";

import { Collection, Color } from "@/lib/types";
import { useStore } from "@/lib/store";

export default function Filters() {
  const filters = useStore((state) => state.filters);
  const setCollectionFilter = useStore((state) => state.setCollectionFilter);
  const setColorFilter = useStore((state) => state.setColorFilter);

  const collections: Collection[] = [
    "all",
    "Diana",
    "Sophie",
    "Olivia",
    "Macy",
    "Isabell",
    "Julia",
    "Ruby",
  ];

  const colors: Color[] = ["all", "золото", "серебро", "розовое золото"];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <h3 className="font-bold mb-4">Фильтры</h3>
      
      {/* Collection Filter */}
      <div className="mb-6">
        <label className="block text-sm font-semibold mb-2">Коллекция</label>
        <div className="flex flex-wrap gap-2">
          {collections.map((collection) => (
            <button
              key={collection}
              onClick={() => setCollectionFilter(collection)}
              className={`px-4 py-2 rounded-md text-sm transition-colors ${
                filters.collection === collection
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {collection === "all" ? "Все" : collection}
            </button>
          ))}
        </div>
      </div>

      {/* Color Filter */}
      <div>
        <label className="block text-sm font-semibold mb-2">Цвет</label>
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => setColorFilter(color)}
              className={`px-4 py-2 rounded-md text-sm transition-colors ${
                filters.color === color
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {color === "all" ? "Все" : color}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

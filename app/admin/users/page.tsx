"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatRub } from "@/lib/utils";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  emailVerified: boolean;
  createdAt: Date;
  type: "registered" | "guest";
  _count: {
    orders: number;
  };
  orders: Array<{
    id: string;
    orderNumber?: string;
    totalAmount: number;
    status: string;
    createdAt: Date;
  }>;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    const timeoutId = setTimeout(() => {
      loadUsers();
    }, searchQuery ? 300 : 0);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, orderStatusFilter, typeFilter]);

  const loadUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      if (orderStatusFilter) {
        params.append("orderStatus", orderStatusFilter);
      }
      if (typeFilter) {
        params.append("type", typeFilter);
      }
      
      const response = await fetch(`/api/admin/users?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalSpent = (userOrders: User["orders"]) => {
    return userOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  };

  const handleRowClick = (user: User) => {
    if (user.type === "guest") {
      window.location.href = `/admin/users/guest?email=${encodeURIComponent(user.email)}`;
    } else {
      window.location.href = `/admin/users/${user.id}`;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">Загрузка пользователей...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Пользователи</h1>
        <div className="text-sm text-gray-600">
          Всего: {users.length}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Поиск (имя, фамилия, отчество, телефон, email)
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Введите имя, фамилию, отчество, телефон или email..."
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Фильтр по статусу заказа
            </label>
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Все статусы</option>
              <option value="accepted">Заказ принят</option>
              <option value="purchased">Выкуплен</option>
              <option value="in_transit_de">В пути на склад</option>
              <option value="in_transit_ru">В пути в РФ</option>
              <option value="delivered">Доставлен</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Тип пользователя
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Все</option>
              <option value="registered">Зарегистрированные</option>
              <option value="guest">Гостевые</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Имя
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Телефон
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Тип
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email подтвержден
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Заказов
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Потрачено
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Дата
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => handleRowClick(user)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {user.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {user.firstName || "—"} {user.lastName || ""}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {user.phone || "—"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.type === "registered" ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Зарегистрированный
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      Гостевой
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.type === "registered" ? (
                    user.emailVerified ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Да
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Нет
                      </span>
                    )
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {user._count.orders}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {formatRub(getTotalSpent(user.orders))} ₽
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString("ru-RU", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {user.type === "guest" ? (
                    <Link
                      href={`/admin/users/guest?email=${encodeURIComponent(user.email)}`}
                      className="text-blue-600 hover:text-blue-900"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Подробнее
                    </Link>
                  ) : (
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-blue-600 hover:text-blue-900"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Подробнее
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}

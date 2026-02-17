"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  emailVerified: boolean;
  createdAt: Date;
  _count: {
    orders: number;
  };
  orders: Array<{
    id: string;
    totalAmount: number;
    status: string;
    createdAt: Date;
  }>;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
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

  const statusLabels: Record<string, string> = {
    pending: "В обработке",
    confirmed: "Подтвержден",
    shipped: "Отправлен",
    delivered: "Доставлен",
    cancelled: "Отменен",
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    shipped: "bg-purple-100 text-purple-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
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
                Email подтвержден
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Заказов
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Потрачено
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Дата регистрации
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
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
                  {user.emailVerified ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Да
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      ✗ Нет
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {user._count.orders}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {getTotalSpent(user.orders).toFixed(0)} ₽
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
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Подробнее
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Модальное окно с деталями пользователя */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Детали пользователя</h2>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Имя</p>
                  <p className="font-medium">
                    {selectedUser.firstName || "—"} {selectedUser.lastName || ""}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Телефон</p>
                  <p className="font-medium">{selectedUser.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email подтвержден</p>
                  <p className="font-medium">
                    {selectedUser.emailVerified ? "Да" : "Нет"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Дата регистрации</p>
                  <p className="font-medium">
                    {new Date(selectedUser.createdAt).toLocaleString("ru-RU")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Всего заказов</p>
                  <p className="font-medium">{selectedUser._count.orders}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Всего потрачено</p>
                  <p className="font-medium text-green-600">
                    {getTotalSpent(selectedUser.orders).toFixed(0)} ₽
                  </p>
                </div>
              </div>

              <h3 className="text-xl font-bold mb-4">Заказы</h3>
              {selectedUser.orders.length === 0 ? (
                <p className="text-gray-500">Заказов нет</p>
              ) : (
                <div className="space-y-3">
                  {selectedUser.orders.map((order) => (
                    <div
                      key={order.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            Заказ #{order.id.slice(0, 8)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(order.createdAt).toLocaleString("ru-RU")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            {order.totalAmount.toFixed(0)} ₽
                          </p>
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              statusColors[order.status] || statusColors.pending
                            }`}
                          >
                            {statusLabels[order.status] || order.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

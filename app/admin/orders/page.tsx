"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface OrderItem {
  id: string;
  productName: string;
  productPrice: number;
  quantity: number;
  selectedColor: string;
}

interface Order {
  id: string;
  orderNumber?: string;
  email: string;
  firstName: string;
  lastName: string | null;
  middleName?: string | null;
  phone: string;
  address: string;
  cdekAddress?: string | null;
  cdekPointCode?: string | null;
  city: string | null;
  status: string;
  totalAmount: number;
  shippingCost: number;
  createdAt: Date;
  items: OrderItem[];
  inn?: string | null;
  passportSeries?: string | null;
  passportNumber?: string | null;
  passportIssueDate?: string | null;
  passportIssuedBy?: string | null;
  requiresConfirmation?: boolean;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

function AdminOrdersPageContent() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    loadOrders();
  }, [statusFilter, pagination.page]);

  // Автоматически раскрываем заказ, если передан orderId в URL
  useEffect(() => {
    const orderId = searchParams.get("orderId");
    if (orderId && orders.length > 0) {
      // Проверяем, есть ли заказ с таким ID в текущем списке
      const orderExists = orders.some((order) => order.id === orderId);
      if (orderExists) {
        setExpandedOrders(new Set([orderId]));
        // Прокручиваем к заказу
        setTimeout(() => {
          const element = document.getElementById(`order-${orderId}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
      }
    }
  }, [searchParams, orders]);

  const loadOrders = async () => {
    try {
      const response = await fetch(
        `/api/admin/orders?status=${statusFilter}&page=${pagination.page}&limit=${pagination.limit}`
      );
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setPagination(data.pagination || pagination);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(
          orders.map((order) => (order.id === orderId ? data.order : order))
        );
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Ошибка при обновлении статуса");
    }
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

  const toggleOrder = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">Загрузка заказов...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Заказы</h1>
        <div className="flex items-center gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination({ ...pagination, page: 1 });
            }}
            className="px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="all">Все статусы</option>
            <option value="pending">В обработке</option>
            <option value="confirmed">Подтвержден</option>
            <option value="shipped">Отправлен</option>
            <option value="delivered">Доставлен</option>
            <option value="cancelled">Отменен</option>
          </select>
          <div className="text-sm text-gray-600">
            Всего: {pagination.total}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {orders.map((order) => {
          const isExpanded = expandedOrders.has(order.id);
          return (
            <div
              id={`order-${order.id}`}
              key={order.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Шапка заказа */}
              <button
                onClick={() => toggleOrder(order.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-6 flex-1">
                  <div className="text-left">
                    <div className="text-lg font-bold text-gray-900">
                      Заказ #{order.orderNumber || order.id.slice(0, 8)}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(order.createdAt).toLocaleDateString("ru-RU", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}{" "}
                      в{" "}
                      {new Date(order.createdAt).toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {order.requiresConfirmation && (
                      <div className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                        Позвонить
                      </div>
                    )}
                    <span className="text-sm text-gray-600">Статус</span>
                    <select
                      value={order.status}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleStatusChange(order.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`text-sm font-medium px-3 py-1 rounded-full border-0 ${
                        statusColors[order.status] || statusColors.pending
                      }`}
                    >
                      <option value="pending">В обработке</option>
                      <option value="confirmed">Подтвержден</option>
                      <option value="shipped">Отправлен</option>
                      <option value="delivered">Доставлен</option>
                      <option value="cancelled">Отменен</option>
                    </select>
                  </div>
                </div>
                <div className="ml-4">
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      isExpanded ? "transform rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>

              {/* Раскрывающийся контент */}
              {isExpanded && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Email</p>
                      <p className="font-medium">{order.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Имя</p>
                      <p className="font-medium">{order.firstName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Фамилия</p>
                      <p className="font-medium">{order.lastName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Отчество</p>
                      <p className="font-medium">{order.middleName || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Телефон</p>
                      <p className="font-medium">{order.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Пользователь</p>
                      <p className="font-medium">
                        {order.user
                          ? `${order.user.firstName || ""} ${order.user.lastName || ""}`.trim() || order.user.email
                          : "Гость"}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600 mb-1">Пункт выдачи СДЭК (ПВЗ)</p>
                      <p className="font-medium">
                        {order.cdekAddress || "—"}
                        {order.cdekPointCode && (
                          <span className="text-gray-500 font-normal ml-1">(код {order.cdekPointCode})</span>
                        )}
                      </p>
                    </div>
                    {order.address && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-600 mb-1">Адрес доставки</p>
                        <p className="font-medium">
                          {order.address}
                          {order.city && `, ${order.city}`}
                        </p>
                      </div>
                    )}
                    {order.requiresConfirmation && (
                      <div className="md:col-span-2">
                        <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-4">
                          <p className="text-sm font-medium text-orange-800">
                            ⚠️ Клиент просит связаться для подтверждения заказа
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Данные для таможенного оформления</h4>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">ИНН</p>
                      <p className="font-medium">{order.inn || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Серия паспорта</p>
                      <p className="font-medium">{order.passportSeries || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Номер паспорта</p>
                      <p className="font-medium">{order.passportNumber || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Дата выдачи паспорта</p>
                      <p className="font-medium">
                        {order.passportIssueDate 
                          ? new Date(order.passportIssueDate).toLocaleDateString("ru-RU", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Кем выдан паспорт</p>
                      <p className="font-medium">{order.passportIssuedBy || "—"}</p>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold mb-4">Товары</h3>
                  <div className="space-y-3 mb-6">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-sm text-gray-600">
                              Цвет: {item.selectedColor} × {item.quantity}
                            </p>
                          </div>
                          <p className="font-semibold">
                            {(item.productPrice * item.quantity).toFixed(0)} ₽
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Доставка:</span>
                      <span>
                        {order.shippingCost === 0 ? (
                          <span className="text-green-600 font-medium">Бесплатно</span>
                        ) : (
                          <span className="font-medium">{order.shippingCost.toFixed(0)} ₽</span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-xl font-bold">
                      <span>Итого:</span>
                      <span>{order.totalAmount.toFixed(0)} ₽</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Пагинация */}
      {pagination.totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() =>
              setPagination({ ...pagination, page: pagination.page - 1 })
            }
            disabled={pagination.page === 1}
            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Назад
          </button>
          <span className="px-4 py-2">
            Страница {pagination.page} из {pagination.totalPages}
          </span>
          <button
            onClick={() =>
              setPagination({ ...pagination, page: pagination.page + 1 })
            }
            disabled={pagination.page >= pagination.totalPages}
            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Вперед
          </button>
        </div>
      )}

    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">Загрузка заказов...</div>
      </div>
    }>
      <AdminOrdersPageContent />
    </Suspense>
  );
}

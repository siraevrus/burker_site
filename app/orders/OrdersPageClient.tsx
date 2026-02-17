"use client";

import { useState } from "react";
import { Order } from "@/lib/types";
import Link from "next/link";
import { motion } from "framer-motion";

interface OrdersPageClientProps {
  orders: Order[];
}

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

export default function OrdersPageClient({ orders }: OrdersPageClientProps) {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const toggleOrder = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };
  if (orders.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold mb-8">Мои заказы</h1>
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gray-600 mb-8">У вас пока нет заказов</p>
          <Link
            href="/"
            className="inline-block bg-black text-white px-8 py-3 rounded-md hover:bg-gray-800 transition-colors"
          >
            Начать покупки
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Мои заказы</h1>

      <div className="space-y-4">
        {orders.map((order) => {
          const isExpanded = expandedOrders.has(order.id);
          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
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
                    <span className="text-sm text-gray-600">Статус</span>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        statusColors[order.status] || statusColors.pending
                      }`}
                    >
                      {statusLabels[order.status] || order.status}
                    </span>
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
                      <p className="text-sm text-gray-600 mb-1">Телефон</p>
                      <p className="font-medium">{order.phone}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600 mb-1">Адрес доставки</p>
                      <p className="font-medium">
                        {order.address}
                        {order.city && `, ${order.city}`}
                        {order.postalCode && `, ${order.postalCode}`}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600 mb-1">Адрес ПВЗ СДЕК</p>
                      <p className="font-medium">{order.cdekAddress}</p>
                    </div>
                    <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Данные для таможенного оформления</h4>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">ИНН</p>
                      <p className="font-medium">{order.inn}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Серия и номер паспорта</p>
                      <p className="font-medium">
                        {order.passportSeries} {order.passportNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Дата выдачи паспорта</p>
                      <p className="font-medium">{order.passportIssueDate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Кем выдан</p>
                      <p className="font-medium">{order.passportIssuedBy}</p>
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

                  {order.comment && (
                    <div className="mb-6">
                      <p className="text-sm text-gray-600 mb-1">Комментарий</p>
                      <p className="font-medium">{order.comment}</p>
                    </div>
                  )}

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
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

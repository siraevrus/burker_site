"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatRub } from "@/lib/utils";

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
  address?: string | null;
  cdekAddress?: string | null;
  cdekPointCode?: string | null;
  status: string;
  paymentStatus?: string;
  totalAmount: number;
  shippingCost: number;
  paidAt?: string | null;
  createdAt: string;
  items: OrderItem[];
  promoCode?: string | null;
  promoDiscount?: number | null;
}

interface GuestUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  phone: string | null;
  emailVerified: boolean;
  ipAddress: string | null;
  deviceInfo: string | null;
  createdAt: string;
  type: "guest";
  orders: Order[];
  cartItems: [];
}

const statusLabels: Record<string, string> = {
  accepted: "Заказ принят",
  purchased: "Выкуплен",
  in_transit_de: "В пути на склад",
  in_transit_ru: "В пути в РФ",
  delivered: "Доставлен",
};

const statusColors: Record<string, string> = {
  accepted: "bg-yellow-100 text-yellow-800",
  purchased: "bg-blue-100 text-blue-800",
  in_transit_de: "bg-purple-100 text-purple-800",
  in_transit_ru: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
};

const paymentStatusLabels: Record<string, string> = {
  paid: "Оплачен",
  pending: "Ожидает оплаты",
  expired: "Истекла",
  cancelled: "Отменена",
};

function GuestUserContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [user, setUser] = useState<GuestUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!email) {
      setError("Email не указан");
      setLoading(false);
      return;
    }
    loadUser();
  }, [email]);

  const loadUser = async () => {
    try {
      const response = await fetch(
        `/api/admin/users/guest?email=${encodeURIComponent(email!)}`
      );
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Гостевой пользователь не найден");
        return;
      }
      const data = await response.json();
      setUser(data.user);
    } catch (err) {
      console.error("Error loading guest user:", err);
      setError("Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">Загрузка...</div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">
            {error || "Гостевой пользователь не найден"}
          </p>
          <Link href="/admin/users" className="text-blue-600 hover:underline">
            Назад к пользователям
          </Link>
        </div>
      </div>
    );
  }

  const totalSpent = user.orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const paidOrders = user.orders.filter((o) => o.paymentStatus === "paid");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Назад к пользователям
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user.firstName || ""} {user.lastName || ""}
              {!user.firstName && !user.lastName && user.email}
            </h1>
            <p className="text-gray-500 mt-1">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
              Гостевой
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Отчество</p>
            <p className="font-medium">{user.middleName || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Телефон</p>
            <p className="font-medium">{user.phone || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Первый заказ</p>
            <p className="font-medium">
              {new Date(user.createdAt).toLocaleString("ru-RU", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          {user.ipAddress && (
            <div>
              <p className="text-sm text-gray-500 mb-1">IP при заказе</p>
              <p className="font-mono text-sm">{user.ipAddress}</p>
            </div>
          )}
          {user.deviceInfo && (
            <div className="sm:col-span-2">
              <p className="text-sm text-gray-500 mb-1">Устройство</p>
              <p className="text-sm text-gray-600 break-all">
                {user.deviceInfo}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500 mb-1">Всего заказов</p>
          <p className="text-2xl font-bold">{user.orders.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500 mb-1">Оплаченных</p>
          <p className="text-2xl font-bold text-green-600">
            {paidOrders.length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500 mb-1">Всего потрачено</p>
          <p className="text-2xl font-bold text-green-600">
            {formatRub(totalSpent)} ₽
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold">Заказы</h2>
        </div>

        {user.orders.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Заказов нет
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {user.orders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders?orderId=${order.id}`}
                className="block px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-gray-900">
                        Заказ #{order.orderNumber || order.id.slice(0, 8)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[order.status] || statusColors.accepted
                        }`}
                      >
                        {statusLabels[order.status] || order.status}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          order.paymentStatus === "paid"
                            ? "bg-green-100 text-green-800"
                            : order.paymentStatus === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {paymentStatusLabels[order.paymentStatus ?? "pending"] ??
                          order.paymentStatus}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {order.paidAt && (
                        <span className="ml-2 text-green-600">
                          Оплачен{" "}
                          {new Date(order.paidAt).toLocaleString("ru-RU", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      {order.items.map((item) => (
                        <span key={item.id} className="mr-3">
                          {item.productName} x{item.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">
                      {formatRub(order.totalAmount)} ₽
                    </p>
                    {order.promoCode && (order.promoDiscount ?? 0) > 0 && (
                      <p className="text-xs text-green-600">
                        Промокод {order.promoCode} (−
                        {formatRub(order.promoDiscount ?? 0)} ₽)
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminGuestUserPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-8">Загрузка...</div>
        </div>
      }
    >
      <GuestUserContent />
    </Suspense>
  );
}

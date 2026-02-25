"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";

interface OrderItem {
  id: string;
  productName: string;
  productPrice: number;
  originalPriceEur?: number | null;
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
  promoCode?: string | null;
  promoDiscount?: number | null;
  promoDiscountType?: string | null; // "fixed" | "percent"
  eurRate?: number | null;
  rubRate?: number | null;
  purchaseProofImage?: string | null;
  sellerTrackNumber?: string | null;
  russiaTrackNumber?: string | null;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

interface StatusChangeModal {
  isOpen: boolean;
  orderId: string;
  orderNumber: string;
  newStatus: string;
  type: "image" | "track_de" | "track_ru" | null;
}

function AdminOrdersPageContent() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const [modal, setModal] = useState<StatusChangeModal>({
    isOpen: false,
    orderId: "",
    orderNumber: "",
    newStatus: "",
    type: null,
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [trackInput, setTrackInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function getItemCommission(item: OrderItem, eurRate: number, rubRate: number): number | null {
    if (item.originalPriceEur == null || item.originalPriceEur <= 0) return null;
    const originalPriceInUsd = item.originalPriceEur / eurRate;
    const originalPriceInRub = originalPriceInUsd * rubRate;
    return Math.max(0, (item.productPrice - originalPriceInRub) * item.quantity);
  }

  function getOrderCommission(order: Order): { total: number; perItem: Map<string, number> } | null {
    const eur = order.eurRate;
    const rub = order.rubRate;
    if (eur == null || rub == null || eur <= 0 || rub <= 0) return null;
    const perItem = new Map<string, number>();
    let total = 0;
    for (const item of order.items) {
      const c = getItemCommission(item, eur, rub);
      if (c != null) {
        perItem.set(item.id, c);
        total += c;
      }
    }
    return perItem.size > 0 ? { total, perItem } : null;
  }

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    loadOrders();
  }, [statusFilter, searchQuery, pagination.page]);

  useEffect(() => {
    const orderId = searchParams.get("orderId");
    if (orderId && orders.length > 0) {
      const orderExists = orders.some((order) => order.id === orderId);
      if (orderExists) {
        setExpandedOrders(new Set([orderId]));
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
      const params = new URLSearchParams({
        status: statusFilter,
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (searchQuery) params.set("search", searchQuery);
      const response = await fetch(`/api/admin/orders?${params}`);
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

  const handleStatusSelectChange = (order: Order, newStatus: string) => {
    if (newStatus === "purchased") {
      setModal({
        isOpen: true,
        orderId: order.id,
        orderNumber: order.orderNumber || order.id.slice(0, 8),
        newStatus,
        type: "image",
      });
    } else if (newStatus === "in_transit_de") {
      setModal({
        isOpen: true,
        orderId: order.id,
        orderNumber: order.orderNumber || order.id.slice(0, 8),
        newStatus,
        type: "track_de",
      });
    } else if (newStatus === "in_transit_ru") {
      setModal({
        isOpen: true,
        orderId: order.id,
        orderNumber: order.orderNumber || order.id.slice(0, 8),
        newStatus,
        type: "track_ru",
      });
    } else {
      updateOrderStatus(order.id, newStatus, {});
    }
  };

  const updateOrderStatus = async (
    orderId: string,
    newStatus: string,
    additionalData: {
      purchaseProofImage?: string;
      sellerTrackNumber?: string;
      russiaTrackNumber?: string;
    }
  ) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus, ...additionalData }),
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(
          orders.map((order) => (order.id === orderId ? data.order : order))
        );
        return true;
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Ошибка при обновлении статуса");
        return false;
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Ошибка при обновлении статуса");
      return false;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleModalSubmit = async () => {
    if (!modal.orderId) return;

    setModalLoading(true);

    try {
      if (modal.type === "image" && selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("orderId", modal.orderId);

        const uploadResponse = await fetch("/api/admin/orders/upload-proof", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Ошибка загрузки изображения");
        }

        const uploadData = await uploadResponse.json();
        const success = await updateOrderStatus(modal.orderId, modal.newStatus, {
          purchaseProofImage: uploadData.url,
        });

        if (success) {
          closeModal();
        }
      } else if (modal.type === "track_de" && trackInput.trim()) {
        const success = await updateOrderStatus(modal.orderId, modal.newStatus, {
          sellerTrackNumber: trackInput.trim(),
        });
        if (success) {
          closeModal();
        }
      } else if (modal.type === "track_ru" && trackInput.trim()) {
        const success = await updateOrderStatus(modal.orderId, modal.newStatus, {
          russiaTrackNumber: trackInput.trim(),
        });
        if (success) {
          closeModal();
        }
      }
    } catch (error) {
      console.error("Error in modal submit:", error);
      alert("Произошла ошибка");
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setModal({
      isOpen: false,
      orderId: "",
      orderNumber: "",
      newStatus: "",
      type: null,
    });
    setTrackInput("");
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
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

  const isSubmitDisabled = () => {
    if (modal.type === "image") {
      return !selectedFile;
    }
    return !trackInput.trim();
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">Заказы</h1>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="ФИО, телефон, номер заказа..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="px-3 py-2 border border-gray-300 rounded-md w-full sm:w-64 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="all">Все статусы</option>
            <option value="accepted">Заказ принят</option>
            <option value="purchased">Выкуплен</option>
            <option value="in_transit_de">В пути на склад</option>
            <option value="in_transit_ru">В пути в РФ</option>
            <option value="delivered">Доставлен</option>
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
                        handleStatusSelectChange(order, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`text-sm font-medium px-3 py-1 rounded-full border-0 ${
                        statusColors[order.status] || statusColors.accepted
                      }`}
                    >
                      <option value="accepted">Заказ принят</option>
                      <option value="purchased">Выкуплен</option>
                      <option value="in_transit_de">В пути на склад</option>
                      <option value="in_transit_ru">В пути в РФ</option>
                      <option value="delivered">Доставлен</option>
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
                            Клиент просит связаться для подтверждения заказа
                          </p>
                        </div>
                      </div>
                    )}

                    {(order.purchaseProofImage || order.sellerTrackNumber || order.russiaTrackNumber) && (
                      <>
                        <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">Данные отслеживания</h4>
                        </div>
                        {order.purchaseProofImage && (
                          <div className="md:col-span-2">
                            <p className="text-sm text-gray-600 mb-1">Подтверждение выкупа</p>
                            <a
                              href={order.purchaseProofImage}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block"
                            >
                              <img
                                src={order.purchaseProofImage}
                                alt="Подтверждение выкупа"
                                className="max-w-xs rounded-lg border border-gray-200"
                              />
                            </a>
                          </div>
                        )}
                        {order.sellerTrackNumber && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Трек продавца</p>
                            <p className="font-medium font-mono">{order.sellerTrackNumber}</p>
                          </div>
                        )}
                        {order.russiaTrackNumber && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Трек РФ</p>
                            <p className="font-medium font-mono">{order.russiaTrackNumber}</p>
                          </div>
                        )}
                      </>
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
                              Цвет: {item.selectedColor} x {item.quantity}
                            </p>
                          </div>
                          <p className="font-semibold">
                            {(item.productPrice * item.quantity).toFixed(0)} ₽
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {(() => {
                    const commission = getOrderCommission(order);
                    const hasRates = order.eurRate != null && order.rubRate != null;
                    return (
                      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-800 mb-3">Расчёт вознаграждения комиссионера</h4>
                        {hasRates ? (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-4">
                              <div>
                                <span className="text-gray-600">Курс EUR (к USD) на момент оплаты:</span>
                                <span className="ml-2 font-mono font-medium">{order.eurRate!.toFixed(4)}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Курс RUB (к USD) на момент оплаты:</span>
                                <span className="ml-2 font-mono font-medium">{order.rubRate!.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="mb-4 p-3 bg-white rounded border border-gray-200">
                              <p className="text-sm font-semibold text-gray-800 mb-2">Формула расчёта вознаграждения комиссионера с подстановкой реальных цифр</p>
                              <p className="text-xs text-gray-600 mb-2">
                                По позиции: <strong>вознаграждение = (цена в ₽ − (оригинал € ÷ курс_EUR × курс_RUB)) × кол-во</strong>
                              </p>
                              <ul className="space-y-1.5 text-xs font-mono text-gray-800">
                                {order.items.map((item) => {
                                  const itemComm = commission?.perItem.get(item.id) ?? null;
                                  const eur = order.eurRate!;
                                  const rub = order.rubRate!;
                                  const hasEur = item.originalPriceEur != null && item.originalPriceEur > 0;
                                  const costRub = hasEur ? (item.originalPriceEur! / eur) * rub : null;
                                  const name = item.productName.length > 30 ? item.productName.slice(0, 27) + "…" : item.productName;
                                  return (
                                    <li key={item.id} className="break-all">
                                      {hasEur && costRub != null && itemComm != null ? (
                                        <>
                                          {name}: ({item.productPrice} − ({item.originalPriceEur!.toFixed(2)} ÷ {eur.toFixed(4)} × {rub.toFixed(2)})) × {item.quantity} = ({item.productPrice} − {costRub.toFixed(0)}) × {item.quantity} = <strong>{itemComm.toFixed(0)} ₽</strong>
                                        </>
                                      ) : (
                                        <>{name}: — (нет данных по оригинальной цене в EUR)</>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                              {commission != null && commission.total > 0 && (
                                <p className="text-xs font-mono text-gray-800 mt-2 pt-2 border-t border-gray-200">
                                  Итого вознаграждение комиссионера: {order.items.filter((i) => commission.perItem.has(i.id)).map((i) => commission.perItem.get(i.id)!.toFixed(0)).join(" + ")} = <strong>{commission.total.toFixed(0)} ₽</strong>
                                </p>
                              )}
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm border-collapse">
                                <thead>
                                  <tr className="border-b border-gray-300 text-left">
                                    <th className="py-2 pr-2">Товар</th>
                                    <th className="py-2 pr-2 whitespace-nowrap">Цена в EUR</th>
                                    <th className="py-2 pr-2 whitespace-nowrap">Себестоимость в ₽</th>
                                    <th className="py-2 pr-2">Кол-во</th>
                                    <th className="py-2 text-right whitespace-nowrap">Вознаграждение</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {order.items.map((item) => {
                                    const itemComm = commission?.perItem.get(item.id) ?? null;
                                    const eur = order.eurRate!;
                                    const rub = order.rubRate!;
                                    const costRub = item.originalPriceEur != null && item.originalPriceEur > 0
                                      ? (item.originalPriceEur / eur) * rub
                                      : null;
                                    return (
                                      <tr key={item.id} className="border-b border-gray-200">
                                        <td className="py-2 pr-2">{item.productName}</td>
                                        <td className="py-2 pr-2 font-mono">
                                          {item.originalPriceEur != null ? `${item.originalPriceEur.toFixed(2)} €` : "—"}
                                        </td>
                                        <td className="py-2 pr-2">
                                          {costRub != null ? `${costRub.toFixed(0)} ₽` : "—"}
                                        </td>
                                        <td className="py-2 pr-2">{item.quantity}</td>
                                        <td className="py-2 text-right font-medium">
                                          {itemComm != null ? `${itemComm.toFixed(0)} ₽` : "—"}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            {commission != null && commission.total > 0 && (
                              <p className="mt-3 text-sm font-semibold text-gray-800">
                                Итого вознаграждение комиссионера: {commission.total.toFixed(0)} ₽
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-600">
                            Курсы на момент оплаты не сохранены (заказ создан до обновления). Итоговая комиссия не рассчитана.
                          </p>
                        )}
                      </div>
                    );
                  })()}

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
                    {order.promoCode && (order.promoDiscount ?? 0) > 0 && (
                      <div className="flex justify-between mb-2 text-green-600">
                        <span>
                          Промокод {order.promoCode}
                          {order.promoDiscountType && (
                            <span className="text-gray-500 font-normal ml-1">
                              (тип: {order.promoDiscountType === "percent" ? "%" : "₽"})
                            </span>
                          )}:
                        </span>
                        <span className="font-medium">-{(order.promoDiscount ?? 0).toFixed(0)} ₽</span>
                      </div>
                    )}
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

      {modal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">
              {modal.type === "image" && "Загрузите подтверждение выкупа"}
              {modal.type === "track_de" && "Введите трек-номер продавца"}
              {modal.type === "track_ru" && "Введите трек-номер для РФ"}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Заказ #{modal.orderNumber}
            </p>

            {modal.type === "image" && (
              <div className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                >
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-48 mx-auto rounded"
                    />
                  ) : (
                    <>
                      <svg
                        className="w-12 h-12 mx-auto text-gray-400 mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="text-gray-600">Нажмите для загрузки изображения</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {selectedFile && (
                  <p className="text-sm text-gray-600">
                    Выбран файл: {selectedFile.name}
                  </p>
                )}
              </div>
            )}

            {(modal.type === "track_de" || modal.type === "track_ru") && (
              <div className="space-y-4">
                <input
                  type="text"
                  value={trackInput}
                  onChange={(e) => setTrackInput(e.target.value)}
                  placeholder="Введите трек-номер"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                />
                <p className="text-sm text-gray-500">
                  {modal.type === "track_de"
                    ? "Трек-номер от продавца для отслеживания доставки на склад в Германии"
                    : "Трек-номер для отслеживания доставки в Россию"}
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={modalLoading}
              >
                Отмена
              </button>
              <button
                onClick={handleModalSubmit}
                disabled={isSubmitDisabled() || modalLoading}
                className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {modalLoading ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
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

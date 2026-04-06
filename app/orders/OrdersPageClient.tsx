"use client";

import { useState, useCallback } from "react";
import { Order, OrderItem } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { formatRub } from "@/lib/utils";
import ProductImage from "@/components/ProductImage";
import { useStore } from "@/lib/store";
import { isOrderExpired } from "@/lib/order-utils";

interface OrdersPageClientProps {
  orders: Order[];
}

interface ExchangeRates {
  eurRate: number;
  rubRate: number;
}


const paymentStatusLabels: Record<string, string> = {
  paid: "Оплачен",
  pending: "Ожидает оплаты",
  expired: "Истекла ссылка",
  cancelled: "Отменена",
  failed: "Ошибка",
  closed: "Заказ закрыт",
};

function getItemCommission(item: OrderItem, rates: ExchangeRates | null): number | null {
  if (item.commissionAmount != null) return item.commissionAmount;
  if (!rates || !item.originalPriceEur) return null;
  const originalPriceInUsd = item.originalPriceEur / rates.eurRate;
  const originalPriceInRub = originalPriceInUsd * rates.rubRate;
  return (item.productPrice - originalPriceInRub) * item.quantity;
}

function getRatesForOrder(order: Order): ExchangeRates | null {
  if (order.eurRate != null && order.rubRate != null) {
    return { eurRate: order.eurRate, rubRate: order.rubRate };
  }
  return null;
}

export default function OrdersPageClient({ orders }: OrdersPageClientProps) {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const { addToCart, clearCart } = useStore();
  const router = useRouter();

  const toggleOrder = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const handleReorder = useCallback(async (order: Order) => {
    setReorderingId(order.id);
    try {
      const productIds = order.items.map((item) => item.productId);
      const res = await fetch("/api/products/cart-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: productIds }),
      });
      const data = await res.json();
      const freshProducts: Array<{
        id: string;
        name: string;
        price: number;
        originalPrice: number;
        discount: number;
        colors: string[];
        images: string[];
        inStock: boolean;
        soldOut?: boolean;
        collection: string;
        subcategory?: string;
      }> = Array.isArray(data.products) ? data.products : [];

      const byId = new Map(freshProducts.map((p) => [p.id, p]));

      clearCart();

      for (const item of order.items) {
        const fresh = byId.get(item.productId);
        if (!fresh || fresh.soldOut || !fresh.inStock) continue;
        addToCart({
          id: fresh.id,
          name: fresh.name,
          price: fresh.price,
          originalPrice: fresh.originalPrice,
          discount: fresh.discount,
          colors: fresh.colors,
          images: fresh.images,
          inStock: fresh.inStock,
          soldOut: fresh.soldOut,
          collection: fresh.collection,
          subcategory: fresh.subcategory,
          selectedColor: item.selectedColor,
          quantity: item.quantity,
        });
      }

      router.push("/cart");
    } catch {
      // при ошибке просто перенаправляем в корзину
      router.push("/cart");
    } finally {
      setReorderingId(null);
    }
  }, [addToCart, clearCart, router]);
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
          const orderClosed = isOrderExpired(order);
          const effectiveStatus = orderClosed ? "closed" : (order.paymentStatus ?? "pending");
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
                  <div className="flex items-center gap-4 flex-wrap">
                    <span
                      className={`inline-block shrink-0 max-md:origin-right max-md:scale-[0.8] px-3 py-1 rounded-full text-sm font-medium ${
                        effectiveStatus === "paid"
                          ? "bg-green-100 text-green-800"
                          : effectiveStatus === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : effectiveStatus === "closed"
                              ? "bg-gray-200 text-gray-600"
                              : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {paymentStatusLabels[effectiveStatus] ?? effectiveStatus}
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
                  {orderClosed ? (
                    <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm text-gray-600">Время на оплату истекло. Вы можете повторить заказ с актуальными ценами.</span>
                      <button
                        onClick={() => handleReorder(order)}
                        disabled={reorderingId === order.id}
                        className="inline-block bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {reorderingId === order.id ? "Загрузка..." : "Повторить заказ"}
                      </button>
                    </div>
                  ) : order.paymentStatus === "pending" && order.paymentLink ? (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm text-amber-800">Заказ ожидает оплаты</span>
                      <Link
                        href={`/order/${order.id}/pay`}
                        className="inline-block bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 text-sm font-medium"
                      >
                        Оплатить
                      </Link>
                    </div>
                  ) : null}
                  <h3 className="text-lg font-bold mb-4">Товары</h3>
                  <div className="space-y-3 mb-6">
                    {order.items.map((item) => {
                      const itemCommission = getItemCommission(item, getRatesForOrder(order));
                      const imgSrc =
                        item.productImage || "/Isabell_gold_burgundy_1.webp";
                      const thumb = (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-md border border-gray-200 overflow-hidden bg-gray-50 relative">
                          <ProductImage
                            src={imgSrc}
                            alt={item.productName}
                            className="object-cover"
                          />
                        </div>
                      );
                      return (
                        <div
                          key={item.id}
                          className="border border-gray-200 rounded-lg p-4 flex gap-3 sm:gap-4"
                        >
                          {item.productHref ? (
                            <Link
                              href={item.productHref}
                              className="flex-shrink-0 rounded-md hover:opacity-90 transition-opacity"
                            >
                              {thumb}
                            </Link>
                          ) : (
                            thumb
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between gap-2 mb-2">
                              <p className="font-medium min-w-0">{item.productName}</p>
                              <p className="font-semibold flex-shrink-0">
                                {formatRub(item.productPrice * item.quantity)} ₽
                              </p>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div className="flex justify-between gap-2">
                                <span>Цена за шт.:</span>
                                <span>{formatRub(item.productPrice)} ₽</span>
                              </div>
                              {item.selectedColor ? <p>Цвет: {item.selectedColor}</p> : null}
                              <p>Кол-во: {item.quantity}</p>
                              {itemCommission !== null && (
                                <p className="text-gray-500 flex flex-wrap items-baseline gap-x-1">
                                  <span>Комиссия товара:</span>
                                  <span className="whitespace-nowrap flex-shrink-0">
                                    {formatRub(itemCommission)} ₽
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Email</p>
                      <p className="font-medium">{order.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Телефон</p>
                      <p className="font-medium">{order.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Имя</p>
                      <p className="font-medium">{order.firstName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Фамилия</p>
                      <p className="font-medium">{order.lastName}</p>
                    </div>
                    {order.middleName && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Отчество</p>
                        <p className="font-medium">{order.middleName}</p>
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600 mb-1">Пункт выдачи СДЭК (ПВЗ)</p>
                      <p className="font-medium">
                        {order.cdekAddress}
                        {order.cdekPointCode && ` (код ${order.cdekPointCode})`}
                      </p>
                    </div>
                    {order.address && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-600 mb-1">Адрес доставки</p>
                        <p className="font-medium">
                          {order.address}
                          {order.city && `, ${order.city}`}
                          {order.postalCode && `, ${order.postalCode}`}
                        </p>
                      </div>
                    )}

                    {(order.purchaseProofImage || order.sellerTrackNumber || order.russiaTrackNumber) && (
                      <>
                        <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">Информация об отслеживании</h4>
                        </div>
                        {order.purchaseProofImage && (
                          <div className="md:col-span-2">
                            <p className="text-sm text-gray-600 mb-2">Подтверждение выкупа</p>
                            <a
                              href={order.purchaseProofImage}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block"
                            >
                              <img
                                src={order.purchaseProofImage}
                                alt="Подтверждение выкупа"
                                className="max-w-xs rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                              />
                            </a>
                          </div>
                        )}
                        {order.sellerTrackNumber && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Трек-номер (склад в Германии)</p>
                            <p className="font-medium font-mono text-purple-700">{order.sellerTrackNumber}</p>
                          </div>
                        )}
                        {order.russiaTrackNumber && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Трек-номер (доставка в РФ)</p>
                            <p className="font-medium font-mono text-indigo-700">{order.russiaTrackNumber}</p>
                          </div>
                        )}
                      </>
                    )}

                    <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Данные для таможенного оформления</h4>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">ИНН</p>
                      <p className="font-medium">{order.inn}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Серия паспорта</p>
                      <p className="font-medium">{order.passportSeries}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Номер паспорта</p>
                      <p className="font-medium">{order.passportNumber}</p>
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
                          : order.passportIssueDate}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Кем выдан паспорт</p>
                      <p className="font-medium">{order.passportIssuedBy}</p>
                    </div>
                  </div>

                  {order.comment && (
                    <div className="mb-6">
                      <p className="text-sm text-gray-600 mb-1">Комментарий</p>
                      <p className="font-medium">{order.comment}</p>
                    </div>
                  )}

                  {order.paymentStatus !== "paid" && (
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">Доставка:</span>
                        <span>
                          {order.shippingCost === 0 ? (
                            <span className="text-green-600 font-medium">Бесплатно</span>
                          ) : (
                            <span className="font-medium">{formatRub(order.shippingCost)} ₽</span>
                          )}
                        </span>
                      </div>
                      {order.promoCode && (order.promoDiscount ?? 0) > 0 && (
                        <div className="flex justify-between mb-2 text-green-600">
                          <span>Промокод {order.promoCode}:</span>
                          <span className="font-medium">-{formatRub(order.promoDiscount ?? 0)} ₽</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xl font-bold">
                        <span>Итого:</span>
                        <span>{formatRub(order.totalAmount)} ₽</span>
                      </div>
                      {(() => {
                        const rates = getRatesForOrder(order);
                        let totalComm = 0;
                        let hasComm = false;
                        order.items.forEach((it) => {
                          const c = getItemCommission(it, rates);
                          if (c != null) { hasComm = true; totalComm += c; }
                        });
                        return hasComm ? (
                          <p className="text-xs text-gray-400 mt-1">
                            Итого вознаграждение комиссионера: {formatRub(totalComm)} ₽
                          </p>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

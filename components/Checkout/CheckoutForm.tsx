"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { CheckoutFormData } from "@/lib/types";
import Link from "next/link";

interface CheckoutFormProps {
  user?: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

export default function CheckoutForm({ user }: CheckoutFormProps) {
  const router = useRouter();
  const cart = useStore((state) => state.cart);
  const getTotalPrice = useStore((state) => state.getTotalPrice);
  const clearCart = useStore((state) => state.clearCart);

  const [formData, setFormData] = useState<CheckoutFormData>({
    email: user?.email || "",
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    middleName: "",
    phone: user?.phone || "",
    address: "",
    cdekAddress: "",
    city: "",
    postalCode: "",
    country: "Россия",
    comment: "",
    inn: "",
    passportSeries: "",
    passportNumber: "",
    passportIssueDate: "",
    passportIssuedBy: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const totalPrice = getTotalPrice();
  const freeShippingThreshold = 39;
  const shippingCost = totalPrice >= freeShippingThreshold ? 0 : 5.0;
  const finalTotal = totalPrice + shippingCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Валидация обязательных полей
    if (
      !formData.email ||
      !formData.firstName ||
      !formData.lastName ||
      !formData.middleName ||
      !formData.phone ||
      !formData.address ||
      !formData.cdekAddress ||
      !formData.inn ||
      !formData.passportSeries ||
      !formData.passportNumber ||
      !formData.passportIssueDate ||
      !formData.passportIssuedBy
    ) {
      setError("Заполните все обязательные поля");
      setLoading(false);
      return;
    }

    try {
      // Подготовка данных заказа
      const orderItems = cart.map((item) => ({
        productId: item.id,
        productName: item.name,
        productPrice: item.price,
        selectedColor: item.selectedColor,
        quantity: item.quantity,
      }));

      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          items: orderItems,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Ошибка при оформлении заказа");
        setLoading(false);
        return;
      }

      // Очистка корзины
      clearCart();

      // Редирект на страницу подтверждения
      router.push(`/order-confirmation?id=${data.order.id}`);
    } catch (error) {
      console.error("Checkout error:", error);
      setError("Ошибка при оформлении заказа. Попробуйте позже.");
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">Ваша корзина пуста</p>
        <Link
          href="/"
          className="inline-block bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 transition-colors"
        >
          Вернуться к покупкам
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email *
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-2">
            Телефон *
          </label>
          <input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>

        <div>
          <label htmlFor="firstName" className="block text-sm font-medium mb-2">
            Имя *
          </label>
          <input
            id="firstName"
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium mb-2">
            Фамилия *
          </label>
          <input
            id="lastName"
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>

        <div>
          <label htmlFor="middleName" className="block text-sm font-medium mb-2">
            Отчество *
          </label>
          <input
            id="middleName"
            type="text"
            value={formData.middleName}
            onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="address" className="block text-sm font-medium mb-2">
            Адрес доставки *
          </label>
          <input
            id="address"
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="cdekAddress" className="block text-sm font-medium mb-2">
            Адрес доставки ПВЗ СДЕК *
          </label>
          <input
            id="cdekAddress"
            type="text"
            value={formData.cdekAddress}
            onChange={(e) => setFormData({ ...formData, cdekAddress: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
            placeholder="Выберите адрес ПВЗ СДЕК"
          />
          <a
            href="https://www.cdek.ru/ru/offices/map/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 mt-1 inline-block"
          >
            📌 Выбрать адрес ПВЗ СДЕК на карте
          </a>
        </div>

        <div>
          <label htmlFor="city" className="block text-sm font-medium mb-2">
            Город
          </label>
          <input
            id="city"
            type="text"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="postalCode" className="block text-sm font-medium mb-2">
            Почтовый индекс
          </label>
          <input
            id="postalCode"
            type="text"
            value={formData.postalCode}
            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="country" className="block text-sm font-medium mb-2">
            Страна
          </label>
          <input
            id="country"
            type="text"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="comment" className="block text-sm font-medium mb-2">
            Комментарий к заказу
          </label>
          <textarea
            id="comment"
            value={formData.comment}
            onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>

        {/* Данные для таможенного оформления */}
        <div className="md:col-span-2 border-t border-gray-300 pt-4 mt-4">
          <h3 className="text-lg font-semibold mb-4">Данные для таможенного оформления</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="inn" className="block text-sm font-medium mb-2">
                📌 ИНН (для таможенного оформления) *
              </label>
              <input
                id="inn"
                type="text"
                value={formData.inn}
                onChange={(e) => setFormData({ ...formData, inn: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
                placeholder="Введите ИНН"
              />
            </div>

            <div>
              <label htmlFor="passportSeries" className="block text-sm font-medium mb-2">
                📌 Серия паспорта (для таможенного оформления) *
              </label>
              <input
                id="passportSeries"
                type="text"
                value={formData.passportSeries}
                onChange={(e) => setFormData({ ...formData, passportSeries: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
                placeholder="Серия паспорта"
                maxLength={4}
              />
            </div>

            <div>
              <label htmlFor="passportNumber" className="block text-sm font-medium mb-2">
                📌 Номер паспорта (для таможенного оформления) *
              </label>
              <input
                id="passportNumber"
                type="text"
                value={formData.passportNumber}
                onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
                placeholder="Номер паспорта"
                maxLength={6}
              />
            </div>

            <div>
              <label htmlFor="passportIssueDate" className="block text-sm font-medium mb-2">
                📌 Дата выдачи паспорта *
              </label>
              <input
                id="passportIssueDate"
                type="date"
                value={formData.passportIssueDate}
                onChange={(e) => setFormData({ ...formData, passportIssueDate: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="passportIssuedBy" className="block text-sm font-medium mb-2">
                📌 Кем выдан паспорт *
              </label>
              <input
                id="passportIssuedBy"
                type="text"
                value={formData.passportIssuedBy}
                onChange={(e) => setFormData({ ...formData, passportIssuedBy: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
                placeholder="Например: УФМС России по г. Москве"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between">
            <span>Товары</span>
            <span>€{totalPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Доставка</span>
            <span>
              {shippingCost === 0 ? (
                <span className="text-green-600">Бесплатно</span>
              ) : (
                <span>€{shippingCost.toFixed(2)}</span>
              )}
            </span>
          </div>
          <div className="flex justify-between text-xl font-bold border-t border-gray-200 pt-2">
            <span>Всего</span>
            <span>€{finalTotal.toFixed(2)}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-3 rounded-md hover:bg-gray-800 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Оформление заказа..." : "Оформить заказ"}
        </button>
      </div>
    </form>
  );
}

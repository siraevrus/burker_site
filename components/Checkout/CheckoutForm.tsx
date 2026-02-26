"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { CheckoutFormData } from "@/lib/types";
import { calculateShipping, type ShippingRateEntry } from "@/lib/shipping";
import Link from "next/link";

interface CdekPoint {
  code: string;
  uuid: string | null;
  type: string;
  address: string;
  address_full: string;
  city: string;
  work_time: string;
  latitude: number | null;
  longitude: number | null;
  phones: string[];
}

interface CheckoutFormProps {
  user?: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  onFormDataChange?: (data: {
    totalPrice: number;
    totalWeight: number;
    shippingCost: number;
    promoCode: string;
    promoCodeError: string;
    appliedPromoCode: {
      code: string;
      discount: number;
      discountType: "fixed" | "percent";
      minOrderAmount: number | null;
    } | null;
    promoDiscount: number;
    checkingPromoCode: boolean;
    requiresConfirmation: boolean;
    loading: boolean;
    onSubmit: () => void;
    setPromoCode: (value: string) => void;
    onCheckPromoCode: () => void;
    onCancelPromoCode: () => void;
    setRequiresConfirmation: (value: boolean) => void;
  }) => void;
}

export default function CheckoutForm({ user, onFormDataChange }: CheckoutFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const cart = useStore((state) => state.cart);
  const getTotalPrice = useStore((state) => state.getTotalPrice);
  const clearCart = useStore((state) => state.clearCart);
  const [shippingRates, setShippingRates] = useState<ShippingRateEntry[]>([]);

  /** Только буквы (кириллица, латиница), пробел и дефис — для ФИО */
  const lettersOnly = (value: string): string =>
    value.replace(/[^a-zA-Zа-яА-ЯёЁ\s-]/g, "");

  /** Только цифры, опционально ограничение длины */
  const digitsOnly = (value: string, maxLen?: number): string => {
    const digits = value.replace(/\D/g, "");
    return maxLen != null ? digits.slice(0, maxLen) : digits;
  };

  const formatPhoneNumber = (value: string): string => {
    // Удаляем все нецифровые символы
    const numbers = value.replace(/\D/g, "");
    
    // Если номер начинается с 8, заменяем на 7
    let formatted = numbers.startsWith("8") ? "7" + numbers.slice(1) : numbers;
    
    // Если номер не начинается с 7, добавляем 7
    if (formatted && !formatted.startsWith("7")) {
      formatted = "7" + formatted;
    }
    
    // Ограничиваем до 11 цифр (7 + 10 цифр)
    formatted = formatted.slice(0, 11);
    
    // Форматируем в +7(999)999-99-99
    if (formatted.length === 0) {
      return "";
    }
    if (formatted.length <= 1) {
      return `+${formatted}`;
    }
    if (formatted.length <= 4) {
      return `+${formatted.slice(0, 1)}(${formatted.slice(1)}`;
    }
    if (formatted.length <= 7) {
      return `+${formatted.slice(0, 1)}(${formatted.slice(1, 4)})${formatted.slice(4)}`;
    }
    if (formatted.length <= 9) {
      return `+${formatted.slice(0, 1)}(${formatted.slice(1, 4)})${formatted.slice(4, 7)}-${formatted.slice(7)}`;
    }
    return `+${formatted.slice(0, 1)}(${formatted.slice(1, 4)})${formatted.slice(4, 7)}-${formatted.slice(7, 9)}-${formatted.slice(9, 11)}`;
  };

  const [formData, setFormData] = useState<CheckoutFormData>({
    email: user?.email || "",
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    middleName: "",
    phone: user?.phone ? formatPhoneNumber(user.phone) : "",
    cdekAddress: "",
    city: "",
    postalCode: "",
    country: "Россия",
    inn: "",
    passportSeries: "",
    passportNumber: "",
    passportIssueDate: "",
    passportIssuedBy: "",
    requiresConfirmation: false,
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pvzList, setPvzList] = useState<CdekPoint[]>([]);
  const [pvzLoading, setPvzLoading] = useState(false);
  const [pvzError, setPvzError] = useState("");
  const [cityForPvz, setCityForPvz] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoCodeError, setPromoCodeError] = useState("");
  const [appliedPromoCode, setAppliedPromoCode] = useState<{
    code: string;
    discount: number;
    discountType: "fixed" | "percent";
    minOrderAmount: number | null;
  } | null>(null);
  const [checkingPromoCode, setCheckingPromoCode] = useState(false);

  const loadDeliveryPoints = useCallback(async () => {
    const q = cityForPvz.trim() ? `?city=${encodeURIComponent(cityForPvz.trim())}` : "";
    setPvzError("");
    setPvzLoading(true);
    try {
      const res = await fetch(`/api/cdek/deliverypoints${q}`);
      const data = await res.json();
      if (!res.ok) {
        setPvzList([]);
        setPvzError(typeof data.error === "string" ? data.error : "Не удалось загрузить список ПВЗ");
        return;
      }
      setPvzList(Array.isArray(data) ? data : []);
    } catch {
      setPvzList([]);
      setPvzError("Ошибка сети. Попробуйте позже.");
    } finally {
      setPvzLoading(false);
    }
  }, [cityForPvz]);

  const selectPvz = (point: CdekPoint) => {
    setFormData((prev) => ({
      ...prev,
      cdekAddress: point.address_full || point.address,
      cdekPointCode: point.code,
    }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  const handleCheckPromoCode = useCallback(async () => {
    if (!promoCode.trim()) {
      setPromoCodeError("Введите промокод");
      return;
    }

    if (!formData.email.trim()) {
      setPromoCodeError("Сначала введите email");
      return;
    }

    setCheckingPromoCode(true);
    setPromoCodeError("");

    try {
      const params = new URLSearchParams({
        code: promoCode.trim(),
        email: formData.email.trim().toLowerCase(),
      });
      const response = await fetch(`/api/promo-codes?${params}`);
      const data = await response.json();

      if (!response.ok) {
        setPromoCodeError(data.error || "Промокод не действителен");
        setAppliedPromoCode(null);
        return;
      }

      if (data.success && data.promoCode) {
        const pc = data.promoCode;

        if (pc.minOrderAmount && getTotalPrice() < pc.minOrderAmount) {
          setPromoCodeError(
            `Минимальная сумма заказа для промокода — ${pc.minOrderAmount.toFixed(0)} ₽`
          );
          setAppliedPromoCode(null);
          return;
        }

        setAppliedPromoCode({
          code: pc.code,
          discount: pc.discount,
          discountType: pc.discountType || "fixed",
          minOrderAmount: pc.minOrderAmount,
        });
        setPromoCodeError("");
      }
    } catch (error) {
      console.error("Error checking promo code:", error);
      setPromoCodeError("Ошибка при проверке промокода");
      setAppliedPromoCode(null);
    } finally {
      setCheckingPromoCode(false);
    }
  }, [promoCode, formData.email, getTotalPrice]);

  const handleCancelPromoCode = useCallback(() => {
    setAppliedPromoCode(null);
    setPromoCode("");
    setPromoCodeError("");
  }, []);

  useEffect(() => {
    fetch("/api/shipping/rates")
      .then((r) => r.json())
      .then((d) => Array.isArray(d.rates) && d.rates.length > 0 && setShippingRates(d.rates))
      .catch(() => {});
  }, []);

  const totalPrice = getTotalPrice();
  const { totalWeight, totalCost: shippingCost } = calculateShipping(
    cart,
    shippingRates.length > 0 ? shippingRates : undefined
  );
  const promoDiscount = appliedPromoCode
    ? appliedPromoCode.discountType === "percent"
      ? Math.round(shippingCost * appliedPromoCode.discount / 100)
      : appliedPromoCode.discount
    : 0;
  const shippingAfterDiscount = Math.max(0, shippingCost - promoDiscount);
  const finalTotal = totalPrice + shippingAfterDiscount;

  const submitForm = useCallback(() => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  }, []);

  useEffect(() => {
    if (onFormDataChange) {
      onFormDataChange({
        totalPrice,
        totalWeight,
        shippingCost,
        promoCode,
        promoCodeError,
        appliedPromoCode,
        promoDiscount,
        checkingPromoCode,
        requiresConfirmation: Boolean(formData.requiresConfirmation),
        loading,
        onSubmit: submitForm,
        setPromoCode,
        onCheckPromoCode: handleCheckPromoCode,
        onCancelPromoCode: handleCancelPromoCode,
        setRequiresConfirmation: (value: boolean) => setFormData((prev) => ({ ...prev, requiresConfirmation: value })),
      });
    }
  }, [totalPrice, totalWeight, shippingCost, promoCode, promoCodeError, appliedPromoCode, promoDiscount, checkingPromoCode, formData.requiresConfirmation, loading, submitForm, handleCheckPromoCode, handleCancelPromoCode, onFormDataChange]);

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

    // ИНН — ровно 12 цифр
    if (!/^\d{12}$/.test(formData.inn)) {
      setError("ИНН должен содержать ровно 12 цифр");
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
        collection: item.collection, // Для расчета доставки
      }));

      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          promoCode: appliedPromoCode?.code || null,
          promoDiscount: promoDiscount,
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

      // Редирект: при наличии платёжной ссылки — на страницу оплаты, иначе — подтверждение заказа
      if (data.paymentLinkAvailable && data.order?.id) {
        router.push(`/order/${data.order.id}/pay`);
      } else {
        router.push(`/order-confirmation?id=${data.order.id}`);
      }
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
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
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
            onChange={handlePhoneChange}
            placeholder="+7(999)999-99-99"
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
            maxLength={17} // +7(999)999-99-99 = 17 символов
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
            onChange={(e) => setFormData({ ...formData, firstName: lettersOnly(e.target.value) })}
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
            onChange={(e) => setFormData({ ...formData, lastName: lettersOnly(e.target.value) })}
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
            onChange={(e) => setFormData({ ...formData, middleName: lettersOnly(e.target.value) })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">
            Пункт выдачи СДЭК (ПВЗ) *
          </label>
          {formData.cdekAddress ? (
            <div className="border border-gray-200 rounded-md px-3 py-2.5 bg-gray-50">
              <p className="text-sm text-gray-800">
                <strong>{formData.cdekAddress}</strong>
                {formData.cdekPointCode && (
                  <span className="text-gray-500 font-normal ml-1">(код {formData.cdekPointCode})</span>
                )}
              </p>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, cdekAddress: "", cdekPointCode: undefined }))}
                className="text-sm text-blue-600 hover:text-blue-800 mt-1"
              >
                Изменить пункт
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={cityForPvz}
                  onChange={(e) => setCityForPvz(e.target.value)}
                  placeholder="Введите город для поиска ПВЗ"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                />
                <button
                  type="button"
                  onClick={loadDeliveryPoints}
                  disabled={pvzLoading}
                  className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 whitespace-nowrap"
                >
                  {pvzLoading ? "Загрузка…" : "Найти ПВЗ"}
                </button>
              </div>
              {pvzError && (
                <p className="text-sm text-red-600 mb-2">{pvzError}</p>
              )}
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100">
                {pvzList.length === 0 && !pvzLoading && (
                  <p className="px-3 py-4 text-sm text-gray-500 text-center">
                    Введите город и нажмите «Найти ПВЗ» или оставьте пустым для полного списка
                  </p>
                )}
                {pvzList.map((point) => (
                  <button
                    key={point.code}
                    type="button"
                    onClick={() => selectPvz(point)}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium">{point.address_full || point.address}</span>
                    {point.work_time && (
                      <span className="block text-gray-500 text-xs mt-0.5">{point.work_time}</span>
                    )}
                    <span className="text-xs text-gray-400">
                      {point.type === "POSTAMAT" ? "Постамат" : "ПВЗ"} · {point.code}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Данные для таможенного оформления */}
        <div className="md:col-span-2 border-t border-gray-300 pt-4 mt-4">
          <h3 className="text-lg font-semibold mb-4">Данные для таможенного оформления</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="inn" className="block text-sm font-medium mb-2">
                ИНН *
              </label>
              <input
                id="inn"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={formData.inn}
                onChange={(e) => setFormData({ ...formData, inn: digitsOnly(e.target.value, 12) })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
                placeholder="12 цифр"
                maxLength={12}
              />
            </div>

            <div>
              <label htmlFor="passportSeries" className="block text-sm font-medium mb-2">
                Серия паспорта *
              </label>
              <input
                id="passportSeries"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={formData.passportSeries}
                onChange={(e) => setFormData({ ...formData, passportSeries: digitsOnly(e.target.value, 4) })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
                placeholder="4 цифры"
                maxLength={4}
              />
            </div>

            <div>
              <label htmlFor="passportNumber" className="block text-sm font-medium mb-2">
                Номер паспорта *
              </label>
              <input
                id="passportNumber"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={formData.passportNumber}
                onChange={(e) => setFormData({ ...formData, passportNumber: digitsOnly(e.target.value, 6) })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
                placeholder="6 цифр"
                maxLength={6}
              />
            </div>

            <div>
              <label htmlFor="passportIssueDate" className="block text-sm font-medium mb-2">
                Дата выдачи паспорта *
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
                Кем выдан паспорт *
              </label>
              <input
                id="passportIssuedBy"
                type="text"
                value={formData.passportIssuedBy}
                onChange={(e) => setFormData({ ...formData, passportIssuedBy: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
                placeholder="например: УФМС №1 России по г Москве"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

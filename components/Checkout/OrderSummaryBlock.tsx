"use client";

interface OrderSummaryBlockProps {
  totalPrice: number;
  totalWeight: number;
  shippingCost: number;
  promoCode: string;
  setPromoCode: (value: string) => void;
  promoCodeError: string;
  appliedPromoCode: { code: string; discount: number } | null;
  checkingPromoCode: boolean;
  onCheckPromoCode: () => void;
  onCancelPromoCode: () => void;
  requiresConfirmation: boolean;
  setRequiresConfirmation: (value: boolean) => void;
  loading: boolean;
  onSubmit: () => void;
}

export default function OrderSummaryBlock({
  totalPrice,
  totalWeight,
  shippingCost,
  promoCode,
  setPromoCode,
  promoCodeError,
  appliedPromoCode,
  checkingPromoCode,
  onCheckPromoCode,
  onCancelPromoCode,
  requiresConfirmation,
  setRequiresConfirmation,
  loading,
  onSubmit,
}: OrderSummaryBlockProps) {
  const promoDiscount = appliedPromoCode ? appliedPromoCode.discount : 0;
  const finalTotal = Math.max(0, totalPrice + shippingCost - promoDiscount);

  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span>Товары</span>
          <span>{totalPrice.toFixed(0)} ₽</span>
        </div>
        <div className="flex justify-between">
          <span>Доставка</span>
          <span>
            {totalWeight.toFixed(1)} кг / {shippingCost.toFixed(0)} ₽
          </span>
        </div>
        {appliedPromoCode && (
          <div className="flex justify-between text-green-600">
            <span>Скидка по промокоду</span>
            <span>-{promoDiscount.toFixed(0)} ₽</span>
          </div>
        )}
        <div className="flex justify-between text-xl font-bold border-t border-gray-200 pt-2">
          <span>Всего</span>
          <span>{finalTotal.toFixed(0)} ₽</span>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Промокод
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => {
              if (!appliedPromoCode) {
                setPromoCode(e.target.value.toUpperCase());
              }
            }}
            placeholder={appliedPromoCode ? appliedPromoCode.code : "Введите промокод"}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={!!appliedPromoCode}
          />
          {appliedPromoCode ? (
            <button
              type="button"
              onClick={onCancelPromoCode}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 whitespace-nowrap"
            >
              Отмена
            </button>
          ) : (
            <button
              type="button"
              onClick={onCheckPromoCode}
              disabled={checkingPromoCode || !promoCode.trim()}
              className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {checkingPromoCode ? "Проверка..." : "Применить"}
            </button>
          )}
        </div>
        {promoCodeError && (
          <p className="text-sm text-red-600 mt-1">{promoCodeError}</p>
        )}
        {appliedPromoCode && (
          <p className="text-sm text-green-600 mt-1">
            Промокод "{appliedPromoCode.code}" применен. Скидка: {appliedPromoCode.discount.toFixed(0)} ₽
          </p>
        )}
      </div>

      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={requiresConfirmation}
            onChange={(e) => setRequiresConfirmation(e.target.checked)}
            className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
          />
          <span className="text-sm text-gray-700">
            Связаться со мной для подтверждения заказа
          </span>
        </label>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        className="w-full bg-black text-white py-3 rounded-md hover:bg-gray-800 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Оформление заказа..." : "Оформить заказ"}
      </button>
    </div>
  );
}

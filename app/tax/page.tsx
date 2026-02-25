import Link from "next/link";

export const metadata = {
  title: "Таможенная пошлина | Mira Brands | Burker",
  description: "Дополнительная информация по таможенной пошлине при доставке из-за рубежа",
};

export default function TaxPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Дополнительная информация по пошлине</h1>

      <div className="prose prose-lg max-w-none space-y-6 text-gray-700">
        <p>
          При доставке товаров из-за рубежа в Российскую Федерацию может применяться таможенная пошлина,
          если стоимость товаров на сайте производителя (в евро) превышает установленный лимит.
        </p>
        <p>
          Подробности расчёта пошлины отображаются в корзине при оформлении заказа, если сумма
          оригинальных цен товаров в евро превышает 200 €.
        </p>
        <p>
          По вопросам таможенного оформления вы можете уточнить информацию у нашей службы поддержки
          или на сайте Федеральной таможенной службы РФ.
        </p>
      </div>

      <p className="mt-8">
        <Link href="/cart" className="text-blue-600 hover:underline">
          Вернуться в корзину
        </Link>
      </p>
    </div>
  );
}

export const metadata = {
  title: "Условия и положения | Mira Brands | Burker",
  description: "Условия использования интернет-магазина Mira Brands | Burker",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Условия и положения</h1>
      
      <div className="prose prose-lg max-w-none space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Общие положения</h2>
          <p className="text-gray-700">
            Настоящие Условия и положения (далее — «Условия») регулируют отношения между интернет-магазином Mira Brands | Burker (далее — «Магазин») и пользователями Сайта (далее — «Пользователь»).
          </p>
          <p className="text-gray-700">
            Используя Сайт, Пользователь соглашается с настоящими Условиями в полном объеме.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Товары и цены</h2>
          <p className="text-gray-700 mb-2">
            Магазин оставляет за собой право изменять цены на товары без предварительного уведомления. Цены указаны в рублях и включают НДС (если применимо).
          </p>
          <p className="text-gray-700">
            Изображения товаров на Сайте носят информационный характер и могут отличаться от фактического товара.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Оформление заказа</h2>
          <p className="text-gray-700 mb-2">
            Для оформления заказа Пользователь должен предоставить достоверную информацию:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>ФИО</li>
            <li>Контактный телефон</li>
            <li>Email адрес</li>
            <li>Адрес доставки</li>
          </ul>
          <p className="text-gray-700 mt-4">
            После оформления заказа на указанный email будет отправлено подтверждение.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Оплата</h2>
          <p className="text-gray-700 mb-2">
            Оплата заказа может производиться следующими способами:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>Банковской картой онлайн</li>
            <li>Наложенным платежом при получении (при доставке курьером)</li>
            <li>Другими способами, указанными на Сайте</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Доставка</h2>
          <p className="text-gray-700">
            Доставка товаров осуществляется в соответствии с условиями, указанными на Сайте. Сроки доставки зависят от выбранного способа доставки и региона.
          </p>
          <p className="text-gray-700 mt-2">
            Риск случайной гибели или повреждения товара переходит к Пользователю с момента передачи товара курьеру или в пункт выдачи.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Возврат и обмен</h2>
          <p className="text-gray-700">
            Возврат товара надлежащего качества возможен в течение 14 дней с момента покупки при условии сохранения товарного вида, потребительских свойств и упаковки.
          </p>
          <p className="text-gray-700 mt-2">
            Возврат товара ненадлежащего качества осуществляется в соответствии с законодательством РФ о защите прав потребителей.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Интеллектуальная собственность</h2>
          <p className="text-gray-700">
            Все материалы Сайта, включая тексты, изображения, логотипы, являются объектами интеллектуальной собственности и защищены законом. Использование материалов без письменного разрешения запрещено.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Ответственность</h2>
          <p className="text-gray-700">
            Магазин не несет ответственности за ущерб, причиненный в результате использования или невозможности использования Сайта, за исключением случаев, предусмотренных законодательством РФ.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Изменение условий</h2>
          <p className="text-gray-700">
            Магазин оставляет за собой право изменять настоящие Условия в любое время. Изменения вступают в силу с момента публикации на Сайте.
          </p>
          <p className="text-gray-700 mt-2">
            <strong>Дата последнего обновления:</strong> {new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">10. Контакты</h2>
          <p className="text-gray-700">
            По всем вопросам, связанным с использованием Сайта и оформлением заказов, вы можете обратиться к нам через форму обратной связи на Сайте или по контактным данным, указанным в разделе «Контакты».
          </p>
        </section>
      </div>
    </div>
  );
}

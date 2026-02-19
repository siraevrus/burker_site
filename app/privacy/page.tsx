export const metadata = {
  title: "Политика конфиденциальности | Mira Brands | Burker",
  description: "Политика конфиденциальности Mira Brands | Burker",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Политика конфиденциальности</h1>
      
      <div className="prose prose-lg max-w-none space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Общие положения</h2>
          <p className="text-gray-700">
            Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональных данных пользователей интернет-магазина Mira Brands | Burker (далее — «Сайт»).
          </p>
          <p className="text-gray-700">
            Использование Сайта означает безоговорочное согласие пользователя с настоящей Политикой и указанными в ней условиями обработки его персональной информации.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Собираемая информация</h2>
          <p className="text-gray-700 mb-2">При использовании Сайта мы можем собирать следующую информацию:</p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>Имя и контактные данные (телефон, email, адрес доставки)</li>
            <li>Информация о заказах и покупках</li>
            <li>Технические данные (IP-адрес, тип браузера, операционная система)</li>
            <li>Данные о взаимодействии с Сайтом</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Цели использования информации</h2>
          <p className="text-gray-700 mb-2">Собранная информация используется для:</p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>Обработки и выполнения заказов</li>
            <li>Связи с клиентами по вопросам заказов</li>
            <li>Улучшения качества обслуживания</li>
            <li>Отправки информационных сообщений (с согласия пользователя)</li>
            <li>Обеспечения безопасности и предотвращения мошенничества</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Защита персональных данных</h2>
          <p className="text-gray-700">
            Мы применяем современные методы защиты информации и обеспечиваем конфиденциальность персональных данных в соответствии с требованиями законодательства РФ.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Передача данных третьим лицам</h2>
          <p className="text-gray-700">
            Мы не передаем персональные данные третьим лицам, за исключением случаев, когда это необходимо для выполнения заказа (например, службам доставки) или требуется по закону.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Права пользователей</h2>
          <p className="text-gray-700 mb-2">Пользователь имеет право:</p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>Получать информацию о своих персональных данных</li>
            <li>Требовать исправления неточных данных</li>
            <li>Требовать удаления персональных данных</li>
            <li>Отозвать согласие на обработку персональных данных</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Cookies</h2>
          <p className="text-gray-700">
            Сайт использует файлы cookie для улучшения работы и персонализации опыта пользователя. Вы можете настроить браузер для отказа от cookies, однако это может ограничить функциональность Сайта.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Контакты</h2>
          <p className="text-gray-700">
            По вопросам, связанным с обработкой персональных данных, вы можете обратиться к нам через форму обратной связи на Сайте или по контактным данным, указанным в разделе «Контакты».
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Изменения в Политике</h2>
          <p className="text-gray-700">
            Мы оставляем за собой право вносить изменения в настоящую Политику конфиденциальности. Актуальная версия всегда доступна на данной странице.
          </p>
          <p className="text-gray-700 mt-2">
            <strong>Дата последнего обновления:</strong> {new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </section>
      </div>
    </div>
  );
}

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16" style={{ backgroundColor: "#FCFAF8" }}>
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Customer Service */}
          <div>
            <h3 className="font-bold mb-4">Обслуживание клиентов</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/contact" className="hover:text-gray-600">
                  Связаться с нами
                </Link>
              </li>
              <li>
                <Link href="/track-order" className="hover:text-gray-600">
                  Отследить мой заказ
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-gray-600">
                  Часто задаваемые вопросы
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="hover:text-gray-600">
                  Доставка и возврат
                </Link>
              </li>
              <li>
                <Link href="/instructions" className="hover:text-gray-600">
                  Смотреть инструкции
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-gray-600">
                  О нас
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h3 className="font-bold mb-4">Политики</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="hover:text-gray-600">
                  Политика конфиденциальности
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-gray-600">
                  Условия и положения
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="font-bold mb-4">Социальные сети</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-600"
                >
                  Фейсбук
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-600"
                >
                  Инстаграм
                </a>
              </li>
              <li>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-600"
                >
                  Ютуб
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-bold mb-4">
              ПОЛУЧИТЕ ЭКСКЛЮЗИВНЫЕ ПРЕДЛОЖЕНИЯ
            </h3>
            <p className="text-sm mb-4">
              Подпишитесь на нашу рассылку, чтобы первыми получать новости о
              скидках, акциях и специальных предложениях BURKER WATCHES.
            </p>
            <form className="space-y-2">
              <input
                type="email"
                placeholder="Электронная почта"
                className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm"
              />
              <button
                type="submit"
                className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800 text-sm"
              >
                Подписаться
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
          <p>© Copyright 2026 BURKER WATCHES</p>
        </div>
      </div>
    </footer>
  );
}

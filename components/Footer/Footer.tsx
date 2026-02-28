"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Page } from "@/lib/types";

const DEFAULT_TITLES = {
  customerServiceTitle: "Обслуживание клиентов",
  policiesTitle: "Политики",
  socialTitle: "Социальные сети",
};

export default function Footer() {
  const [customerServicePages, setCustomerServicePages] = useState<Page[]>([]);
  const [policiesPages, setPoliciesPages] = useState<Page[]>([]);
  const [titles, setTitles] = useState(DEFAULT_TITLES);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);
  const [newsletterError, setNewsletterError] = useState("");
  const [newsletterLoading, setNewsletterLoading] = useState(false);

  useEffect(() => {
    loadPages();
    fetch("/api/footer")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => data && setTitles(data))
      .catch(() => {});
  }, []);

  const loadPages = async () => {
    try {
      // Загружаем страницы категории "Обслуживание клиентов"
      const customerServiceResponse = await fetch(
        "/api/pages?category=customer-service&published=true"
      );
      if (customerServiceResponse.ok) {
        const customerServiceData = await customerServiceResponse.json();
        setCustomerServicePages(customerServiceData.pages || []);
      }

      // Загружаем страницы категории "Политики"
      const policiesResponse = await fetch(
        "/api/pages?category=policies&published=true"
      );
      if (policiesResponse.ok) {
        const policiesData = await policiesResponse.json();
        setPoliciesPages(policiesData.pages || []);
      }
    } catch (error) {
      console.error("Error loading footer pages:", error);
    }
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterError("");
    setNewsletterLoading(true);

    try {
      const response = await fetch("/api/subscribers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: newsletterEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setNewsletterSubmitted(true);
        setNewsletterEmail("");
        setTimeout(() => setNewsletterSubmitted(false), 3000);
      } else {
        setNewsletterError(data.error || "Ошибка при подписке");
      }
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      setNewsletterError("Ошибка при подписке. Попробуйте позже.");
    } finally {
      setNewsletterLoading(false);
    }
  };

  return (
    <footer className="mt-16" style={{ backgroundColor: "#FCFAF8" }}>
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Customer Service */}
          <div>
            <h3 className="font-bold mb-4">{titles.customerServiceTitle}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/contact" className="hover:text-gray-600">
                  Форма обратной связи
                </Link>
              </li>
              {customerServicePages.length > 0 &&
                customerServicePages.map((page) => (
                  <li key={page.id}>
                    <Link href={`/${page.slug}`} className="hover:text-gray-600">
                      {page.title}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h3 className="font-bold mb-4">{titles.policiesTitle}</h3>
            {policiesPages.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {policiesPages.map((page) => (
                  <li key={page.id}>
                    <Link href={`/${page.slug}`} className="hover:text-gray-600">
                      {page.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Нет опубликованных страниц</p>
            )}
          </div>

          {/* Social Media */}
          <div>
            <h3 className="font-bold mb-4">{titles.socialTitle}</h3>
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
              скидках, акциях и специальных предложениях Mira Brands | Burker.
            </p>
            {newsletterSubmitted && (
              <p className="text-green-600 text-xs mb-2">Вы успешно подписались!</p>
            )}
            {newsletterError && (
              <p className="text-red-600 text-xs mb-2">{newsletterError}</p>
            )}
            <form onSubmit={handleNewsletterSubmit} className="space-y-2">
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => {
                  setNewsletterEmail(e.target.value);
                  setNewsletterError("");
                }}
                placeholder="Электронная почта"
                className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm"
                required
                disabled={newsletterLoading}
              />
              <button
                type="submit"
                disabled={newsletterLoading}
                className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {newsletterLoading ? "..." : "Подписаться"}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
          <p>© 2026 Mira Brands | Burker</p>
        </div>
      </div>
    </footer>
  );
}

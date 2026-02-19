"use client";

import { useState } from "react";
import Link from "next/link";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [comment, setComment] = useState("");
  const [agreePd, setAgreePd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          contact,
          comment,
          agreePd,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSent(true);
        setName("");
        setContact("");
        setComment("");
        setAgreePd(false);
      } else {
        setError(data.error || "Ошибка при отправке");
      }
    } catch {
      setError("Ошибка при отправке. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-green-600 font-semibold text-lg mb-4">
          Сообщение отправлено
        </div>
        <p className="text-gray-600 mb-6">
          Мы получили ваше сообщение и свяжемся с вами в ближайшее время.
        </p>
        <Link
          href="/"
          className="inline-block bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 transition-colors"
        >
          На главную
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2">
          Имя *
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
          placeholder="Ваше имя"
          required
        />
      </div>

      <div>
        <label htmlFor="contact" className="block text-sm font-medium mb-2">
          Контакт для связи (Телеграм или телефон) *
        </label>
        <input
          id="contact"
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
          placeholder="@username или +7 (999) 123-45-67"
          required
        />
      </div>

      <div>
        <label htmlFor="comment" className="block text-sm font-medium mb-2">
          Комментарий *
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="w-full border border-gray-300 rounded-md px-3 py-2 resize-y"
          placeholder="Ваше сообщение"
          required
        />
      </div>

      <div className="flex items-start gap-3">
        <input
          id="agreePd"
          type="checkbox"
          checked={agreePd}
          onChange={(e) => setAgreePd(e.target.checked)}
          className="mt-1 rounded border-gray-300"
        />
        <label htmlFor="agreePd" className="text-sm text-gray-700">
          Соглашаюсь с{" "}
          <Link href="/privacy" className="text-black underline hover:no-underline">
            обработкой персональных данных
          </Link>
          *
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-black text-white py-3 rounded-md hover:bg-gray-800 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Отправка..." : "Отправить"}
      </button>
    </form>
  );
}

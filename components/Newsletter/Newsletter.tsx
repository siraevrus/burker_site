"use client";

import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setEmail("");
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <section className="py-12" style={{ backgroundColor: "#FCFAF8" }}>
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            ПОЛУЧИТЕ ЭКСКЛЮЗИВНЫЕ ПРЕДЛОЖЕНИЯ
          </h2>
          <p className="text-gray-600 mb-6">
            Подпишитесь на нашу рассылку, чтобы первыми получать новости о
            скидках, акциях и специальных предложениях BURKER WATCHES.
          </p>
          {submitted && (
            <p className="text-green-600 mb-4">Этот клиент уже подписан</p>
          )}
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Электронная почта"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
              required
            />
            <button
              type="submit"
              className="bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 transition-colors"
            >
              Подписаться
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

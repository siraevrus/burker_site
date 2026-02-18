"use client";

import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/subscribers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
        setEmail("");
        setTimeout(() => setSubmitted(false), 3000);
      } else {
        setError(data.error || "Ошибка при подписке");
      }
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      setError("Ошибка при подписке. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
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
            скидках, акциях и специальных предложениях MiraShop | Burker.
          </p>
          {submitted && (
            <p className="text-green-600 mb-4">Вы успешно подписались на рассылку!</p>
          )}
          {error && (
            <p className="text-red-600 mb-4">{error}</p>
          )}
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="Электронная почта"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
              required
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "..." : "Подписаться"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";

export default function EmailVerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loadUser = useStore((state) => state.loadUser);
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;

    setCode(newCode);

    // Автоматический переход на следующий input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join("");

    if (fullCode.length !== 6) {
      setError("Введите полный код");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code: fullCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Неверный код");
        setLoading(false);
        return;
      }

      // Успешная верификация - загружаем данные пользователя и редирект на главную
      await loadUser();
      window.location.href = "/";
    } catch (error) {
      console.error("Verification error:", error);
      setError("Ошибка при верификации. Попробуйте позже.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");

    try {
      const response = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Ошибка при отправке кода");
        setResending(false);
        return;
      }

      alert("Код отправлен повторно. Проверьте консоль сервера.");
      setResending(false);
    } catch (error) {
      console.error("Resend error:", error);
      setError("Ошибка при отправке кода");
      setResending(false);
    }
  };

  useEffect(() => {
    // Фокус на первый input при загрузке
    document.getElementById("code-0")?.focus();
  }, []);

  if (!email) {
    return (
      <div className="text-center">
        <p className="text-red-600">Email не указан</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Подтверждение email</h2>
        <p className="text-gray-600 mb-2">
          Мы отправили код подтверждения на <strong>{email}</strong>
        </p>
        <p className="text-xs text-gray-500 mb-4">
          В режиме разработки проверьте консоль сервера для получения кода
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="flex justify-center gap-2">
        {code.map((digit, index) => (
          <input
            key={index}
            id={`code-${index}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleCodeChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-md focus:border-black focus:outline-none"
          />
        ))}
      </div>

      <button
        type="submit"
        disabled={loading || code.join("").length !== 6}
        className="w-full bg-black text-white py-3 rounded-md hover:bg-gray-800 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Проверка..." : "Подтвердить"}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-sm text-gray-600 hover:text-black disabled:opacity-50"
        >
          {resending ? "Отправка..." : "Отправить код повторно"}
        </button>
      </div>
    </form>
  );
}

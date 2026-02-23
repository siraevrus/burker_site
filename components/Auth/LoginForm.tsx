"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

export default function LoginForm({ onSwitchToRegister }: LoginFormProps = {}) {
  const router = useRouter();
  const loadUser = useStore((state) => state.loadUser);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresVerification) {
          // Редирект на верификацию
          router.push(
            `/verify-email?email=${encodeURIComponent(formData.email)}`
          );
          return;
        }
        setError(data.error || "Ошибка при входе");
        setLoading(false);
        return;
      }

      // Успешный вход - загружаем данные пользователя и переходим на главную
      await loadUser();
      router.push("/");
    } catch (error) {
      console.error("Login error:", error);
      setError("Ошибка при входе. Попробуйте позже.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2">
          Электронная почта
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value })
          }
          className="w-full border border-gray-300 rounded-md px-3 py-2"
          placeholder="your@email.com"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-2">
          Пароль
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10"
            placeholder="Введите пароль"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
            aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
          >
            {showPassword ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.58 10.58a2 2 0 002.83 2.83" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.88 5.09A9.77 9.77 0 0112 5c5 0 9 4 10 7a11.83 11.83 0 01-4.13 5.94" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.1 6.1A11.85 11.85 0 002 12c1 3 5 7 10 7a9.77 9.77 0 004.25-.93" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="text-right">
        <Link
          href="/forgot-password"
          className="text-sm text-gray-600 hover:text-black"
        >
          Забыли пароль?
        </Link>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-black text-white py-3 rounded-md hover:bg-gray-800 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Вход..." : "Войти"}
      </button>

      {onSwitchToRegister && (
        <p className="text-sm text-center text-gray-600 mt-4">
          Нет аккаунта?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-black hover:underline"
          >
            Зарегистрироваться
          </button>
        </p>
      )}
    </form>
  );
}

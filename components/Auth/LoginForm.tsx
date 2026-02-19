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
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          className="w-full border border-gray-300 rounded-md px-3 py-2"
          placeholder="Введите пароль"
          required
        />
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

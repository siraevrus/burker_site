"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [formData, setFormData] = useState({
    code: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    if (formData.password.length < 6) {
      setError("Пароль должен содержать минимум 6 символов");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code: formData.code,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Ошибка при сбросе пароля");
        setLoading(false);
        return;
      }

      // Успешный сброс - редирект на страницу входа
      router.push("/login?passwordReset=true");
    } catch (error) {
      console.error("Reset password error:", error);
      setError("Ошибка при сбросе пароля. Попробуйте позже.");
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Сброс пароля
        </h1>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            {email && (
              <div className="text-sm text-gray-600 mb-4">
                Email: <strong>{email}</strong>
              </div>
            )}

            <div>
              <label htmlFor="code" className="block text-sm font-medium mb-2">
                Код подтверждения
              </label>
              <input
                id="code"
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Введите код из email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Новый пароль
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
                  placeholder="Минимум 6 символов"
                  minLength={6}
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

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium mb-2"
              >
                Подтвердите пароль
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10"
                  placeholder="Повторите пароль"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                  aria-label={showConfirmPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showConfirmPassword ? (
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-3 rounded-md hover:bg-gray-800 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Сброс пароля..." : "Сбросить пароль"}
            </button>

            <p className="text-sm text-center text-gray-600">
              <Link href="/login" className="text-black hover:underline">
                Вернуться к входу
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-center">
            Сброс пароля
          </h1>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <p className="text-center text-gray-600">Загрузка...</p>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}

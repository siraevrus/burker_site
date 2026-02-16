"use client";

/**
 * Клиентские утилиты для работы с авторизацией
 */

/**
 * Сохранение токена в localStorage (для клиентской части)
 */
export function setAuthTokenClient(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("auth_token", token);
  }
}

/**
 * Получение токена из localStorage
 */
export function getAuthTokenClient(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("auth_token");
  }
  return null;
}

/**
 * Удаление токена из localStorage
 */
export function removeAuthTokenClient() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
  }
}

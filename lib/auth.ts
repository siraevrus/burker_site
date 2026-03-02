import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_EXPIRES_IN = "7d";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    throw new Error("JWT_SECRET must be set in production");
  }
  return secret || "your-secret-key-change-in-production";
}

/**
 * Хеширование пароля
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Проверка пароля
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Создание JWT токена
 */
export function createToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Верификация JWT токена
 */
export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    return jwt.verify(token, getJwtSecret()) as { userId: string; email: string };
  } catch (error) {
    return null;
  }
}

/**
 * Получение текущего пользователя из токена (для Server Components)
 */
export async function getCurrentUser(): Promise<{ userId: string; email: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    
    if (!token) {
      return null;
    }
    
    return verifyToken(token);
  } catch (error) {
    return null;
  }
}

// Функции setAuthToken и removeAuthToken теперь используются напрямую в API routes
// через cookies() из next/headers для лучшей совместимости

/**
 * Генерация кода верификации (6 цифр)
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

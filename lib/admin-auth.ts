import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const ADMIN_TOKEN_COOKIE = "admin_token";
const ADMIN_TOKEN_EXPIRES_IN = "12h";

function getAdminJwtSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    throw new Error("ADMIN_JWT_SECRET or JWT_SECRET must be set in production");
  }
  return secret || "change-admin-secret";
}

function getAdminCredentials(): { username: string; password: string } {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const hasAuth = (username && (password || passwordHash));
  if (process.env.NODE_ENV === "production" && !hasAuth) {
    throw new Error("ADMIN_USERNAME and (ADMIN_PASSWORD or ADMIN_PASSWORD_HASH) must be set in production");
  }
  return {
    username: username || "admin",
    password: password || "admin123",
  };
}

type AdminTokenPayload = {
  role: "admin";
  username: string;
};

export async function verifyAdminCredentials(username: string, password: string): Promise<boolean> {
  const { username: adminUsername, password: adminPassword } = getAdminCredentials();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  if (passwordHash) {
    const match = await bcrypt.compare(password, passwordHash);
    return username === adminUsername && match;
  }
  return username === adminUsername && password === adminPassword;
}

export function createAdminToken(username: string): string {
  return jwt.sign({ role: "admin", username } satisfies AdminTokenPayload, getAdminJwtSecret(), {
    expiresIn: ADMIN_TOKEN_EXPIRES_IN,
  });
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    const payload = jwt.verify(token, getAdminJwtSecret()) as AdminTokenPayload;
    if (payload.role !== "admin") {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function getCurrentAdmin(): Promise<AdminTokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_TOKEN_COOKIE)?.value;
    if (!token) return null;
    return verifyAdminToken(token);
  } catch {
    return null;
  }
}

export const adminAuthConfig = {
  cookieName: ADMIN_TOKEN_COOKIE,
  maxAgeSeconds: 60 * 60 * 12,
};

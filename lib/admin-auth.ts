import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const ADMIN_TOKEN_COOKIE = "admin_token";
const ADMIN_TOKEN_EXPIRES_IN = "12h";
const ADMIN_JWT_SECRET =
  process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "change-admin-secret";

type AdminTokenPayload = {
  role: "admin";
  username: string;
};

export function verifyAdminCredentials(username: string, password: string): boolean {
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  return username === adminUsername && password === adminPassword;
}

export function createAdminToken(username: string): string {
  return jwt.sign({ role: "admin", username } satisfies AdminTokenPayload, ADMIN_JWT_SECRET, {
    expiresIn: ADMIN_TOKEN_EXPIRES_IN,
  });
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    const payload = jwt.verify(token, ADMIN_JWT_SECRET) as AdminTokenPayload;
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

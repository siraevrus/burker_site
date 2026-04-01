import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  generateVerificationCode,
} from "@/lib/auth";

// ─── Хеширование и проверка пароля ───────────────────────────────────────────

describe("hashPassword / verifyPassword", () => {
  it("хеширует пароль и успешно верифицирует правильный пароль", async () => {
    const password = "SuperSecret123!";
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash.startsWith("$2")).toBe(true); // bcrypt-хеш

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it("возвращает false при неверном пароле", async () => {
    const hash = await hashPassword("correctPassword");
    const isValid = await verifyPassword("wrongPassword", hash);
    expect(isValid).toBe(false);
  });

  it("два хеша одного пароля отличаются (разная соль)", async () => {
    const hash1 = await hashPassword("samePassword");
    const hash2 = await hashPassword("samePassword");
    expect(hash1).not.toBe(hash2);
  });
});

// ─── JWT токен ────────────────────────────────────────────────────────────────

describe("createToken / verifyToken", () => {
  const payload = { userId: "user-123", email: "test@example.com" };

  it("создаёт токен и успешно верифицирует его", () => {
    const token = createToken(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3); // JWT = header.payload.signature

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(payload.userId);
    expect(decoded?.email).toBe(payload.email);
  });

  it("возвращает null для невалидного токена", () => {
    const result = verifyToken("invalid.token.here");
    expect(result).toBeNull();
  });

  it("возвращает null для пустой строки", () => {
    const result = verifyToken("");
    expect(result).toBeNull();
  });

  it("возвращает null для подделанного токена", () => {
    const token = createToken(payload);
    const parts = token.split(".");
    // Меняем подпись
    const tampered = `${parts[0]}.${parts[1]}.invalidsignature`;
    expect(verifyToken(tampered)).toBeNull();
  });
});

// ─── Код верификации ──────────────────────────────────────────────────────────

describe("generateVerificationCode", () => {
  it("генерирует 6-значный числовой код", () => {
    const code = generateVerificationCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("генерирует разные коды при повторных вызовах", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateVerificationCode()));
    // Вероятность коллизии 20 из 900 000 — практически нулевая
    expect(codes.size).toBeGreaterThan(1);
  });

  it("код в диапазоне 100000–999999", () => {
    for (let i = 0; i < 50; i++) {
      const num = Number(generateVerificationCode());
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThanOrEqual(999999);
    }
  });
});

import { test, expect } from "@playwright/test";

/**
 * E2E тесты: Авторизация
 *
 * Перед запуском убедитесь, что в БД существует тестовый пользователь:
 *   email: test@burker.ru
 *   password: TestPassword123!
 *   emailVerified: true
 *
 * Создать через: npm run db:seed:test (или вручную через prisma studio)
 */

const TEST_USER = {
  email: "test@burker.ru",
  password: "TestPassword123!",
};

test.describe("Авторизация", () => {
  test.beforeEach(async ({ page }) => {
    // Очищаем cookies перед каждым тестом
    await page.context().clearCookies();
  });

  test("страница входа открывается корректно", async ({ page }) => {
    await page.goto("/login");

    await expect(page).toHaveTitle(/Burker/i);
    await expect(page.getByRole("button", { name: "Войти" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Регистрация" })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/пароль/i)).toBeVisible();
  });

  test("успешный вход с корректными данными", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder(/email/i).fill(TEST_USER.email);
    await page.getByPlaceholder(/пароль/i).fill(TEST_USER.password);

    // Нажимаем кнопку «Войти» внутри формы (не таб)
    await page.getByRole("button", { name: /^Войти$/ }).last().click();

    // После успешного входа — редирект на главную или профиль
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("ошибка при неверном пароле", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder(/email/i).fill(TEST_USER.email);
    await page.getByPlaceholder(/пароль/i).fill("WrongPassword999!");

    await page.getByRole("button", { name: /^Войти$/ }).last().click();

    // Должно появиться сообщение об ошибке
    await expect(
      page.getByText(/неверный email или пароль/i)
    ).toBeVisible({ timeout: 5000 });

    // Остаёмся на странице логина
    await expect(page).toHaveURL(/\/login/);
  });

  test("ошибка при пустых полях", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: /^Войти$/ }).last().click();

    // Браузерная валидация или кастомная ошибка
    const emailInput = page.getByPlaceholder(/email/i);
    await expect(emailInput).toBeFocused();
  });

  test("ошибка при некорректном формате email", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder(/email/i).fill("notanemail");
    await page.getByPlaceholder(/пароль/i).fill(TEST_USER.password);
    await page.getByRole("button", { name: /^Войти$/ }).last().click();

    // Браузерная валидация email
    const emailInput = page.getByPlaceholder(/email/i);
    const validationMessage = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage
    );
    expect(validationMessage).not.toBe("");
  });

  test("переключение на таб Регистрация", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "Регистрация" }).click();

    await expect(page.getByRole("heading", { name: "Регистрация" })).toBeVisible();
    await expect(page).toHaveURL(/tab=register/);
  });

  test("выход из аккаунта после входа", async ({ page }) => {
    // Входим
    await page.goto("/login");
    await page.getByPlaceholder(/email/i).fill(TEST_USER.email);
    await page.getByPlaceholder(/пароль/i).fill(TEST_USER.password);
    await page.getByRole("button", { name: /^Войти$/ }).last().click();
    await expect(page).not.toHaveURL(/\/login/);

    // Выходим через профиль или кнопку выхода
    await page.goto("/profile");
    const logoutBtn = page.getByRole("button", { name: /выйти/i });
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await expect(page).toHaveURL("/");
    }
  });
});

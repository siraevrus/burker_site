import { test, expect, Page } from "@playwright/test";

/**
 * E2E тесты: Оформление заказа
 *
 * Тесты добавляют товар через localStorage (без клика по UI) для скорости,
 * затем проходят форму чекаута с тестовыми данными.
 *
 * ВАЖНО: тесты создают реальные заказы в БД.
 * Используйте тестовое окружение (BASE_URL=http://localhost:3000).
 */

// ─── Тестовые данные ──────────────────────────────────────────────────────────

const TEST_ORDER = {
  email: "test@burker.ru",
  phone: "+7(999)123-45-67",
  lastName: "Иванов",
  firstName: "Иван",
  middleName: "Иванович",
  inn: "123456789012",
  passportSeries: "4510",
  passportNumber: "123456",
  passportIssueDate: "2015-01-15",
  passportIssuedBy: "ОВД Тестового района г. Москвы",
};

// Тестовый товар — подставьте реальный productId из вашей БД
const TEST_CART_ITEM = {
  id: "test-product-id",
  name: "Diana Gold",
  collection: "Diana",
  subcategory: "Diana",
  price: 15000,
  originalPrice: 18000,
  discount: 16,
  colors: ["золото"],
  images: ["/diana_gold.webp"],
  inStock: true,
  soldOut: false,
  quantity: 1,
  selectedColor: "золото",
};

// ─── Хелпер: добавить товар в корзину через localStorage ─────────────────────

async function addItemToCartViaStorage(page: Page, item = TEST_CART_ITEM) {
  await page.goto("/");
  await page.evaluate((cartItem) => {
    const storage = {
      state: { cart: [cartItem] },
      version: 0,
    };
    localStorage.setItem("burker-cart-storage", JSON.stringify(storage));
  }, item);
}

// ─── Тесты ────────────────────────────────────────────────────────────────────

test.describe("Оформление заказа", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("burker-cart-storage"));
  });

  test("страница чекаута недоступна с пустой корзиной", async ({ page }) => {
    await page.goto("/checkout");

    // Должно показать «Корзина пуста» или редирект
    const isEmpty =
      (await page.getByText(/корзина пуста/i).isVisible()) ||
      (await page.url().includes("/cart")) ||
      (await page.url() === (process.env.BASE_URL || "http://localhost:3000") + "/");

    expect(isEmpty).toBe(true);
  });

  test("страница чекаута открывается с товаром в корзине", async ({ page }) => {
    await addItemToCartViaStorage(page);
    await page.goto("/checkout");

    await expect(page.getByRole("heading", { name: /оформление заказа/i })).toBeVisible({
      timeout: 10000,
    });

    // Форма содержит обязательные поля
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#phone")).toBeVisible();
    await expect(page.locator("#lastName")).toBeVisible();
    await expect(page.locator("#firstName")).toBeVisible();
    await expect(page.locator("#middleName")).toBeVisible();
  });

  test("заполнение всех полей формы тестовыми данными", async ({ page }) => {
    await addItemToCartViaStorage(page);
    await page.goto("/checkout");

    await expect(page.locator("#email")).toBeVisible({ timeout: 10000 });

    // Контактные данные
    await page.locator("#email").fill(TEST_ORDER.email);
    await page.locator("#phone").fill(TEST_ORDER.phone);

    // ФИО
    await page.locator("#lastName").fill(TEST_ORDER.lastName);
    await page.locator("#firstName").fill(TEST_ORDER.firstName);
    await page.locator("#middleName").fill(TEST_ORDER.middleName);

    // Паспортные данные
    await page.locator("#inn").fill(TEST_ORDER.inn);
    await page.locator("#passportSeries").fill(TEST_ORDER.passportSeries);
    await page.locator("#passportNumber").fill(TEST_ORDER.passportNumber);
    await page.locator("#passportIssueDate").fill(TEST_ORDER.passportIssueDate);
    await page.locator("#passportIssuedBy").fill(TEST_ORDER.passportIssuedBy);

    // Проверяем, что поля заполнены
    await expect(page.locator("#email")).toHaveValue(TEST_ORDER.email);
    await expect(page.locator("#lastName")).toHaveValue(TEST_ORDER.lastName);
    await expect(page.locator("#firstName")).toHaveValue(TEST_ORDER.firstName);
    await expect(page.locator("#inn")).toHaveValue(TEST_ORDER.inn);
    await expect(page.locator("#passportSeries")).toHaveValue(TEST_ORDER.passportSeries);
    await expect(page.locator("#passportNumber")).toHaveValue(TEST_ORDER.passportNumber);
    await expect(page.locator("#passportIssuedBy")).toHaveValue(TEST_ORDER.passportIssuedBy);
  });

  test("ошибка при отправке формы с некорректным ИНН", async ({ page }) => {
    await addItemToCartViaStorage(page);
    await page.goto("/checkout");

    await expect(page.locator("#email")).toBeVisible({ timeout: 10000 });

    await page.locator("#email").fill(TEST_ORDER.email);
    await page.locator("#phone").fill(TEST_ORDER.phone);
    await page.locator("#lastName").fill(TEST_ORDER.lastName);
    await page.locator("#firstName").fill(TEST_ORDER.firstName);
    await page.locator("#middleName").fill(TEST_ORDER.middleName);
    await page.locator("#inn").fill("123"); // Некорректный ИНН (меньше 12 цифр)
    await page.locator("#passportSeries").fill(TEST_ORDER.passportSeries);
    await page.locator("#passportNumber").fill(TEST_ORDER.passportNumber);
    await page.locator("#passportIssueDate").fill(TEST_ORDER.passportIssueDate);
    await page.locator("#passportIssuedBy").fill(TEST_ORDER.passportIssuedBy);

    // Нажимаем «Оформить заказ»
    await page.getByRole("button", { name: /оформить заказ/i }).click();

    // Должна появиться ошибка про ИНН
    await expect(page.getByText(/инн.*12 цифр/i)).toBeVisible({ timeout: 5000 });
  });

  test("итоговая сумма заказа отображается в блоке «Ваш заказ»", async ({ page }) => {
    await addItemToCartViaStorage(page);
    await page.goto("/checkout");

    await expect(page.getByRole("heading", { name: /ваш заказ/i })).toBeVisible({
      timeout: 10000,
    });

    // Должна быть сумма в рублях
    await expect(page.getByText(/₽/)).toBeVisible();
  });
});

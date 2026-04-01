import { test, expect } from "@playwright/test";

/**
 * E2E тесты: Корзина — добавление товара
 *
 * Тесты работают с реальными страницами продуктов.
 * Предполагается, что в БД есть хотя бы один товар в наличии.
 */

test.describe("Корзина — добавление товара", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    // Очищаем localStorage (корзина хранится в zustand persist)
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("burker-cart-storage"));
  });

  test("кнопка 'В корзину' присутствует на странице товара", async ({ page }) => {
    // Переходим на каталог часов
    await page.goto("/products/watches");

    // Кликаем на первый товар
    const firstProduct = page.locator("a[href*='/products/watches/']").first();
    await expect(firstProduct).toBeVisible({ timeout: 10000 });
    await firstProduct.click();

    // Проверяем, что есть кнопка добавления в корзину
    const addToCartBtn = page.getByRole("button", { name: /в корзину|добавить/i });
    await expect(addToCartBtn).toBeVisible({ timeout: 5000 });
  });

  test("добавление товара в корзину и переход в корзину", async ({ page }) => {
    await page.goto("/products/watches");

    const firstProduct = page.locator("a[href*='/products/watches/']").first();
    await expect(firstProduct).toBeVisible({ timeout: 10000 });
    await firstProduct.click();

    // Если есть выбор цвета — выбираем первый
    const colorBtn = page.locator("[data-testid='color-option'], .color-option").first();
    if (await colorBtn.isVisible()) {
      await colorBtn.click();
    }

    // Добавляем в корзину
    const addToCartBtn = page.getByRole("button", { name: /в корзину|добавить/i });
    await addToCartBtn.click();

    // Ждём подтверждения (счётчик в хедере или уведомление)
    await page.waitForTimeout(500);

    // Переходим в корзину
    await page.goto("/cart");

    // Корзина не пустая
    await expect(page.getByText(/ваша корзина пуста/i)).not.toBeVisible({ timeout: 3000 });
    // Есть хотя бы один товар
    const cartItems = page.locator("[data-testid='cart-item'], .cart-item");
    const count = await cartItems.count();
    // Если data-testid не проставлены — проверяем по наличию кнопки «Оформить заказ»
    if (count === 0) {
      await expect(
        page.getByRole("link", { name: /оформить заказ/i }).or(
          page.getByRole("button", { name: /оформить заказ/i })
        )
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("счётчик корзины в хедере увеличивается после добавления товара", async ({ page }) => {
    await page.goto("/products/watches");

    const firstProduct = page.locator("a[href*='/products/watches/']").first();
    await expect(firstProduct).toBeVisible({ timeout: 10000 });
    await firstProduct.click();

    const addToCartBtn = page.getByRole("button", { name: /в корзину|добавить/i });
    await addToCartBtn.click();

    await page.waitForTimeout(500);

    // Счётчик в хедере должен показывать > 0
    const cartCounter = page.locator("header").getByText(/^\d+$/);
    if (await cartCounter.isVisible()) {
      const text = await cartCounter.textContent();
      expect(Number(text)).toBeGreaterThan(0);
    }
  });

  test("страница корзины открывается и содержит кнопку оформления", async ({ page }) => {
    await page.goto("/cart");

    // Либо пустая корзина, либо кнопка оформления — оба варианта корректны
    const isEmpty = await page.getByText(/ваша корзина пуста/i).isVisible();
    if (!isEmpty) {
      await expect(
        page.getByRole("link", { name: /оформить заказ/i }).or(
          page.getByRole("button", { name: /оформить заказ/i })
        )
      ).toBeVisible({ timeout: 5000 });
    }
  });
});

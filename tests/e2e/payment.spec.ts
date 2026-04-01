import { test, expect } from "@playwright/test";

/**
 * E2E тесты: Страница оплаты
 *
 * Проверяем, что страница /order/{id}/pay открывается и содержит
 * форму оплаты (кнопку «Перейти к оплате (СБП)»).
 *
 * Для теста используется мок-ответ API заказа — реальный заказ в БД не нужен.
 */

test.describe("Страница оплаты", () => {
  // ─── Тест с мок-ответом API (не требует реального заказа) ──────────────────

  test("страница оплаты отображает форму СБП при наличии paymentLink", async ({ page }) => {
    const mockOrderId = "mock-order-id-12345";
    const mockToken = "mock-access-token";

    // Перехватываем запрос к API заказа и возвращаем тестовые данные
    await page.route(`**/api/orders/${mockOrderId}**`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          order: {
            id: mockOrderId,
            orderNumber: "burker_20260401_test_001",
            email: "test@burker.ru",
            firstName: "Иван",
            lastName: "Иванов",
            middleName: "Иванович",
            phone: "79991234567",
            cdekAddress: "г. Москва, ул. Тестовая, д. 1",
            inn: "123456789012",
            passportSeries: "4510",
            passportNumber: "123456",
            passportIssueDate: "2015-01-15",
            passportIssuedBy: "ОВД Тестового района",
            status: "pending",
            totalAmount: 15500,
            shippingCost: 500,
            paymentStatus: "pending",
            // Тестовая ссылка на оплату (не реальная)
            paymentLink: "https://securepay.tinkoff.ru/v2/sbp/test-payment-link",
            paymentId: "mock-payment-id",
            items: [
              {
                id: "item-1",
                orderId: mockOrderId,
                productId: "product-1",
                productName: "Diana Gold",
                productPrice: 15000,
                selectedColor: "золото",
                quantity: 1,
              },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto(`/order/${mockOrderId}/pay?token=${mockToken}`);

    // Заголовок страницы оплаты
    await expect(
      page.getByRole("heading", { name: /оплата заказа/i })
    ).toBeVisible({ timeout: 10000 });

    // Сумма к оплате
    await expect(page.getByText(/сумма к оплате/i)).toBeVisible();
    await expect(page.getByText(/₽/)).toBeVisible();

    // Кнопка перехода к оплате
    await expect(
      page.getByRole("link", { name: /перейти к оплате.*СБП/i })
    ).toBeVisible();

    // Ссылка ведёт на платёжный шлюз (не на наш сайт)
    const payBtn = page.getByRole("link", { name: /перейти к оплате.*СБП/i });
    const href = await payBtn.getAttribute("href");
    expect(href).toBeTruthy();
    expect(href).toContain("tinkoff");

    // Ссылка открывается в новой вкладке
    await expect(payBtn).toHaveAttribute("target", "_blank");
  });

  test("страница оплаты показывает сообщение если заказ уже оплачен", async ({ page }) => {
    const mockOrderId = "mock-paid-order-id";

    await page.route(`**/api/orders/${mockOrderId}**`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          order: {
            id: mockOrderId,
            orderNumber: "burker_20260401_paid_001",
            email: "test@burker.ru",
            firstName: "Иван",
            lastName: "Иванов",
            middleName: "Иванович",
            phone: "79991234567",
            cdekAddress: "г. Москва, ул. Тестовая, д. 1",
            inn: "123456789012",
            passportSeries: "4510",
            passportNumber: "123456",
            passportIssueDate: "2015-01-15",
            passportIssuedBy: "ОВД Тестового района",
            status: "paid",
            totalAmount: 15500,
            shippingCost: 500,
            paymentStatus: "paid", // Уже оплачен
            paymentLink: "https://securepay.tinkoff.ru/v2/sbp/test",
            items: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto(`/order/${mockOrderId}/pay`);

    await expect(
      page.getByRole("heading", { name: /заказ уже оплачен/i })
    ).toBeVisible({ timeout: 10000 });

    // Кнопки навигации
    await expect(
      page.getByRole("link", { name: /сводка по заказу/i })
    ).toBeVisible();
  });

  test("страница оплаты показывает ошибку при несуществующем заказе", async ({ page }) => {
    const fakeOrderId = "non-existent-order-id-xyz";

    await page.route(`**/api/orders/${fakeOrderId}**`, (route) => {
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "Заказ не найден" }),
      });
    });

    await page.goto(`/order/${fakeOrderId}/pay`);

    await expect(
      page.getByText(/заказ не найден/i)
    ).toBeVisible({ timeout: 10000 });

    // Кнопка «На главную»
    await expect(
      page.getByRole("link", { name: /на главную/i })
    ).toBeVisible();
  });

  test("страница оплаты показывает сообщение если ссылка не сформирована", async ({ page }) => {
    const mockOrderId = "mock-no-link-order";

    await page.route(`**/api/orders/${mockOrderId}**`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          order: {
            id: mockOrderId,
            orderNumber: "burker_20260401_nolink_001",
            email: "test@burker.ru",
            firstName: "Иван",
            lastName: "Иванов",
            middleName: "Иванович",
            phone: "79991234567",
            cdekAddress: "г. Москва, ул. Тестовая, д. 1",
            inn: "123456789012",
            passportSeries: "4510",
            passportNumber: "123456",
            passportIssueDate: "2015-01-15",
            passportIssuedBy: "ОВД Тестового района",
            status: "pending",
            totalAmount: 15500,
            shippingCost: 500,
            paymentStatus: "pending",
            paymentLink: null, // Ссылка не создана
            items: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto(`/order/${mockOrderId}/pay`);

    await expect(
      page.getByText(/ссылка не сформирована/i)
    ).toBeVisible({ timeout: 10000 });
  });
});

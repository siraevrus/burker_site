/**
 * Генерация PDF-чека по образцу receipt.pdf (ФФД 1.2).
 */

import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { getOrderById } from "./orders";
import { mapOrderToReceiptData } from "./receipt-data";

const ROBOTO_TTF_URL =
  "https://raw.githubusercontent.com/google/fonts/main/apache/roboto/Roboto-Regular.ttf";

let cachedFontBytes: ArrayBuffer | null = null;

async function getFontBytes(): Promise<ArrayBuffer> {
  if (cachedFontBytes) return cachedFontBytes;
  const res = await fetch(ROBOTO_TTF_URL);
  if (!res.ok) throw new Error("Failed to fetch font");
  cachedFontBytes = await res.arrayBuffer();
  return cachedFontBytes;
}

const MARGIN = 40;
const PAGE_WIDTH = 420;
const LINE_HEIGHT = 14;
const TITLE_SIZE = 12;
const BODY_SIZE = 9;
const SMALL_SIZE = 8;

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number
): void {
  page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });
}

export async function generateReceiptPdf(orderId: string): Promise<Buffer> {
  const order = await getOrderById(orderId);
  if (!order) throw new Error("Заказ не найден");

  const data = mapOrderToReceiptData(order);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  let font;
  try {
    const fontBytes = await getFontBytes();
    font = await doc.embedFont(fontBytes);
  } catch {
    font = await doc.embedFont(StandardFonts.Helvetica);
  }

  let page = doc.addPage([PAGE_WIDTH, 595]);
  let y = 595 - MARGIN;

  const writeLine = (text: string, size = BODY_SIZE) => {
    if (y < MARGIN) {
      page = doc.addPage([PAGE_WIDTH, 595]);
      y = 595 - MARGIN;
    }
    drawText(page, text, MARGIN, y, font, size);
    y -= size + 2;
  };

  const writeEmpty = () => {
    y -= LINE_HEIGHT / 2;
  };

  if (data.config.sellerName) writeLine(data.config.sellerName, TITLE_SIZE);
  if (data.config.sellerAddress) writeLine(data.config.sellerAddress);
  if (data.config.inn) writeLine(`ИНН ${data.config.inn}`);
  writeLine(`Место расчётов: ${data.config.siteUrl}`);
  writeEmpty();

  writeLine(`КАССОВЫЙ ЧЕК №${data.orderNumber}`, TITLE_SIZE);
  writeLine(`Приход ${data.dateTime}`);
  writeLine("признак ККТ для расчетов только в Интернет: да");
  writeEmpty();

  writeLine("Телефон или электронный адрес покупателя");
  writeLine(data.customerEmail || "—");
  writeLine("Адрес электронной почты отправителя чека");
  writeLine(data.config.senderEmail || "—");
  writeLine("применяемая система налогообложения");
  writeLine(data.config.taxationSystem || "УСН ДОХОД");
  writeLine('признак расчета в «Интернет» Да');
  writeEmpty();

  for (const item of data.items) {
    if (item.type === "product") {
      const eurStr =
        item.originalPriceEur != null
          ? `, ${item.originalPriceEur.toFixed(2)} EUR`
          : "";
      const rateStr =
        data.eurPerRub != null
          ? `, курс ЦБ на ${data.dateForCbr}: ${data.eurPerRub.toFixed(2)} RUB`
          : "";
      writeLine(
        `Заказ №${data.orderNumber}${eurStr}${rateStr}`.slice(0, 80)
      );
      writeLine(`${item.quantity} шт. х ${item.price.toFixed(2)}`);
      writeLine("общая стоимость позиции с учетом скидок и наценок");
      writeLine(item.amount.toFixed(2));
      writeLine("Ставка НДС не облагается");
      writeLine("способ расчета ПОЛНЫЙ РАСЧЕТ");
      writeLine("признак предмета расчета ТОВАР");
      writeLine(`ИНН поставщика ${data.config.supplierInn}`);
      writeLine(`Наименование поставщика ${data.config.supplierName}`);
      writeLine("признак агента по предмету расчета КОМИССИОНЕР");
    } else if (item.type === "commission") {
      writeLine(item.name.slice(0, 80));
      writeLine(`${item.quantity} шт. х ${item.price.toFixed(2)}`);
      writeLine("общая стоимость позиции с учетом скидок и наценок");
      writeLine(item.amount.toFixed(2));
      writeLine("Ставка НДС не облагается");
      writeLine("способ расчета ПОЛНЫЙ РАСЧЕТ");
      writeLine("признак предмета расчета АГЕНТСКОЕ ВОЗНАГРАЖДЕНИЕ");
    } else if (item.type === "shipping") {
      writeLine(`${item.name}`);
      writeLine(`${item.quantity} шт. х ${item.price.toFixed(2)}`);
      writeLine(item.amount.toFixed(2));
      writeLine("Ставка НДС не облагается");
      writeLine("способ расчета ПОЛНЫЙ РАСЧЕТ");
      writeLine("признак предмета расчета УСЛУГА");
    }
    writeEmpty();
  }

  writeLine(`ИТОГ ${data.totalAmount.toFixed(2)}`, TITLE_SIZE);
  writeLine(`НАЛИЧНЫМИ ${data.cashAmount.toFixed(2)}`);
  writeLine(`БЕЗНАЛИЧНЫМИ ${data.electronicAmount.toFixed(2)}`);
  writeLine("Зачет предоплаты (аванса) 0.00");
  writeLine("Сумма по чеку (БСО) в кредит 0.00");
  writeLine("Сумма по чеку (БСО) встречным предоставлением 0.00");
  writeLine(`Итого без НДС ${data.totalAmount.toFixed(2)}`);
  writeEmpty();

  writeLine("версия ФФД 1.2", SMALL_SIZE);
  if (order.fiscalReceiptId) {
    writeLine(`ID чека: ${order.fiscalReceiptId}`, SMALL_SIZE);
  }
  writeLine("Адрес для проверки чека: platformaofd.ru", SMALL_SIZE);
  writeLine("Сайт ФНС: https://www.nalog.gov.ru/", SMALL_SIZE);
  writeEmpty();
  writeLine("СПАСИБО ЗА ПОКУПКУ!", TITLE_SIZE);

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

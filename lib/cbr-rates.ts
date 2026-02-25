const CBR_API_BASE = "https://www.cbr.ru/scripts/XML_daily.asp";

function formatDateReq(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseCbrRates(xml: string): { usdPerRub: number; eurPerRub: number } {
  const valuteRegex = /<Valute[^>]*>[\s\S]*?<\/Valute>/gi;
  let usdPerRub: number | null = null;
  let eurPerRub: number | null = null;

  let match: RegExpExecArray | null;
  while ((match = valuteRegex.exec(xml)) !== null) {
    const block = match[0];
    const charCodeMatch = block.match(/<CharCode>(\w+)<\/CharCode>/i);
    const charCode = charCodeMatch ? charCodeMatch[1].toUpperCase() : "";
    if (charCode !== "USD" && charCode !== "EUR") continue;

    const valueMatch = block.match(/<Value>([^<]+)<\/Value>/);
    const nominalMatch = block.match(/<Nominal>(\d+)<\/Nominal>/);
    if (!valueMatch) continue;

    const valueStr = valueMatch[1].trim().replace(",", ".");
    const value = parseFloat(valueStr);
    if (Number.isNaN(value)) continue;

    const nominal = nominalMatch ? parseInt(nominalMatch[1], 10) : 1;
    const perUnit = nominal > 0 ? value / nominal : value;

    if (charCode === "USD") usdPerRub = perUnit;
    else if (charCode === "EUR") eurPerRub = perUnit;
  }

  if (usdPerRub == null || eurPerRub == null) {
    throw new Error(
      `Missing rates in CBR response: USD=${usdPerRub}, EUR=${eurPerRub}`
    );
  }
  return { usdPerRub, eurPerRub };
}

/**
 * Загружает курсы ЦБ РФ и возвращает в формате приложения:
 * rubRate = руб за 1 USD, eurRate = (руб за 1 USD) / (руб за 1 EUR)
 */
export async function fetchCbrRates(): Promise<{ eurRate: number; rubRate: number }> {
  const now = new Date();
  const dateReq = formatDateReq(now);
  const url = `${CBR_API_BASE}?date_req=${dateReq}`;

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`CBR API returned status ${response.status}`);
  }

  const xml = await response.text();
  const { usdPerRub, eurPerRub } = parseCbrRates(xml);

  const rubRate = usdPerRub;
  const eurRate = usdPerRub / eurPerRub;

  return { eurRate, rubRate };
}

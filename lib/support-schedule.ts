/**
 * Расписание виджета поддержки: интервалы по дням недели (как в JS getDay: 0=Вс … 6=Сб).
 */
export type SupportScheduleInterval = {
  days: number[];
  start: string; // "HH:mm"
  end: string;
};

function parseHm(s: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

export function parseScheduleJson(raw: string): SupportScheduleInterval[] {
  try {
    const j = JSON.parse(raw || "[]");
    if (!Array.isArray(j)) return [];
    const out: SupportScheduleInterval[] = [];
    for (const row of j) {
      if (!row || typeof row !== "object") continue;
      const days = Array.isArray(row.days) ? row.days.map((d: unknown) => Number(d)).filter((d: number) => d >= 0 && d <= 6) : [];
      const start = typeof row.start === "string" ? row.start : "";
      const end = typeof row.end === "string" ? row.end : "";
      if (!days.length || !parseHm(start) || !parseHm(end)) continue;
      out.push({ days, start, end });
    }
    return out;
  } catch {
    return [];
  }
}

function minutesOfDay(h: number, m: number): number {
  return h * 60 + m;
}

function getDayAndMinutesInTimeZone(date: Date, timeZone: string): { dow: number; minutes: number } {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dow = dayMap[wd] ?? 0;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  let hour = 0;
  let minute = 0;
  for (const p of parts) {
    if (p.type === "hour") hour = parseInt(p.value, 10);
    if (p.type === "minute") minute = parseInt(p.value, 10);
  }
  return { dow, minutes: minutesOfDay(hour, minute) };
}

function timeInRange(minutes: number, start: string, end: string): boolean {
  const a = parseHm(start);
  const b = parseHm(end);
  if (!a || !b) return false;
  const s = minutesOfDay(a.h, a.m);
  const e = minutesOfDay(b.h, b.m);
  if (s <= e) return minutes >= s && minutes <= e;
  return minutes >= s || minutes <= e;
}

/** Пустой массив интервалов = круглосуточно (всегда true). */
export function isWithinSupportSchedule(
  date: Date,
  timeZone: string,
  intervals: SupportScheduleInterval[]
): boolean {
  if (!intervals.length) return true;
  const { dow, minutes } = getDayAndMinutesInTimeZone(date, timeZone);
  for (const iv of intervals) {
    if (!iv.days.includes(dow)) continue;
    if (timeInRange(minutes, iv.start, iv.end)) return true;
  }
  return false;
}

/** Порядок дней в форме: пн … вс (getDay: 1…6, 0). */
export const WEEKDAY_ORDER: readonly number[] = [1, 2, 3, 4, 5, 6, 0] as const;

export const WEEKDAY_LABELS: Record<number, string> = {
  1: "Понедельник",
  2: "Вторник",
  3: "Среда",
  4: "Четверг",
  5: "Пятница",
  6: "Суббота",
  0: "Воскресенье",
};

const DEFAULT_START = "10:00";
const DEFAULT_END = "19:00";

export type DayScheduleRow = {
  day: number;
  closed: boolean;
  start: string;
  end: string;
};

/** Разбор JSON расписания в строки по дням. Пустой массив = круглосуточно. */
export function scheduleJsonToDayRows(raw: string): { roundTheClock: boolean; rows: DayScheduleRow[] } {
  const intervals = parseScheduleJson(raw);
  if (intervals.length === 0) {
    return {
      roundTheClock: true,
      rows: WEEKDAY_ORDER.map((day) => ({
        day,
        closed: day === 0 || day === 6,
        start: DEFAULT_START,
        end: DEFAULT_END,
      })),
    };
  }
  const rows: DayScheduleRow[] = WEEKDAY_ORDER.map((day) => {
    const iv = intervals.find((i) => i.days.includes(day));
    if (!iv) {
      return { day, closed: true, start: DEFAULT_START, end: DEFAULT_END };
    }
    return { day, closed: false, start: iv.start, end: iv.end };
  });
  return { roundTheClock: false, rows };
}

function mergeSameTimeRows(rows: DayScheduleRow[]): SupportScheduleInterval[] {
  const byKey = new Map<string, number[]>();
  for (const r of rows) {
    if (r.closed) continue;
    const start = r.start.trim();
    const end = r.end.trim();
    if (!parseHm(start) || !parseHm(end)) continue;
    const key = `${start}|${end}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(r.day);
  }
  const out: SupportScheduleInterval[] = [];
  for (const [key, days] of byKey) {
    const [start, end] = key.split("|");
    const order = (d: number) => (d === 0 ? 7 : d);
    days.sort((a, b) => order(a) - order(b));
    out.push({ days, start, end });
  }
  return out;
}

/** Сборка JSON для сохранения. При roundTheClock — круглосуточно (`[]`). */
export function dayRowsToScheduleJson(rows: DayScheduleRow[], roundTheClock: boolean): string {
  if (roundTheClock) return "[]";
  const intervals = mergeSameTimeRows(rows);
  return JSON.stringify(intervals);
}

/** Проверка перед сохранением: не «по дням», если все выходные. */
export function scheduleRowsHaveWorkingDay(rows: DayScheduleRow[], roundTheClock: boolean): boolean {
  if (roundTheClock) return true;
  return rows.some((r) => !r.closed && parseHm(r.start.trim()) && parseHm(r.end.trim()));
}

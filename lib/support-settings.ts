import { prisma } from "@/lib/db";
import { isWithinSupportSchedule, parseScheduleJson } from "@/lib/support-schedule";

export async function getSupportWidgetSettingsRow() {
  let row = await prisma.supportWidgetSettings.findUnique({ where: { id: "single" } });
  if (!row) {
    row = await prisma.supportWidgetSettings.create({
      data: {
        id: "single",
        offlineMessage: "Мы ответим в ближайшее рабочее время.",
        welcomeTitle: "Поддержка",
      },
    });
  }
  return row;
}

export async function getPublicWidgetConfig() {
  const row = await getSupportWidgetSettingsRow();
  const intervals = parseScheduleJson(row.scheduleJson);
  const now = new Date();
  const isWithinSchedule = isWithinSupportSchedule(now, row.timezone, intervals);
  return {
    enabled: row.enabled,
    timezone: row.timezone,
    isWithinSchedule,
    offlineMessage: row.offlineMessage,
    welcomeTitle: row.welcomeTitle,
  };
}

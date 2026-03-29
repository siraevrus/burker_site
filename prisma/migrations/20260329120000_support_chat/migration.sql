-- CreateTable
CREATE TABLE "SupportChatSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "visitorToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "userId" TEXT,
    "visitorName" TEXT,
    "visitorEmail" TEXT,
    "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "hasUnreadForAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupportChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SupportChatSession_visitorToken_key" ON "SupportChatSession"("visitorToken");
CREATE INDEX "SupportChatSession_status_lastMessageAt_idx" ON "SupportChatSession"("status", "lastMessageAt");
CREATE INDEX "SupportChatSession_visitorToken_idx" ON "SupportChatSession"("visitorToken");

-- CreateTable
CREATE TABLE "SupportChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SupportChatSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SupportChatMessage_sessionId_createdAt_idx" ON "SupportChatMessage"("sessionId", "createdAt");

-- CreateTable
CREATE TABLE "SupportWidgetSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Moscow',
    "scheduleJson" TEXT NOT NULL DEFAULT '[]',
    "offlineMessage" TEXT NOT NULL,
    "welcomeTitle" TEXT NOT NULL DEFAULT 'Поддержка',
    "telegramNotifyOn" TEXT NOT NULL DEFAULT 'every_visitor',
    "updatedAt" DATETIME NOT NULL
);

INSERT OR IGNORE INTO "SupportWidgetSettings" ("id", "enabled", "timezone", "scheduleJson", "offlineMessage", "welcomeTitle", "telegramNotifyOn", "updatedAt")
VALUES ('single', true, 'Europe/Moscow', '[]', 'Мы ответим в ближайшее рабочее время.', 'Поддержка', 'every_visitor', CURRENT_TIMESTAMP);

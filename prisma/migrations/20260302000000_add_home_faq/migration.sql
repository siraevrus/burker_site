-- CreateTable
CREATE TABLE "HomeFaq" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL DEFAULT 'Вопрос-Ответ',
    "content" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);

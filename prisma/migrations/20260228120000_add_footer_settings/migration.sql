-- CreateTable
CREATE TABLE "FooterSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerServiceTitle" TEXT NOT NULL DEFAULT 'Обслуживание клиентов',
    "policiesTitle" TEXT NOT NULL DEFAULT 'Политики',
    "socialTitle" TEXT NOT NULL DEFAULT 'Социальные сети',
    "updatedAt" DATETIME NOT NULL
);

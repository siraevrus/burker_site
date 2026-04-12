-- CreateTable
CREATE TABLE "HomePageSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'single',
    "bestsellersTitle" TEXT NOT NULL DEFAULT 'Бестселлеры',
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "HomePageSettings" ("id", "bestsellersTitle", "updatedAt")
VALUES ('single', 'Бестселлеры', datetime('now'));

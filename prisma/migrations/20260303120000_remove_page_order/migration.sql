-- AlterTable
-- Удаление колонки order из таблицы Page.
-- Если колонка не существует (например, на prod), можно пометить миграцию как применённую:
-- npx prisma migrate resolve --applied 20260303120000_remove_page_order

CREATE TABLE "new_Page" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_Page" ("id", "title", "slug", "content", "category", "published", "seoTitle", "seoDescription", "createdAt", "updatedAt")
SELECT "id", "title", "slug", "content", "category", "published", "seoTitle", "seoDescription", "createdAt", "updatedAt"
FROM "Page";

DROP TABLE "Page";

ALTER TABLE "new_Page" RENAME TO "Page";

CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");

-- CreateTable
CREATE TABLE "CatalogLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "subcategory" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" INTEGER NOT NULL DEFAULT 1,
    "showOnHome" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "CatalogLine_slug_key" ON "CatalogLine"("slug");
CREATE UNIQUE INDEX "CatalogLine_kind_subcategory_key" ON "CatalogLine"("kind", "subcategory");
CREATE INDEX "CatalogLine_kind_sortOrder_idx" ON "CatalogLine"("kind", "sortOrder");

-- Seed: текущие линии (slug зафиксированы — publishedAt задан)
INSERT INTO "CatalogLine" ("id", "kind", "subcategory", "slug", "sortOrder", "enabled", "showOnHome", "publishedAt", "createdAt", "updatedAt") VALUES
('cl_seed_diana', 'watches', 'Diana', 'diana', 10, 1, 0, datetime('now'), datetime('now'), datetime('now')),
('cl_seed_diana_p', 'watches', 'Diana Petite', 'diana-petite', 20, 1, 0, datetime('now'), datetime('now'), datetime('now')),
('cl_seed_sophie', 'watches', 'Sophie', 'sophie', 30, 1, 0, datetime('now'), datetime('now'), datetime('now')),
('cl_seed_olivia', 'watches', 'Olivia', 'olivia', 40, 1, 1, datetime('now'), datetime('now'), datetime('now')),
('cl_seed_macy', 'watches', 'Macy', 'macy', 50, 1, 1, datetime('now'), datetime('now'), datetime('now')),
('cl_seed_isabell', 'watches', 'Isabell', 'isabell', 60, 1, 1, datetime('now'), datetime('now'), datetime('now')),
('cl_seed_julia', 'watches', 'Julia', 'julia', 70, 1, 1, datetime('now'), datetime('now'), datetime('now')),
('cl_seed_ruby', 'watches', 'Ruby', 'ruby', 80, 1, 1, datetime('now'), datetime('now'), datetime('now')),
('cl_seed_victoria', 'watches', 'Victoria', 'victoria', 90, 1, 1, datetime('now'), datetime('now'), datetime('now')),
('cl_seed_olivia_p', 'watches', 'Olivia Petite', 'olivia-petite', 100, 1, 0, datetime('now'), datetime('now'), datetime('now')),
('cl_seed_macy_p', 'watches', 'Macy Petite', 'macy-petite', 110, 1, 0, datetime('now'), datetime('now'), datetime('now')),
('cl_seed_isabell_p', 'watches', 'Isabell Petite', 'isabell-petite', 120, 1, 0, datetime('now'), datetime('now'), datetime('now')),
('cl_seed_ruby_p', 'watches', 'Ruby Petite', 'ruby-petite', 130, 1, 0, datetime('now'), datetime('now'), datetime('now')),
('cl_seed_victoria_p', 'watches', 'Victoria Petite', 'victoria-petite', 140, 1, 0, datetime('now'), datetime('now'), datetime('now')),
('cl_seed_br', 'jewelry', 'Браслеты', 'bracelets', 10, 1, 0, datetime('now'), datetime('now'), datetime('now')),
('cl_seed_neck', 'jewelry', 'Ожерелье', 'necklaces', 20, 1, 0, datetime('now'), datetime('now'), datetime('now')),
('cl_seed_ear', 'jewelry', 'Серьги', 'earrings', 30, 1, 0, datetime('now'), datetime('now'), datetime('now')),
('cl_seed_ring', 'jewelry', 'Кольца', 'rings', 40, 1, 0, datetime('now'), datetime('now'), datetime('now'));

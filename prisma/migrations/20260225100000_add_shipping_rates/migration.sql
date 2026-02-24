-- CreateTable
CREATE TABLE "ShippingRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weightKg" REAL NOT NULL,
    "priceRub" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ShippingRate_weightKg_key" ON "ShippingRate"("weightKg");
CREATE INDEX "ShippingRate_weightKg_idx" ON "ShippingRate"("weightKg");

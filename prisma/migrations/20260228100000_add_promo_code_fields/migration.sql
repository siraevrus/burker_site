-- AlterTable PromoCode: add discountType, minOrderAmount, firstOrderOnly, usageLimit
ALTER TABLE "PromoCode" ADD COLUMN "discountType" TEXT NOT NULL DEFAULT 'fixed';
ALTER TABLE "PromoCode" ADD COLUMN "minOrderAmount" REAL;
ALTER TABLE "PromoCode" ADD COLUMN "firstOrderOnly" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PromoCode" ADD COLUMN "usageLimit" INTEGER NOT NULL DEFAULT 1;

-- AlterTable Order: add promoDiscountType
ALTER TABLE "Order" ADD COLUMN "promoDiscountType" TEXT;

-- CreateTable PromoCodeUsage
CREATE TABLE "PromoCodeUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promoCodeId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "orderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromoCodeUsage_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PromoCodeUsage_promoCodeId_idx" ON "PromoCodeUsage"("promoCodeId");
CREATE INDEX "PromoCodeUsage_email_idx" ON "PromoCodeUsage"("email");
CREATE INDEX "PromoCodeUsage_promoCodeId_email_idx" ON "PromoCodeUsage"("promoCodeId", "email");

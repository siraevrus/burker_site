-- AlterTable
ALTER TABLE "Order" ADD COLUMN "fiscalReceiptId" TEXT;
ALTER TABLE "Order" ADD COLUMN "fiscalReceiptStatus" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "commissionAmount" REAL;

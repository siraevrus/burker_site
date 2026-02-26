-- AlterTable
ALTER TABLE "Order" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "Order" ADD COLUMN "paymentId" TEXT;
ALTER TABLE "Order" ADD COLUMN "paymentLink" TEXT;
ALTER TABLE "Order" ADD COLUMN "paidAt" DATETIME;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "User" ADD COLUMN "deviceInfo" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "Order" ADD COLUMN "deviceInfo" TEXT;

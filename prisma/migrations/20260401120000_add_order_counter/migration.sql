-- CreateTable
CREATE TABLE "OrderCounter" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'order_seq',
    "value" INTEGER NOT NULL DEFAULT 0
);

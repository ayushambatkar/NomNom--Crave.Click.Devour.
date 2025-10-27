-- AlterTable
ALTER TABLE "public"."Cart" ADD COLUMN     "deliveryCharges" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

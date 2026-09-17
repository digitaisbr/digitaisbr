-- AlterTable
ALTER TABLE "produtos" ADD COLUMN     "parceiroId" TEXT;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_parceiroId_fkey" FOREIGN KEY ("parceiroId") REFERENCES "parceiros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

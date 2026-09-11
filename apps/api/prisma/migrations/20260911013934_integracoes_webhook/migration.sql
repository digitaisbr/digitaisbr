-- CreateEnum
CREATE TYPE "StatusEventoWebhook" AS ENUM ('RECEBIDO', 'PROCESSADO', 'DUPLICADO', 'REJEITADO', 'ERRO');

-- AlterTable
ALTER TABLE "parceiros" ADD COLUMN     "webhookSecret" TEXT;

-- CreateTable
CREATE TABLE "eventos_webhook" (
    "id" TEXT NOT NULL,
    "parceiroId" TEXT NOT NULL,
    "externoId" TEXT NOT NULL,
    "evento" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "StatusEventoWebhook" NOT NULL DEFAULT 'RECEBIDO',
    "erro" TEXT,
    "vendaId" TEXT,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processadoEm" TIMESTAMP(3),

    CONSTRAINT "eventos_webhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eventos_webhook_status_criadoEm_idx" ON "eventos_webhook"("status", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "eventos_webhook_parceiroId_externoId_evento_key" ON "eventos_webhook"("parceiroId", "externoId", "evento");

-- AddForeignKey
ALTER TABLE "eventos_webhook" ADD CONSTRAINT "eventos_webhook_parceiroId_fkey" FOREIGN KEY ("parceiroId") REFERENCES "parceiros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_webhook" ADD CONSTRAINT "eventos_webhook_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "vendas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Endereço completo do associado.
--
-- A associação emite nota fiscal, e nota exige logradouro, número, bairro,
-- cidade, UF e CEP. O campo único anterior guardava "Rua Brasil, 113" — o
-- conteúdo é preservado antes de a coluna sair.

ALTER TABLE "associados" ADD COLUMN "cep"         VARCHAR(9);
ALTER TABLE "associados" ADD COLUMN "logradouro"  TEXT;
ALTER TABLE "associados" ADD COLUMN "numero"      VARCHAR(20);
ALTER TABLE "associados" ADD COLUMN "complemento" TEXT;
ALTER TABLE "associados" ADD COLUMN "bairro"      TEXT;

-- separa "Rua Brasil, 113" em logradouro e número; sem vírgula, tudo vira logradouro
UPDATE "associados"
SET "logradouro" = CASE WHEN "endereco" LIKE '%,%'
                        THEN btrim(split_part("endereco", ',', 1))
                        ELSE btrim("endereco") END,
    "numero"     = CASE WHEN "endereco" LIKE '%,%'
                        THEN NULLIF(btrim(split_part("endereco", ',', 2)), '')
                        ELSE NULL END
WHERE "endereco" IS NOT NULL;

ALTER TABLE "associados" DROP COLUMN "endereco";

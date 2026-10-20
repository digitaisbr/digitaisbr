-- Prazo de transição ao desligar um parceiro.
--
-- Os produtos dele continuam nas vitrines que já os tinham até esta data, com
-- aviso ao visitante e ao associado; depois somem sozinhos, porque a consulta
-- compara com o momento atual. Nulo para todos os parceiros existentes, que
-- estão ativos.
ALTER TABLE "parceiros" ADD COLUMN "encerraEm" TIMESTAMP(3);

import { Module } from '@nestjs/common';
import { GamificacaoController } from './gamificacao.controller';
import { GamificacaoService } from './gamificacao.service';

@Module({
  controllers: [GamificacaoController],
  providers: [GamificacaoService],
  exports: [GamificacaoService],
})
export class GamificacaoModule {}

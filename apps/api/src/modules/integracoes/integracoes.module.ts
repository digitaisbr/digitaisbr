import { Module } from '@nestjs/common';
import { VendasModule } from '../vendas/vendas.module';
import { IntegracoesController } from './integracoes.controller';
import { IntegracoesService } from './integracoes.service';

@Module({
  imports: [VendasModule],
  controllers: [IntegracoesController],
  providers: [IntegracoesService],
})
export class IntegracoesModule {}

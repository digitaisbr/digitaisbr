import { Module } from '@nestjs/common';
import { CatalogoModule } from '../catalogo/catalogo.module';
import { ComissoesModule } from '../comissoes/comissoes.module';
import { LojasModule } from '../lojas/lojas.module';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';

@Module({
  imports: [LojasModule, CatalogoModule, ComissoesModule],
  controllers: [PortalController],
  providers: [PortalService],
})
export class PortalModule {}

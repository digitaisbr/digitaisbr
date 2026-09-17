import { Global, Module } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';

/**
 * Global porque a trilha atravessa todos os módulos de cadastro — importar
 * em cada um só acrescentaria repetição.
 */
@Global()
@Module({
  providers: [AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}

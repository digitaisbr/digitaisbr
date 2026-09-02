import { Module } from '@nestjs/common';
import { SuporteController } from './suporte.controller';
import { SuporteService } from './suporte.service';

@Module({
  controllers: [SuporteController],
  providers: [SuporteService],
  exports: [SuporteService],
})
export class SuporteModule {}

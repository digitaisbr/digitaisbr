import { Module } from '@nestjs/common';
import { ConteudosController } from './conteudos.controller';
import { ConteudosService } from './conteudos.service';

@Module({
  controllers: [ConteudosController],
  providers: [ConteudosService],
  exports: [ConteudosService],
})
export class ConteudosModule {}

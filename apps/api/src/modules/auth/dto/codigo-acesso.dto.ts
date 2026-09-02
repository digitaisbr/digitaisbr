import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CodigoAcessoDto {
  @ApiProperty({ description: 'Código de acesso da plataforma' })
  @IsString()
  codigo!: string;
}

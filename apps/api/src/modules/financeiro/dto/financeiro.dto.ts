import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoriaLancamento, MetodoSaque, StatusSaque, TipoLancamento } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class SolicitarSaqueDto {
  @ApiProperty({ example: 500 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(10, { message: 'O valor mínimo de saque é R$ 10,00.' })
  valor!: number;

  @ApiProperty({ enum: MetodoSaque })
  @IsEnum(MetodoSaque)
  metodo!: MetodoSaque;

  @ApiProperty({ example: 'ana@email.com', description: 'Chave PIX ou dados bancários' })
  @IsString()
  @MinLength(5)
  destino!: string;
}

export class AtualizarSaqueDto {
  @ApiProperty({ enum: StatusSaque })
  @IsEnum(StatusSaque)
  status!: StatusSaque;

  @ApiPropertyOptional({ description: 'Obrigatório quando o status é REJEITADO' })
  @IsOptional()
  @IsString()
  motivoRejeicao?: string;
}

export class FiltrarSaquesDto extends PaginationDto {
  @ApiPropertyOptional({ enum: StatusSaque })
  @IsOptional()
  @IsEnum(StatusSaque)
  status?: StatusSaque;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  associadoId?: string;
}

export class CriarLancamentoDto {
  @ApiProperty({ enum: TipoLancamento })
  @IsEnum(TipoLancamento)
  tipo!: TipoLancamento;

  @ApiProperty({ enum: CategoriaLancamento })
  @IsEnum(CategoriaLancamento)
  categoria!: CategoriaLancamento;

  @ApiProperty({ example: 'Infraestrutura — julho' })
  @IsString()
  @MinLength(3)
  descricao!: string;

  @ApiProperty({ example: 241.32 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valor!: number;

  @ApiProperty({ example: '2025-07-01' })
  @IsDateString()
  competencia!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referencia?: string;
}

export class PeriodoDto {
  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  de?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  ate?: string;
}

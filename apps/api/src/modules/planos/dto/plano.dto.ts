import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { NivelPlano } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, MinLength,
} from 'class-validator';

export class CriarPlanoDto {
  @ApiProperty({ enum: NivelPlano })
  @IsEnum(NivelPlano)
  nivel!: NivelPlano;

  @ApiProperty({ example: 'Básico' })
  @IsString()
  @MinLength(3)
  nome!: string;

  @ApiProperty({ example: 49.9 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  preco!: number;

  @ApiProperty()
  @IsString()
  descricao!: string;

  @ApiProperty({ type: [String], example: ['Benefícios básicos', 'Loja virtual padrão'] })
  @IsArray()
  @IsString({ each: true })
  recursos!: string[];

  @ApiPropertyOptional({ description: '-1 = ilimitado', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limiteProdutos?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  comissaoExtraPct?: number;

  @ApiPropertyOptional({ example: 'Email' })
  @IsOptional()
  @IsString()
  suporte?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ordem?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class AtualizarPlanoDto extends PartialType(CriarPlanoDto) {}

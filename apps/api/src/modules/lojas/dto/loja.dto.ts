import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { NivelPlano } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUrl, Matches, MinLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CriarLojaDto {
  @ApiProperty({ description: 'ID do associado dono da loja' })
  @IsString()
  associadoId!: string;

  @ApiProperty({ example: 'Loja Ana' })
  @IsString()
  @MinLength(3)
  nome!: string;

  @ApiProperty({ example: 'ana-silva' })
  @IsString()
  @Matches(/^[a-z0-9-]{3,60}$/, { message: 'Slug inválido: use letras minúsculas, números e hífens.' })
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descricao?: string;
}

export class AtualizarLojaDto extends PartialType(CriarLojaDto) {
  @ApiPropertyOptional({ example: '#1677ff' })
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'Cor deve estar no formato #RRGGBB.' })
  corPrimaria?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'URL de banner inválida.' })
  bannerUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'URL de logo inválida.' })
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ativa?: boolean;
}

export class FiltrarLojasDto extends PaginationDto {
  @ApiPropertyOptional({ enum: NivelPlano })
  @IsOptional()
  @IsEnum(NivelPlano)
  plano?: NivelPlano;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  ativa?: boolean;
}

export class AdicionarProdutoDto {
  @ApiProperty({ description: 'ID do produto' })
  @IsString()
  produtoId!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  destaque?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ordem?: number;
}

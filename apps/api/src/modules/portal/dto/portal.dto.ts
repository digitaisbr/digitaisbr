import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { RedeSocial, TipoDesconto } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUrl,
  Matches, Min, MinLength,
} from 'class-validator';

export class AtualizarPerfilDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  nome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 'Lifestyle' })
  @IsOptional()
  @IsString()
  nicho?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cidade?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  mostrarEmail?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  mostrarTelefone?: boolean;
}

export class PersonalizarLojaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  nome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descricao?: string;

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
}

export class CriarCupomDto {
  @ApiProperty({ example: 'MARIA10' })
  @IsString()
  @Matches(/^[A-Z0-9]{3,20}$/, { message: 'Código deve ter 3 a 20 caracteres, em maiúsculas.' })
  codigo!: string;

  @ApiProperty({ enum: TipoDesconto, default: TipoDesconto.PERCENTUAL })
  @IsEnum(TipoDesconto)
  tipoDesconto!: TipoDesconto;

  @ApiProperty({ example: 10, description: 'Percentual (0–100) ou valor em reais' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  desconto!: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  compraMinima?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limiteUsos?: number;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  validoAte?: string;
}

export class AtualizarCupomDto extends PartialType(CriarCupomDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  ativo?: boolean;
}

export class ConectarRedeDto {
  @ApiProperty({ enum: RedeSocial })
  @IsEnum(RedeSocial)
  rede!: RedeSocial;

  @ApiProperty({ example: '@ana-silva' })
  @IsString()
  handle!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'URL de perfil inválida.' })
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  seguidores?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  engajamento?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  posts?: number;
}

export class GerarLinkDto {
  @ApiProperty({ description: 'ID do produto a divulgar' })
  @IsString()
  produtoId!: string;
}

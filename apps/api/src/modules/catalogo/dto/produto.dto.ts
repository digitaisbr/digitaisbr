import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { NivelPlano, StatusProduto } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUrl, Max, Min, MinLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CriarProdutoDto {
  @ApiProperty({ example: 'Plano Odontológico Smile' })
  @IsString()
  @MinLength(3)
  nome!: string;

  @ApiProperty({ example: 'SAU-001' })
  @IsString()
  @MinLength(3)
  sku!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty({ description: 'ID da categoria' })
  @IsString()
  categoriaId!: string;

  @ApiProperty({ example: 89.9 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  preco!: number;

  @ApiProperty({ example: 15, description: 'Percentual de comissão' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  comissaoPct!: number;

  @ApiPropertyOptional({ default: -1, description: '-1 = estoque ilimitado' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-1)
  estoque?: number;

  @ApiPropertyOptional({ enum: NivelPlano, description: 'Plano mínimo; omitir = disponível a todos' })
  @IsOptional()
  @IsEnum(NivelPlano)
  planoMinimo?: NivelPlano;

  @ApiPropertyOptional({ enum: StatusProduto, default: StatusProduto.ATIVO })
  @IsOptional()
  @IsEnum(StatusProduto)
  status?: StatusProduto;

  @ApiPropertyOptional({ example: 'https://checkout.digitaisbr.com/prod-1' })
  @IsOptional()
  @IsUrl({}, { message: 'URL de checkout inválida.' })
  checkoutUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'URL de imagem inválida.' })
  imagemUrl?: string;
}

export class AtualizarProdutoDto extends PartialType(CriarProdutoDto) {}

export class FiltrarProdutosDto extends PaginationDto {
  @ApiPropertyOptional({ enum: StatusProduto })
  @IsOptional()
  @IsEnum(StatusProduto)
  status?: StatusProduto;

  @ApiPropertyOptional({ description: 'ID ou slug da categoria' })
  @IsOptional()
  @IsString()
  categoria?: string;

  @ApiPropertyOptional({ enum: NivelPlano, description: 'Filtra por exclusividade de plano' })
  @IsOptional()
  @IsEnum(NivelPlano)
  planoMinimo?: NivelPlano;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  precoMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  precoMax?: number;

  @ApiPropertyOptional({ description: 'Somente produtos com comissão acima de X%' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  comissaoMin?: number;

  @ApiPropertyOptional({ description: 'Somente produtos acessíveis ao plano do associado logado' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  apenasDisponiveis?: boolean;
}

export class CriarCategoriaDto {
  @ApiProperty({ example: 'Saúde & Bem-estar' })
  @IsString()
  @MinLength(2)
  nome!: string;

  @ApiPropertyOptional({ example: '#f5222d' })
  @IsOptional()
  @IsString()
  cor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ordem?: number;
}

export class AtualizarCategoriaDto extends PartialType(CriarCategoriaDto) {}

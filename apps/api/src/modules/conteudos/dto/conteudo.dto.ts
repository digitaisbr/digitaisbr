import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { NivelPlano, StatusConteudo, TipoConteudo, TipoMaterial } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CriarConteudoDto {
  @ApiProperty({ example: 'Como Criar Reels Virais em 2025' })
  @IsString()
  @MinLength(3)
  titulo!: string;

  @ApiProperty({ enum: TipoConteudo })
  @IsEnum(TipoConteudo)
  tipo!: TipoConteudo;

  @ApiProperty({ enum: NivelPlano, description: 'Plano mínimo para acessar' })
  @IsEnum(NivelPlano)
  planoMinimo!: NivelPlano;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({ description: 'Corpo completo (markdown ou HTML)' })
  @IsOptional()
  @IsString()
  corpo?: string;

  @ApiPropertyOptional({ enum: StatusConteudo, default: StatusConteudo.RASCUNHO })
  @IsOptional()
  @IsEnum(StatusConteudo)
  status?: StatusConteudo;

  @ApiPropertyOptional({ example: 'Equipe DigitaisBR' })
  @IsOptional()
  @IsString()
  autor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'URL de capa inválida.' })
  capaUrl?: string;
}

export class AtualizarConteudoDto extends PartialType(CriarConteudoDto) {}

export class FiltrarConteudosDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TipoConteudo })
  @IsOptional()
  @IsEnum(TipoConteudo)
  tipo?: TipoConteudo;

  @ApiPropertyOptional({ enum: StatusConteudo })
  @IsOptional()
  @IsEnum(StatusConteudo)
  status?: StatusConteudo;

  @ApiPropertyOptional({ enum: NivelPlano })
  @IsOptional()
  @IsEnum(NivelPlano)
  planoMinimo?: NivelPlano;

  @ApiPropertyOptional({ description: 'Somente conteúdos liberados para o plano do associado' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  apenasLiberados?: boolean;
}

export class CriarMaterialDto {
  @ApiProperty({ example: 'Banner Promoção Geral' })
  @IsString()
  @MinLength(3)
  nome!: string;

  @ApiProperty({ enum: TipoMaterial })
  @IsEnum(TipoMaterial)
  tipo!: TipoMaterial;

  @ApiPropertyOptional({ example: 'Promoção' })
  @IsOptional()
  @IsString()
  categoria?: string;

  @ApiPropertyOptional({ example: '1200x628' })
  @IsOptional()
  @IsString()
  dimensao?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'URL de arquivo inválida.' })
  arquivoUrl?: string;

  @ApiPropertyOptional({ description: 'Texto pronto, para materiais do tipo COPY' })
  @IsOptional()
  @IsString()
  textoCopy?: string;
}

export class AtualizarMaterialDto extends PartialType(CriarMaterialDto) {}

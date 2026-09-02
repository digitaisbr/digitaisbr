import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { NivelPlano, TipoBeneficio } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean, IsEmail, IsEnum, IsOptional, IsString, IsUrl, Matches, MinLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CriarParceiroDto {
  @ApiProperty({ example: 'Canva Pro' })
  @IsString()
  @MinLength(2)
  nome!: string;

  @ApiPropertyOptional({ example: 'Design & Criação' })
  @IsOptional()
  @IsString()
  segmento?: string;

  @ApiPropertyOptional({ example: '12.345.678/0001-01' })
  @IsOptional()
  @Matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, {
    message: 'CNPJ deve estar no formato 00.000.000/0000-00.',
  })
  cnpj?: string;

  @ApiPropertyOptional({ example: 'partners@canva.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'Site inválido.' })
  site?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'URL de logo inválida.' })
  logoUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class AtualizarParceiroDto extends PartialType(CriarParceiroDto) {}

export class CriarBeneficioDto {
  @ApiProperty({ example: '50% off Canva Pro Anual' })
  @IsString()
  @MinLength(3)
  nome!: string;

  @ApiPropertyOptional({ description: 'ID do parceiro' })
  @IsOptional()
  @IsString()
  parceiroId?: string;

  @ApiProperty({ enum: NivelPlano, description: 'Plano mínimo para acessar' })
  @IsEnum(NivelPlano)
  planoMinimo!: NivelPlano;

  @ApiProperty({ enum: TipoBeneficio })
  @IsEnum(TipoBeneficio)
  tipo!: TipoBeneficio;

  @ApiPropertyOptional({ example: '50%', description: 'Rótulo do valor exibido no card' })
  @IsOptional()
  @IsString()
  valorLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({ description: 'Como resgatar o benefício' })
  @IsOptional()
  @IsString()
  instrucoes?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class AtualizarBeneficioDto extends PartialType(CriarBeneficioDto) {}

export class FiltrarBeneficiosDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TipoBeneficio })
  @IsOptional()
  @IsEnum(TipoBeneficio)
  tipo?: TipoBeneficio;

  @ApiPropertyOptional({ enum: NivelPlano })
  @IsOptional()
  @IsEnum(NivelPlano)
  planoMinimo?: NivelPlano;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parceiroId?: string;

  @ApiPropertyOptional({ description: 'Somente benefícios liberados para o plano do associado' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  apenasLiberados?: boolean;
}

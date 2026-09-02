import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { StatusSolicitacao, TipoEscritorio } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsEmail, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength,
} from 'class-validator';

export class CriarEscritorioDto {
  @ApiProperty({ example: 'Almeida & Vieira Advogados' })
  @IsString()
  @MinLength(3)
  nome!: string;

  @ApiProperty({ enum: TipoEscritorio })
  @IsEnum(TipoEscritorio)
  tipo!: TipoEscritorio;

  @ApiPropertyOptional({ type: [String], example: ['Contratos', 'LGPD'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  especialidades?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsavel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiPropertyOptional({ example: 'São Paulo, SP' })
  @IsOptional()
  @IsString()
  localizacao?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class AtualizarEscritorioDto extends PartialType(CriarEscritorioDto) {}

export class CriarProfissionalDto {
  @ApiProperty({ example: 'Dr. Marcos Almeida' })
  @IsString()
  @MinLength(3)
  nome!: string;

  @ApiPropertyOptional({ description: 'ID do escritório' })
  @IsOptional()
  @IsUUID()
  escritorioId?: string;

  @ApiPropertyOptional({ example: 'Contratos e LGPD' })
  @IsOptional()
  @IsString()
  especialidade?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 250 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valorHora?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  disponivel?: boolean;
}

export class AtualizarProfissionalDto extends PartialType(CriarProfissionalDto) {}

export class SolicitarServicoDto {
  @ApiProperty({ example: 'Revisão de contrato de publi' })
  @IsString()
  @MinLength(5)
  assunto!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({ description: 'ID do profissional desejado' })
  @IsOptional()
  @IsUUID()
  profissionalId?: string;
}

export class AtualizarSolicitacaoDto {
  @ApiProperty({ enum: StatusSolicitacao })
  @IsEnum(StatusSolicitacao)
  status!: StatusSolicitacao;

  @ApiPropertyOptional({ description: 'ID do profissional designado' })
  @IsOptional()
  @IsUUID()
  profissionalId?: string;
}

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { NivelPlano, RedeSocial, StatusAssociado } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean, IsEmail, IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Matches,
  Max, Min, MinLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CriarAssociadoDto {
  @ApiProperty({ example: 'Ana Silva' })
  @IsString()
  @MinLength(3)
  nome!: string;

  @ApiProperty({ example: 'ana-silva@email.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'ana-silva' })
  @IsString()
  @Matches(/^[a-z0-9-]{3,40}$/, { message: 'Handle inválido: use letras minúsculas, números e hífens.' })
  handle!: string;

  @ApiProperty({ enum: NivelPlano })
  @IsEnum(NivelPlano)
  plano!: NivelPlano;

  @ApiPropertyOptional({ example: '079.297.885-17' })
  @IsOptional()
  @IsString()
  cpfCnpj?: string;

  @ApiPropertyOptional({ example: '(11) 93263-1666' })
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiPropertyOptional({ example: 'Lifestyle' })
  @IsOptional()
  @IsString()
  nicho?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 791300 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  seguidores?: number;

  @ApiPropertyOptional({ example: 3.8 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  engajamento?: number;

  @ApiPropertyOptional({ example: 'Rua das Flores, 100' })
  @IsOptional()
  @IsString()
  endereco?: string;

  @ApiPropertyOptional({ example: 'São Paulo' })
  @IsOptional()
  @IsString()
  cidade?: string;

  @ApiPropertyOptional({ example: 'SP' })
  @IsOptional()
  @IsString()
  @Length(2, 2, { message: 'UF deve ter 2 letras.' })
  uf?: string;

  @ApiPropertyOptional({ enum: StatusAssociado, default: StatusAssociado.ATIVO })
  @IsOptional()
  @IsEnum(StatusAssociado)
  status?: StatusAssociado;

  @ApiPropertyOptional({ description: 'Senha inicial; se omitida, uma é gerada e retornada uma única vez' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  senha?: string;

  @ApiPropertyOptional({ default: true, description: 'Cria a loja virtual junto com o associado' })
  @IsOptional()
  @IsBoolean()
  criarLoja?: boolean;
}

export class AtualizarAssociadoDto extends PartialType(CriarAssociadoDto) {}

export class FiltrarAssociadosDto extends PaginationDto {
  @ApiPropertyOptional({ enum: StatusAssociado })
  @IsOptional()
  @IsEnum(StatusAssociado)
  status?: StatusAssociado;

  @ApiPropertyOptional({ enum: NivelPlano })
  @IsOptional()
  @IsEnum(NivelPlano)
  plano?: NivelPlano;

  @ApiPropertyOptional({ example: 'Lifestyle' })
  @IsOptional()
  @IsString()
  nicho?: string;

  @ApiPropertyOptional({ description: 'Mínimo de seguidores' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  seguidoresMin?: number;
}

export class VincularRedeSocialDto {
  @ApiProperty({ enum: RedeSocial })
  @IsEnum(RedeSocial)
  rede!: RedeSocial;

  @ApiPropertyOptional({ example: '@ana-silva' })
  @IsOptional()
  @IsString()
  handle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
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

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  conectada?: boolean;
}

export class AlterarPlanoDto {
  @ApiProperty({ enum: NivelPlano })
  @IsEnum(NivelPlano)
  plano!: NivelPlano;
}

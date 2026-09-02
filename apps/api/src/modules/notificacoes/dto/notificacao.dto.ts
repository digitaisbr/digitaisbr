import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CanalNotificacao, NivelPlano, StatusCampanha, TipoNotificacao } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsOptional, IsString, IsUUID, MinLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class EnviarNotificacaoDto {
  @ApiProperty({ example: 'Manutenção programada' })
  @IsString()
  @MinLength(3)
  titulo!: string;

  @ApiProperty({ example: 'Manutenção dia 28/06 das 02h às 04h. Sem impacto.' })
  @IsString()
  @MinLength(3)
  mensagem!: string;

  @ApiPropertyOptional({ enum: TipoNotificacao, default: TipoNotificacao.SISTEMA })
  @IsOptional()
  @IsEnum(TipoNotificacao)
  tipo?: TipoNotificacao;

  @ApiPropertyOptional({ enum: CanalNotificacao, default: CanalNotificacao.IN_APP })
  @IsOptional()
  @IsEnum(CanalNotificacao)
  canal?: CanalNotificacao;

  @ApiPropertyOptional({
    type: [String],
    description: 'IDs dos associados; vazio ou omitido envia para todos',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  associadoIds?: string[];

  @ApiPropertyOptional({ enum: NivelPlano, isArray: true, description: 'Restringe a estes planos' })
  @IsOptional()
  @IsArray()
  @IsEnum(NivelPlano, { each: true })
  planos?: NivelPlano[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  link?: string;
}

export class FiltrarNotificacoesDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TipoNotificacao })
  @IsOptional()
  @IsEnum(TipoNotificacao)
  tipo?: TipoNotificacao;

  @ApiPropertyOptional({ enum: CanalNotificacao })
  @IsOptional()
  @IsEnum(CanalNotificacao)
  canal?: CanalNotificacao;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  lida?: boolean;
}

export class CriarCampanhaDto {
  @ApiProperty({ example: 'Bem-vindo à DigitaisBR!' })
  @IsString()
  @MinLength(3)
  titulo!: string;

  @ApiProperty({ example: 'Olá! Sua conta foi ativada com sucesso.' })
  @IsString()
  @MinLength(3)
  corpo!: string;

  @ApiPropertyOptional({ enum: CanalNotificacao, description: 'Omitir envia por todos os canais' })
  @IsOptional()
  @IsEnum(CanalNotificacao)
  canal?: CanalNotificacao;

  @ApiPropertyOptional({ enum: NivelPlano, isArray: true, description: 'Vazio = todos os planos' })
  @IsOptional()
  @IsArray()
  @IsEnum(NivelPlano, { each: true })
  publicoAlvo?: NivelPlano[];

  @ApiPropertyOptional({ description: 'Data de disparo; define o status como AGENDADA' })
  @IsOptional()
  @IsDateString()
  agendadaPara?: string;
}

export class FiltrarCampanhasDto extends PaginationDto {
  @ApiPropertyOptional({ enum: StatusCampanha })
  @IsOptional()
  @IsEnum(StatusCampanha)
  status?: StatusCampanha;
}

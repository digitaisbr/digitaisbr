import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrioridadeTicket, StatusTicket } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class AbrirTicketDto {
  @ApiProperty({ example: 'Não consigo acessar minha loja' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  assunto!: string;

  @ApiProperty({ example: 'Acesso' })
  @IsString()
  categoria!: string;

  @ApiProperty({ example: 'Ao entrar em /portal/loja recebo erro 403.' })
  @IsString()
  @MinLength(10)
  mensagem!: string;

  @ApiPropertyOptional({ enum: PrioridadeTicket, default: PrioridadeTicket.MEDIA })
  @IsOptional()
  @IsEnum(PrioridadeTicket)
  prioridade?: PrioridadeTicket;
}

export class ResponderTicketDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  conteudo!: string;

  @ApiPropertyOptional({ default: false, description: 'Nota interna, não visível ao associado' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  interna?: boolean;
}

export class AtualizarTicketDto {
  @ApiPropertyOptional({ enum: StatusTicket })
  @IsOptional()
  @IsEnum(StatusTicket)
  status?: StatusTicket;

  @ApiPropertyOptional({ enum: PrioridadeTicket })
  @IsOptional()
  @IsEnum(PrioridadeTicket)
  prioridade?: PrioridadeTicket;

  @ApiPropertyOptional({ description: 'ID do usuário atendente' })
  @IsOptional()
  @IsUUID()
  atribuidoAId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoria?: string;
}

export class FiltrarTicketsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: StatusTicket })
  @IsOptional()
  @IsEnum(StatusTicket)
  status?: StatusTicket;

  @ApiPropertyOptional({ enum: PrioridadeTicket })
  @IsOptional()
  @IsEnum(PrioridadeTicket)
  prioridade?: PrioridadeTicket;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoria?: string;

  @ApiPropertyOptional({ description: 'ID do atendente' })
  @IsOptional()
  @IsString()
  atribuidoAId?: string;

  @ApiPropertyOptional({ description: 'ID do associado solicitante' })
  @IsOptional()
  @IsString()
  associadoId?: string;
}

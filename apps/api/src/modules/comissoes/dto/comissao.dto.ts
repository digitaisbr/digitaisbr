import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusComissao } from '@prisma/client';
import { IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class FiltrarComissoesDto extends PaginationDto {
  @ApiPropertyOptional({ enum: StatusComissao })
  @IsOptional()
  @IsEnum(StatusComissao)
  status?: StatusComissao;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  associadoId?: string;

  @ApiPropertyOptional({ example: '2025-06-01' })
  @IsOptional()
  @IsDateString()
  de?: string;

  @ApiPropertyOptional({ example: '2025-06-30' })
  @IsOptional()
  @IsDateString()
  ate?: string;
}

export class PagarComissoesDto {
  @ApiProperty({ type: [String], description: 'IDs das comissões a liquidar' })
  @IsArray()
  @IsUUID('4', { each: true })
  ids!: string[];
}

export class AlterarStatusComissaoDto {
  @ApiProperty({ enum: StatusComissao })
  @IsEnum(StatusComissao)
  status!: StatusComissao;
}

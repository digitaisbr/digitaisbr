import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusVenda } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString, Min, MinLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CriarVendaDto {
  @ApiProperty({ description: 'ID do produto' })
  @IsString()
  produtoId!: string;

  @ApiPropertyOptional({
    description: 'ID do associado que originou a venda. Dispensável se `ref` for informado.',
  })
  @IsOptional()
  @IsString()
  associadoId?: string;

  @ApiPropertyOptional({ description: 'ID da loja de origem; inferido do associado se omitido' })
  @IsOptional()
  @IsString()
  lojaId?: string;

  @ApiProperty({ example: 'Tatiana Rocha' })
  @IsString()
  @MinLength(3)
  clienteNome!: string;

  @ApiPropertyOptional({ example: 'tatiana@cliente.com' })
  @IsOptional()
  @IsEmail()
  clienteEmail?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantidade?: number;

  @ApiPropertyOptional({ description: 'Código de cupom do associado' })
  @IsOptional()
  @IsString()
  cupom?: string;

  @ApiPropertyOptional({ description: 'Data da venda (ISO); padrão = agora' })
  @IsOptional()
  @IsDateString()
  dataVenda?: string;

  @ApiPropertyOptional({
    description:
      'Código de origem do link de afiliado (o `ref` que acompanha o checkout). ' +
      'Quando informado, atribui a venda ao associado dono do link e contabiliza a conversão — ' +
      'dispensa enviar `associadoId`.',
    example: 'ANA1',
  })
  @IsOptional()
  @IsString()
  ref?: string;
}

export class AtualizarStatusVendaDto {
  @ApiProperty({ enum: StatusVenda })
  @IsEnum(StatusVenda)
  status!: StatusVenda;

  @ApiPropertyOptional({ description: 'Motivo, para cancelamento ou reembolso' })
  @IsOptional()
  @IsString()
  motivo?: string;
}

export class FiltrarVendasDto extends PaginationDto {
  @ApiPropertyOptional({ enum: StatusVenda })
  @IsOptional()
  @IsEnum(StatusVenda)
  status?: StatusVenda;

  @ApiPropertyOptional({ description: 'ID do associado' })
  @IsOptional()
  @IsString()
  associadoId?: string;

  @ApiPropertyOptional({ description: 'ID do produto' })
  @IsOptional()
  @IsString()
  produtoId?: string;

  @ApiPropertyOptional({ example: '2025-06-01' })
  @IsOptional()
  @IsDateString()
  de?: string;

  @ApiPropertyOptional({ example: '2025-06-30' })
  @IsOptional()
  @IsDateString()
  ate?: string;
}

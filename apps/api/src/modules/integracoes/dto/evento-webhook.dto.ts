import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString, IsEmail, IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength,
  ValidateNested,
} from 'class-validator';

/**
 * Eventos que um parceiro pode nos enviar.
 *
 * São poucos de propósito: cada um precisa ter um efeito claro e reversível
 * sobre a venda e a comissão. Aceitar eventos que não sabemos tratar só
 * adiaria o problema para a conciliação.
 */
export enum TipoEventoWebhook {
  VENDA_APROVADA = 'venda.aprovada',
  VENDA_REEMBOLSADA = 'venda.reembolsada',
  VENDA_CANCELADA = 'venda.cancelada',
}

class ClienteDto {
  @ApiProperty({ example: 'Maria Souza' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome!: string;

  @ApiPropertyOptional({ example: 'maria@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class EventoWebhookDto {
  @ApiProperty({ enum: TipoEventoWebhook })
  @IsEnum(TipoEventoWebhook)
  evento!: TipoEventoWebhook;

  @ApiProperty({
    example: 'PED-99812',
    description: 'Identificador do pedido no sistema do parceiro. É a chave de idempotência.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  pedidoId!: string;

  @ApiProperty({
    example: 'ANASIL3',
    description:
      'Código de origem que acompanhou o clique (parâmetro `ref`). ' +
      'É por ele que a venda é atribuída ao associado e ao produto.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  ref!: string;

  @ApiPropertyOptional({ type: ClienteDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ClienteDto)
  cliente?: ClienteDto;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantidade?: number;

  @ApiPropertyOptional({ description: 'Cupom do associado usado na compra, se houve.' })
  @IsOptional()
  @IsString()
  cupom?: string;

  @ApiPropertyOptional({
    description:
      'Valor cobrado pelo parceiro. Serve de conferência: divergência do preço ' +
      'do catálogo é registrada, mas não bloqueia a venda.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valor?: number;

  @ApiPropertyOptional({ description: 'Quando o evento ocorreu no parceiro (ISO 8601).' })
  @IsOptional()
  @IsDateString()
  ocorridoEm?: string;
}

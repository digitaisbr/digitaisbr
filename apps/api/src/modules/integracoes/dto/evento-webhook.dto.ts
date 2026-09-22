import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString, IsEmail, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min,
  MinLength,
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
  /** O parceiro pagou a comissão ao associado. A plataforma só registra. */
  COMISSAO_PAGA = 'comissao.paga',
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

  // ---- campos de conciliação ------------------------------------------------
  // Opcionais de propósito: parceiro que não os envia continua funcionando como
  // antes, e a plataforma calcula o que faltar.

  @ApiPropertyOptional({ description: 'Código do produto no sistema do parceiro.' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  skuParceiro?: string;

  @ApiPropertyOptional({ description: 'Preço unitário praticado pelo parceiro.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valorUnitario?: number;

  @ApiPropertyOptional({ description: 'Desconto concedido ao cliente.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  desconto?: number;

  @ApiPropertyOptional({ description: 'Quanto o cliente efetivamente pagou.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valorPago?: number;

  @ApiPropertyOptional({ description: 'Percentual de comissão definido pelo parceiro.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  comissaoPct?: number;

  @ApiPropertyOptional({
    description:
      'Valor da comissão apurado pelo parceiro. Quando informado, prevalece sobre o cálculo ' +
      'da plataforma — quem paga é quem sabe o valor.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  comissaoValor?: number;
}

export class ConsultarElegibilidadeDto {
  @ApiProperty({
    example: 'ana-silva',
    description: 'Handle do associado ou código de origem de um link dele.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  associado!: string;
}

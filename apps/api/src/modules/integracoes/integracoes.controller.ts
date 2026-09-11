import {
  Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role, StatusEventoWebhook } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AssinaturaWebhookGuard } from '../../common/guards/assinatura-webhook.guard';
import { EventoWebhookDto } from './dto/evento-webhook.dto';
import { IntegracoesService } from './integracoes.service';

@ApiTags('Integrações')
@Controller('integracoes')
export class IntegracoesController {
  constructor(private readonly service: IntegracoesService) {}

  /**
   * Entrada dos parceiros. Pública no sentido de não exigir login — a
   * autenticação é a assinatura HMAC, conferida pelo guard.
   */
  @Public()
  @UseGuards(AssinaturaWebhookGuard)
  @Post(':parceiroId/eventos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Recebe um evento de venda de parceiro',
    description:
      'Exige o cabeçalho `x-digitaisbr-assinatura` com `sha256=<hmac do corpo cru>`. ' +
      'Idempotente por (parceiro, pedidoId, evento): reenvios não duplicam a comissão.',
  })
  receber(
    @Param('parceiroId', ParseUUIDPipe) parceiroId: string,
    @Body() dto: EventoWebhookDto,
  ) {
    return this.service.receber(parceiroId, dto);
  }

  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Get('eventos')
  @ApiOperation({ summary: 'Últimos 100 eventos recebidos dos parceiros' })
  listar(@Query('status') status?: StatusEventoWebhook) {
    return this.service.listar(status);
  }

  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Post('eventos/:id/reprocessar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reprocessa um evento que falhou por causa transitória' })
  reprocessar(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.reprocessar(id);
  }

  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Post('parceiros/:parceiroId/segredo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Gera o segredo de webhook do parceiro',
    description: 'Devolve o segredo em claro uma única vez. Gerar de novo invalida o anterior.',
  })
  gerarSegredo(@Param('parceiroId', ParseUUIDPipe) parceiroId: string) {
    return this.service.gerarSegredo(parceiroId);
  }
}

import { Body, Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { ComissoesService } from './comissoes.service';
import { AlterarStatusComissaoDto, FiltrarComissoesDto, PagarComissoesDto } from './dto/comissao.dto';

@ApiTags('Comissões')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('comissoes')
export class ComissoesController {
  constructor(private readonly service: ComissoesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista comissões com filtros de status, associado e período' })
  listar(@Query() filtros: FiltrarComissoesDto) {
    return this.service.listar(filtros);
  }

  @Get('estatisticas')
  @ApiOperation({ summary: 'Totais por status, pagas, pendentes e percentual médio' })
  estatisticas(@Query() filtros: FiltrarComissoesDto) {
    return this.service.estatisticas(filtros);
  }

  @Get('top-associados')
  @ApiOperation({ summary: 'Associados que mais receberam comissão' })
  @ApiQuery({ name: 'limite', required: false, example: 10 })
  topAssociados(@Query('limite', new ParseIntPipe({ optional: true })) limite?: number) {
    return this.service.topAssociados(limite ?? 10);
  }

  @Get('saldo/:associadoId')
  @ApiOperation({ summary: 'Saldo disponível para saque de um associado' })
  saldo(@Param('associadoId', ParseUUIDPipe) associadoId: string) {
    return this.service.saldoDisponivel(associadoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma comissão' })
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.buscar(id);
  }

  @Post('pagar')
  @ApiOperation({
    summary: 'Liquida um lote de comissões',
    description: 'Só aceita comissões aguardando pagamento ou em processamento; notifica cada associado.',
  })
  pagarLote(@Body() dto: PagarComissoesDto) {
    return this.service.pagarLote(dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Altera o status de uma comissão' })
  alterarStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AlterarStatusComissaoDto) {
    return this.service.alterarStatus(id, dto);
  }
}

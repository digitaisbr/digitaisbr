import {
  Body, Controller, Get, Header, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { AtualizarStatusVendaDto, CriarVendaDto, FiltrarVendasDto } from './dto/venda.dto';
import { VendasService } from './vendas.service';

@ApiTags('Vendas')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('vendas')
export class VendasController {
  constructor(private readonly service: VendasService) {}

  @Get()
  @ApiOperation({ summary: 'Lista vendas com busca, filtros, período e paginação' })
  listar(@Query() filtros: FiltrarVendasDto) {
    return this.service.listar(filtros);
  }

  @Get('estatisticas')
  @ApiOperation({ summary: 'Receita, ticket médio, conversão e cancelamento' })
  estatisticas(@Query() filtros: FiltrarVendasDto) {
    return this.service.estatisticas(filtros);
  }

  @Get('serie-mensal')
  @ApiOperation({ summary: 'Série mensal de receita e comissões' })
  @ApiQuery({ name: 'meses', required: false, example: 6 })
  serieMensal(@Query('meses', new ParseIntPipe({ optional: true })) meses?: number) {
    return this.service.serieMensal(meses ?? 6);
  }

  @Get('exportar')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="vendas.csv"')
  @ApiOperation({ summary: 'Exporta a listagem filtrada em CSV' })
  exportar(@Query() filtros: FiltrarVendasDto) {
    return this.service.exportarCsv(filtros);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma venda por ID ou referência (CHK-…)' })
  buscar(@Param('id') id: string) {
    return this.service.buscar(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Registra uma venda',
    description: 'Aplica cupom, calcula a comissão, baixa estoque e notifica — em transação única.',
  })
  criar(@Body() dto: CriarVendaDto) {
    return this.service.criar(dto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Altera o status da venda',
    description: 'Respeita as transições válidas e propaga o efeito para comissão e estoque.',
  })
  alterarStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarStatusVendaDto) {
    return this.service.alterarStatus(id, dto);
  }
}

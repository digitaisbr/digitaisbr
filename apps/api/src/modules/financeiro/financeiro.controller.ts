import {
  Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, ParseUUIDPipe,
  Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role, TipoLancamento } from '@prisma/client';
import { CurrentUser, UsuarioAutenticado } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AtualizarSaqueDto, CriarLancamentoDto, FiltrarSaquesDto, PeriodoDto, SolicitarSaqueDto,
} from './dto/financeiro.dto';
import { FinanceiroService } from './financeiro.service';

@ApiTags('Financeiro')
@ApiBearerAuth()
@Controller('financeiro')
export class FinanceiroController {
  constructor(private readonly service: FinanceiroService) {}

  @Get('visao-geral')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Saldo, MRR, margem líquida e comissões a pagar' })
  visaoGeral() {
    return this.service.visaoGeral();
  }

  @Get('fluxo-caixa')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Entradas e saídas mês a mês' })
  fluxoCaixa(@Query() periodo: PeriodoDto) {
    return this.service.fluxoCaixa(periodo);
  }

  @Get('dre')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Demonstrativo de resultado com composição por categoria' })
  dre(@Query() periodo: PeriodoDto) {
    return this.service.dre(periodo);
  }

  @Get('projecao-mrr')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Projeção de MRR com base no crescimento recente' })
  @ApiQuery({ name: 'meses', required: false, example: 6 })
  projecao(@Query('meses', new ParseIntPipe({ optional: true })) meses?: number) {
    return this.service.projecaoMrr(meses ?? 6);
  }

  @Get('lancamentos')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lista os lançamentos do período' })
  @ApiQuery({ name: 'tipo', required: false, enum: TipoLancamento })
  lancamentos(@Query() periodo: PeriodoDto, @Query('tipo') tipo?: TipoLancamento) {
    return this.service.listarLancamentos({ ...periodo, tipo });
  }

  @Post('lancamentos')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Registra um lançamento manual' })
  criarLancamento(@Body() dto: CriarLancamentoDto) {
    return this.service.criarLancamento(dto);
  }

  @Delete('lancamentos/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove um lançamento' })
  removerLancamento(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removerLancamento(id);
  }

  // ---- saques ----

  @Get('saques')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lista solicitações de saque' })
  listarSaques(@Query() filtros: FiltrarSaquesDto) {
    return this.service.listarSaques(filtros);
  }

  @Post('saques')
  @ApiOperation({
    summary: 'Solicita um saque das comissões disponíveis',
    description: 'Associados sacam do próprio saldo; administradores podem informar outro associado.',
  })
  solicitarSaque(
    @Body() dto: SolicitarSaqueDto,
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query('associadoId') associadoId?: string,
  ) {
    const alvo = usuario.role === Role.ADMIN ? (associadoId ?? usuario.associadoId) : usuario.associadoId;
    if (!alvo) throw new ForbiddenException('Nenhum associado vinculado a esta conta.');
    return this.service.solicitarSaque(alvo, dto);
  }

  @Patch('saques/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Aprova, processa, conclui ou rejeita um saque' })
  atualizarSaque(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarSaqueDto) {
    return this.service.atualizarSaque(id, dto);
  }

  @Get('extrato/:associadoId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Extrato de comissões e saques de um associado' })
  extrato(@Param('associadoId', ParseUUIDPipe) associadoId: string) {
    return this.service.extratoAssociado(associadoId);
  }
}

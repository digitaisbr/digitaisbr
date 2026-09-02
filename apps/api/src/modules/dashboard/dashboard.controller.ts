import { Controller, ForbiddenException, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, UsuarioAutenticado } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard e Relatórios')
@ApiBearerAuth()
@Controller()
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('dashboard/admin')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cards e totais da home administrativa' })
  admin() {
    return this.service.admin();
  }

  @Get('dashboard/receita-comissoes')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Série mensal de receita e comissões' })
  @ApiQuery({ name: 'meses', required: false, example: 6 })
  receitaComissoes(@Query('meses', new ParseIntPipe({ optional: true })) meses?: number) {
    return this.service.receitaEComissoes(meses ?? 6);
  }

  @Get('dashboard/suporte')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Resumo de tickets por status e prioridade' })
  suporte() {
    return this.service.resumoSuporte();
  }

  @Get('dashboard/portal')
  @ApiOperation({ summary: 'Painel inicial do portal do associado logado' })
  portal(@CurrentUser() usuario: UsuarioAutenticado) {
    if (!usuario.associadoId) throw new ForbiddenException('Nenhum associado vinculado a esta conta.');
    return this.service.associado(usuario.associadoId);
  }

  @Get('relatorios')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Relatório analítico consolidado',
    description: 'Indicadores, vendas por status, associados por plano e rankings, em uma chamada.',
  })
  relatorios(@Query('de') de?: string, @Query('ate') ate?: string) {
    return this.service.relatorios(de, ate);
  }
}

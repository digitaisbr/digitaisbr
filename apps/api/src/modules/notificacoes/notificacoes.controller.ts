import {
  Body, Controller, Delete, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, UsuarioAutenticado } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CriarCampanhaDto, EnviarNotificacaoDto, FiltrarCampanhasDto, FiltrarNotificacoesDto,
} from './dto/notificacao.dto';
import { NotificacoesService } from './notificacoes.service';

@ApiTags('Notificações e Campanhas')
@ApiBearerAuth()
@Controller()
export class NotificacoesController {
  constructor(private readonly service: NotificacoesService) {}

  // ---- notificações ----

  @Get('notificacoes')
  @ApiOperation({ summary: 'Notificações do associado logado (inclui broadcasts)' })
  listar(@Query() filtros: FiltrarNotificacoesDto, @CurrentUser() usuario: UsuarioAutenticado) {
    if (!usuario.associadoId) throw new ForbiddenException('Nenhum associado vinculado a esta conta.');
    return this.service.listar(usuario.associadoId, filtros);
  }

  @Get('notificacoes/resumo')
  @ApiOperation({ summary: 'Contadores por tipo, canal e não lidas' })
  resumo(@CurrentUser() usuario: UsuarioAutenticado) {
    if (!usuario.associadoId) throw new ForbiddenException('Nenhum associado vinculado a esta conta.');
    return this.service.resumo(usuario.associadoId);
  }

  @Patch('notificacoes/ler-todas')
  @ApiOperation({ summary: 'Marca todas as notificações como lidas' })
  lerTodas(@CurrentUser() usuario: UsuarioAutenticado) {
    if (!usuario.associadoId) throw new ForbiddenException('Nenhum associado vinculado a esta conta.');
    return this.service.marcarTodasComoLidas(usuario.associadoId);
  }

  @Patch('notificacoes/:id/ler')
  @ApiOperation({ summary: 'Marca uma notificação como lida' })
  ler(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() usuario: UsuarioAutenticado) {
    if (!usuario.associadoId) throw new ForbiddenException('Nenhum associado vinculado a esta conta.');
    return this.service.marcarComoLida(id, usuario.associadoId);
  }

  @Delete('notificacoes/:id')
  @ApiOperation({ summary: 'Remove uma notificação' })
  remover(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() usuario: UsuarioAutenticado) {
    if (!usuario.associadoId) throw new ForbiddenException('Nenhum associado vinculado a esta conta.');
    return this.service.remover(id, usuario.associadoId);
  }

  @Post('notificacoes/enviar')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Dispara uma notificação',
    description: 'Sem destinatários explícitos, envia a todos os associados ativos (filtrável por plano).',
  })
  enviar(@Body() dto: EnviarNotificacaoDto) {
    return this.service.enviar(dto);
  }

  // ---- campanhas ----

  @Get('campanhas')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lista as campanhas com taxa de abertura' })
  listarCampanhas(@Query() filtros: FiltrarCampanhasDto) {
    return this.service.listarCampanhas(filtros);
  }

  @Get('campanhas/estatisticas')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Enviadas, agendadas, rascunhos e taxa de abertura geral' })
  estatisticasCampanhas() {
    return this.service.estatisticasCampanhas();
  }

  @Post('campanhas')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cria uma campanha (rascunho ou agendada)' })
  criarCampanha(@Body() dto: CriarCampanhaDto) {
    return this.service.criarCampanha(dto);
  }

  @Post('campanhas/:id/enviar')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Dispara a campanha para o público-alvo' })
  enviarCampanha(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.enviarCampanha(id);
  }

  @Patch('campanhas/:id/cancelar')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cancela uma campanha ainda não enviada' })
  cancelarCampanha(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancelarCampanha(id);
  }
}

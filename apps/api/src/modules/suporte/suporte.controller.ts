import {
  Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, UsuarioAutenticado } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AbrirTicketDto, AtualizarTicketDto, FiltrarTicketsDto, ResponderTicketDto } from './dto/ticket.dto';
import { SuporteService } from './suporte.service';

@ApiTags('Suporte')
@ApiBearerAuth()
@Controller('suporte')
export class SuporteController {
  constructor(private readonly service: SuporteService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lista os chamados com filtros e paginação' })
  listar(@Query() filtros: FiltrarTicketsDto) {
    return this.service.listar(filtros);
  }

  @Get('estatisticas')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Abertos, em andamento, resolvidos e tempo médio de resolução' })
  estatisticas() {
    return this.service.estatisticas();
  }

  @Get('meus-chamados')
  @ApiOperation({ summary: 'Chamados do associado logado' })
  meusChamados(@CurrentUser() usuario: UsuarioAutenticado) {
    if (!usuario.associadoId) throw new ForbiddenException('Nenhum associado vinculado a esta conta.');
    return this.service.meusTickets(usuario.associadoId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Abre um chamado por ID ou número (SUP-…)',
    description: 'Associados só acessam os próprios chamados e não veem notas internas.',
  })
  buscar(@Param('id') id: string, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.service.buscar(id, usuario.associadoId, usuario.role === Role.ADMIN);
  }

  @Post()
  @ApiOperation({ summary: 'Abre um chamado' })
  abrir(@Body() dto: AbrirTicketDto, @CurrentUser() usuario: UsuarioAutenticado) {
    if (!usuario.associadoId) throw new ForbiddenException('Só associados podem abrir chamados.');
    return this.service.abrir(usuario.associadoId, usuario.id, dto);
  }

  @Post(':id/mensagens')
  @ApiOperation({
    summary: 'Responde na thread do chamado',
    description: 'Notas internas (`interna: true`) são exclusivas do atendimento.',
  })
  responder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResponderTicketDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.responder(id, usuario.id, usuario.role === Role.ADMIN, dto);
  }

  @Patch(':id/atender')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Assume o atendimento do chamado' })
  atender(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') usuarioId: string) {
    return this.service.atender(id, usuarioId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualiza status, prioridade, categoria ou responsável' })
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarTicketDto) {
    return this.service.atualizar(id, dto);
  }
}

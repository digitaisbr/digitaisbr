import {
  Body, Controller, Delete, ForbiddenException, Get, Param, ParseBoolPipe, ParseUUIDPipe,
  Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role, StatusSolicitacao, TipoEscritorio } from '@prisma/client';
import { CurrentUser, UsuarioAutenticado } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AtualizarEscritorioDto, AtualizarProfissionalDto, AtualizarSolicitacaoDto,
  CriarEscritorioDto, CriarProfissionalDto, SolicitarServicoDto,
} from './dto/servico.dto';
import { ServicosService } from './servicos.service';

@ApiTags('Serviços (Jurídico e Contábil)')
@ApiBearerAuth()
@Controller('servicos')
export class ServicosController {
  constructor(private readonly service: ServicosService) {}

  @Get('estatisticas')
  @ApiOperation({ summary: 'Escritórios, profissionais e solicitações por status' })
  estatisticas() {
    return this.service.estatisticas();
  }

  // ---- escritórios ----

  @Get('escritorios')
  @ApiOperation({ summary: 'Lista os escritórios parceiros' })
  @ApiQuery({ name: 'tipo', required: false, enum: TipoEscritorio })
  @ApiQuery({ name: 'apenasAtivos', required: false, type: Boolean })
  listarEscritorios(
    @Query('tipo') tipo?: TipoEscritorio,
    @Query('apenasAtivos', new ParseBoolPipe({ optional: true })) apenasAtivos?: boolean,
  ) {
    return this.service.listarEscritorios(tipo, apenasAtivos ?? false);
  }

  @Post('escritorios')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cadastra um escritório parceiro' })
  criarEscritorio(@Body() dto: CriarEscritorioDto) {
    return this.service.criarEscritorio(dto);
  }

  @Patch('escritorios/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualiza um escritório' })
  atualizarEscritorio(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarEscritorioDto) {
    return this.service.atualizarEscritorio(id, dto);
  }

  @Delete('escritorios/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove um escritório sem profissionais vinculados' })
  removerEscritorio(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removerEscritorio(id);
  }

  // ---- profissionais ----

  @Get('profissionais')
  @ApiOperation({ summary: 'Lista os profissionais disponíveis' })
  @ApiQuery({ name: 'apenasDisponiveis', required: false, type: Boolean })
  listarProfissionais(
    @Query('apenasDisponiveis', new ParseBoolPipe({ optional: true })) apenasDisponiveis?: boolean,
  ) {
    return this.service.listarProfissionais(apenasDisponiveis ?? false);
  }

  @Post('profissionais')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cadastra um profissional' })
  criarProfissional(@Body() dto: CriarProfissionalDto) {
    return this.service.criarProfissional(dto);
  }

  @Patch('profissionais/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualiza um profissional' })
  atualizarProfissional(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarProfissionalDto) {
    return this.service.atualizarProfissional(id, dto);
  }

  @Delete('profissionais/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove um profissional' })
  removerProfissional(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removerProfissional(id);
  }

  // ---- solicitações ----

  @Get('solicitacoes')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lista todas as solicitações de atendimento' })
  @ApiQuery({ name: 'status', required: false, enum: StatusSolicitacao })
  listarSolicitacoes(@Query('status') status?: StatusSolicitacao) {
    return this.service.listarSolicitacoes(status);
  }

  @Get('minhas-solicitacoes')
  @ApiOperation({ summary: 'Solicitações do associado logado' })
  minhas(@CurrentUser() usuario: UsuarioAutenticado) {
    if (!usuario.associadoId) throw new ForbiddenException('Nenhum associado vinculado a esta conta.');
    return this.service.listarSolicitacoes(undefined, usuario.associadoId);
  }

  @Post('solicitacoes')
  @ApiOperation({ summary: 'Solicita atendimento jurídico ou contábil' })
  solicitar(@Body() dto: SolicitarServicoDto, @CurrentUser() usuario: UsuarioAutenticado) {
    if (!usuario.associadoId) throw new ForbiddenException('Só associados podem solicitar atendimento.');
    return this.service.solicitar(usuario.associadoId, dto);
  }

  @Patch('solicitacoes/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Designa profissional ou atualiza o status da solicitação' })
  atualizarSolicitacao(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarSolicitacaoDto) {
    return this.service.atualizarSolicitacao(id, dto);
  }
}

import {
  Body, Controller, Delete, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { NivelPlano, Role, TipoMaterial } from '@prisma/client';
import { CurrentUser, UsuarioAutenticado } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ConteudosService } from './conteudos.service';
import {
  AtualizarConteudoDto, AtualizarMaterialDto, CriarConteudoDto, CriarMaterialDto, FiltrarConteudosDto,
} from './dto/conteudo.dto';

@ApiTags('Conteúdos')
@ApiBearerAuth()
@Controller()
export class ConteudosController {
  constructor(private readonly service: ConteudosService) {}

  @Get('conteudos')
  @ApiOperation({
    summary: 'Lista os conteúdos',
    description: 'Associados veem apenas publicados; os acima do plano vêm com `bloqueado: true`.',
  })
  listar(@Query() filtros: FiltrarConteudosDto, @CurrentUser() usuario: UsuarioAutenticado) {
    const ehAssociado = usuario.role !== Role.ADMIN;
    return this.service.listar(filtros, usuario.nivelPlano as NivelPlano | null, ehAssociado);
  }

  @Get('conteudos/estatisticas')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Publicados, rascunhos, visualizações e curtidas' })
  estatisticas() {
    return this.service.estatisticas();
  }

  @Get('conteudos/:id')
  @ApiOperation({
    summary: 'Abre um conteúdo por ID ou slug',
    description: 'Valida o plano do associado e registra a visualização.',
  })
  buscar(@Param('id') id: string, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.service.buscar(
      id,
      usuario.associadoId,
      usuario.role === Role.ADMIN ? null : (usuario.nivelPlano as NivelPlano | null),
    );
  }

  @Post('conteudos')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cria um conteúdo' })
  criar(@Body() dto: CriarConteudoDto) {
    return this.service.criar(dto);
  }

  @Post('conteudos/:id/curtir')
  @ApiOperation({ summary: 'Alterna a curtida do associado no conteúdo' })
  curtir(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() usuario: UsuarioAutenticado) {
    if (!usuario.associadoId) throw new ForbiddenException('Nenhum associado vinculado a esta conta.');
    return this.service.alternarCurtida(id, usuario.associadoId);
  }

  @Patch('conteudos/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualiza um conteúdo' })
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarConteudoDto) {
    return this.service.atualizar(id, dto);
  }

  @Delete('conteudos/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove um conteúdo' })
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remover(id);
  }

  // ---- materiais de divulgação ----

  @Get('materiais')
  @ApiOperation({ summary: 'Lista os materiais de divulgação' })
  @ApiQuery({ name: 'tipo', required: false, enum: TipoMaterial })
  listarMateriais(@Query('tipo') tipo?: TipoMaterial) {
    return this.service.listarMateriais(tipo);
  }

  @Get('materiais/:id/baixar')
  @ApiOperation({ summary: 'Registra o download e devolve o arquivo ou o texto' })
  baixar(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.baixarMaterial(id);
  }

  @Post('materiais')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cria um material de divulgação' })
  criarMaterial(@Body() dto: CriarMaterialDto) {
    return this.service.criarMaterial(dto);
  }

  @Patch('materiais/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualiza um material' })
  atualizarMaterial(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarMaterialDto) {
    return this.service.atualizarMaterial(id, dto);
  }

  @Delete('materiais/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove um material' })
  removerMaterial(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removerMaterial(id);
  }
}

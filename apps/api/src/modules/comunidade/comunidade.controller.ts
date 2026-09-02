import {
  Body, Controller, Delete, ForbiddenException, Get, Param, ParseBoolPipe, ParseIntPipe,
  ParseUUIDPipe, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, UsuarioAutenticado } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ComunidadeService } from './comunidade.service';
import {
  AtualizarPostDto, ComentarDto, CriarCategoriaComunidadeDto, CriarPostDto, FiltrarPostsDto,
} from './dto/comunidade.dto';

@ApiTags('Comunidade')
@ApiBearerAuth()
@Controller('comunidade')
export class ComunidadeController {
  constructor(private readonly service: ComunidadeService) {}

  @Get('categorias')
  @ApiOperation({ summary: 'Lista as categorias com contagem de posts' })
  listarCategorias() {
    return this.service.listarCategorias();
  }

  @Post('categorias')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cria uma categoria' })
  criarCategoria(@Body() dto: CriarCategoriaComunidadeDto) {
    return this.service.criarCategoria(dto);
  }

  @Get('estatisticas')
  @ApiOperation({ summary: 'Posts, comentários, curtidas e membros ativos' })
  estatisticas() {
    return this.service.estatisticas();
  }

  @Get('topicos-recentes')
  @ApiOperation({ summary: 'Tópicos recentes para o dashboard' })
  @ApiQuery({ name: 'limite', required: false, example: 5 })
  topicos(@Query('limite', new ParseIntPipe({ optional: true })) limite?: number) {
    return this.service.topicosRecentes(limite ?? 5);
  }

  @Get('posts')
  @ApiOperation({
    summary: 'Feed da comunidade',
    description: 'Fixados primeiro; `aba=populares` ordena por engajamento.',
  })
  listarPosts(@Query() filtros: FiltrarPostsDto, @CurrentUser('associadoId') associadoId: string | null) {
    return this.service.listarPosts(filtros, associadoId);
  }

  @Get('posts/:id')
  @ApiOperation({ summary: 'Abre um post com seus comentários' })
  buscarPost(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('associadoId') associadoId: string | null,
  ) {
    return this.service.buscarPost(id, associadoId);
  }

  @Post('posts')
  @ApiOperation({ summary: 'Publica um post' })
  criarPost(@Body() dto: CriarPostDto, @CurrentUser() usuario: UsuarioAutenticado) {
    if (!usuario.associadoId) throw new ForbiddenException('Só associados podem publicar na comunidade.');
    return this.service.criarPost(usuario.associadoId, dto);
  }

  @Patch('posts/:id')
  @ApiOperation({ summary: 'Edita o próprio post' })
  atualizarPost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarPostDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    if (!usuario.associadoId) throw new ForbiddenException('Nenhum associado vinculado a esta conta.');
    return this.service.atualizarPost(id, usuario.associadoId, dto);
  }

  @Patch('posts/:id/fixar/:valor')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Fixa ou desafixa um post no topo do feed' })
  fixar(@Param('id', ParseUUIDPipe) id: string, @Param('valor', ParseBoolPipe) fixado: boolean) {
    return this.service.fixarPost(id, fixado);
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: 'Remove um post (autor ou administrador)' })
  removerPost(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.service.removerPost(id, usuario.associadoId, usuario.role === Role.ADMIN);
  }

  @Post('posts/:id/curtir')
  @ApiOperation({ summary: 'Curte ou descurte um post' })
  curtir(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() usuario: UsuarioAutenticado) {
    if (!usuario.associadoId) throw new ForbiddenException('Só associados podem curtir.');
    return this.service.alternarCurtida(id, usuario.associadoId);
  }

  @Post('posts/:id/comentarios')
  @ApiOperation({ summary: 'Comenta em um post' })
  comentar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ComentarDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    if (!usuario.associadoId) throw new ForbiddenException('Só associados podem comentar.');
    return this.service.comentar(id, usuario.associadoId, dto);
  }

  @Delete('comentarios/:id')
  @ApiOperation({ summary: 'Remove um comentário (autor ou administrador)' })
  removerComentario(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.service.removerComentario(id, usuario.associadoId, usuario.role === Role.ADMIN);
  }
}

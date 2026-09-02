import {
  Body, Controller, Delete, ForbiddenException, Get, Param, ParseEnumPipe, ParseUUIDPipe,
  Patch, Post, Query, Redirect,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RedeSocial, StatusComissao, StatusVenda } from '@prisma/client';
import { CurrentUser, UsuarioAutenticado } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  AtualizarCupomDto, AtualizarPerfilDto, ConectarRedeDto, CriarCupomDto, GerarLinkDto,
  PersonalizarLojaDto,
} from './dto/portal.dto';
import { PortalService } from './portal.service';

/** Extrai o associado do usuário logado, ou recusa o acesso. */
function exigirAssociado(usuario: UsuarioAutenticado): string {
  if (!usuario.associadoId) {
    throw new ForbiddenException('Esta área é exclusiva de associados.');
  }
  return usuario.associadoId;
}

@ApiTags('Portal do Associado')
@ApiBearerAuth()
@Controller('portal')
export class PortalController {
  constructor(private readonly service: PortalService) {}

  // ---- perfil e plano ----

  @Get('perfil')
  @ApiOperation({ summary: 'Perfil do associado logado' })
  perfil(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.service.meuPerfil(exigirAssociado(usuario));
  }

  @Patch('perfil')
  @ApiOperation({ summary: 'Atualiza perfil e preferências de privacidade' })
  atualizarPerfil(@Body() dto: AtualizarPerfilDto, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.service.atualizarPerfil(exigirAssociado(usuario), dto);
  }

  @Get('plano')
  @ApiOperation({ summary: 'Uso do plano atual, ROI e o que o upgrade desbloqueia' })
  plano(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.service.meuPlano(exigirAssociado(usuario));
  }

  // ---- minhas vendas e comissões ----

  @Get('vendas')
  @ApiOperation({
    summary: 'Vendas do associado logado',
    description: 'O filtro por associado é imposto pelo servidor — não é possível ver as de outro.',
  })
  @ApiQuery({ name: 'status', required: false, enum: StatusVenda })
  minhasVendas(
    @Query() paginacao: PaginationDto,
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query('status') status?: StatusVenda,
  ) {
    return this.service.minhasVendas(exigirAssociado(usuario), {
      page: paginacao.page,
      limit: paginacao.limit,
      skip: paginacao.skip,
      search: paginacao.search,
      status,
    });
  }

  @Get('comissoes')
  @ApiOperation({ summary: 'Comissões do associado logado' })
  @ApiQuery({ name: 'status', required: false, enum: StatusComissao })
  minhasComissoes(
    @Query() paginacao: PaginationDto,
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query('status') status?: StatusComissao,
  ) {
    return this.service.minhasComissoes(exigirAssociado(usuario), {
      page: paginacao.page,
      limit: paginacao.limit,
      skip: paginacao.skip,
      status,
    });
  }

  // ---- meu financeiro ----

  @Get('saldo')
  @ApiOperation({ summary: 'Saldo de comissões do associado logado' })
  meuSaldo(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.service.meuSaldo(exigirAssociado(usuario));
  }

  @Get('saques')
  @ApiOperation({ summary: 'Saques do associado logado' })
  meusSaques(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.service.meusSaques(exigirAssociado(usuario));
  }

  // ---- loja ----

  @Get('loja')
  @ApiOperation({ summary: 'Minha loja com vitrine e desempenho' })
  loja(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.service.minhaLoja(exigirAssociado(usuario));
  }

  @Patch('loja')
  @ApiOperation({
    summary: 'Personaliza a loja',
    description: 'Cores, banner e logo exigem plano Intermediário ou superior.',
  })
  personalizarLoja(@Body() dto: PersonalizarLojaDto, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.service.personalizarLoja(exigirAssociado(usuario), dto);
  }

  @Post('loja/produtos/:produtoId')
  @ApiOperation({ summary: 'Adiciona um produto do marketplace à minha loja' })
  adicionarProduto(
    @Param('produtoId', ParseUUIDPipe) produtoId: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.adicionarProdutoNaLoja(exigirAssociado(usuario), produtoId);
  }

  @Delete('loja/produtos/:produtoId')
  @ApiOperation({ summary: 'Remove um produto da minha loja' })
  removerProduto(
    @Param('produtoId', ParseUUIDPipe) produtoId: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.removerProdutoDaLoja(exigirAssociado(usuario), produtoId);
  }

  // ---- cupons ----

  @Get('cupons')
  @ApiOperation({ summary: 'Meus cupons com resumo de uso' })
  cupons(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.service.meusCupons(exigirAssociado(usuario));
  }

  @Post('cupons')
  @ApiOperation({ summary: 'Cria um cupom de desconto' })
  criarCupom(@Body() dto: CriarCupomDto, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.service.criarCupom(exigirAssociado(usuario), dto);
  }

  @Patch('cupons/:id')
  @ApiOperation({ summary: 'Atualiza ou ativa/desativa um cupom' })
  atualizarCupom(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarCupomDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.atualizarCupom(exigirAssociado(usuario), id, dto);
  }

  @Delete('cupons/:id')
  @ApiOperation({ summary: 'Remove um cupom ainda não utilizado' })
  removerCupom(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.service.removerCupom(exigirAssociado(usuario), id);
  }

  // ---- links de afiliado ----

  @Get('links')
  @ApiOperation({ summary: 'Meus links com cliques, conversões e receita' })
  links(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.service.meusLinks(exigirAssociado(usuario));
  }

  @Post('links')
  @ApiOperation({ summary: 'Gera um link rastreável para um produto' })
  gerarLink(@Body() dto: GerarLinkDto, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.service.gerarLink(exigirAssociado(usuario), dto);
  }

  @Public()
  @Get('r/:codigo')
  @Redirect()
  @ApiOperation({
    summary: 'Redirecionador público do link de afiliado',
    description:
      'Registra o clique e redireciona (302) ao checkout do fornecedor, com o código de ' +
      'origem na URL. É o que permite atribuir a venda ao associado. Não exige autenticação.',
  })
  @ApiResponse({ status: 302, description: 'Redireciona ao destino com `?ref=<codigo>`' })
  @ApiResponse({ status: 404, description: 'Código inexistente' })
  async redirecionar(@Param('codigo') codigo: string) {
    const { destino } = await this.service.resolverLink(codigo);
    return { url: destino, statusCode: 302 };
  }

  // ---- performance ----

  @Get('performance')
  @ApiOperation({ summary: 'Cliques, conversões e receita por dia' })
  performance(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query('de') de?: string,
    @Query('ate') ate?: string,
  ) {
    return this.service.performance(exigirAssociado(usuario), de, ate);
  }

  // ---- redes sociais ----

  @Get('redes-sociais')
  @ApiOperation({ summary: 'Contas conectadas e métricas agregadas' })
  redes(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.service.minhasRedes(exigirAssociado(usuario));
  }

  @Post('redes-sociais')
  @ApiOperation({ summary: 'Conecta ou atualiza uma rede social' })
  conectarRede(@Body() dto: ConectarRedeDto, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.service.conectarRede(exigirAssociado(usuario), dto);
  }

  @Delete('redes-sociais/:rede')
  @ApiOperation({ summary: 'Desconecta uma rede social' })
  desconectarRede(
    @Param('rede', new ParseEnumPipe(RedeSocial)) rede: RedeSocial,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.service.desconectarRede(exigirAssociado(usuario), rede);
  }
}

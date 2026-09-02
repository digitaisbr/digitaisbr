import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { NivelPlano, Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CatalogoService } from './catalogo.service';
import {
  AtualizarCategoriaDto, AtualizarProdutoDto, CriarCategoriaDto, CriarProdutoDto, FiltrarProdutosDto,
} from './dto/produto.dto';

@ApiTags('Catálogo')
@ApiBearerAuth()
@Controller('catalogo')
export class CatalogoController {
  constructor(private readonly service: CatalogoService) {}

  // ---- categorias ----

  @Get('categorias')
  @ApiOperation({ summary: 'Lista as categorias com contagem de produtos' })
  listarCategorias() {
    return this.service.listarCategorias();
  }

  @Post('categorias')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cria uma categoria' })
  criarCategoria(@Body() dto: CriarCategoriaDto) {
    return this.service.criarCategoria(dto);
  }

  @Patch('categorias/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualiza uma categoria' })
  atualizarCategoria(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarCategoriaDto) {
    return this.service.atualizarCategoria(id, dto);
  }

  @Delete('categorias/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove uma categoria sem produtos' })
  removerCategoria(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removerCategoria(id);
  }

  // ---- produtos ----

  @Get('produtos')
  @ApiOperation({
    summary: 'Lista o catálogo',
    description:
      'Para associados, produtos acima do plano vêm com `bloqueado: true`; use `apenasDisponiveis=true` para omiti-los.',
  })
  listarProdutos(
    @Query() filtros: FiltrarProdutosDto,
    @CurrentUser('nivelPlano') nivel: NivelPlano | null,
  ) {
    return this.service.listarProdutos(filtros, nivel);
  }

  @Get('produtos/estatisticas')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Totais por status e categoria, preço e comissão médios' })
  estatisticas() {
    return this.service.estatisticas();
  }

  @Get('produtos/mais-vendidos')
  @ApiOperation({ summary: 'Top produtos por receita' })
  @ApiQuery({ name: 'limite', required: false, example: 5 })
  maisVendidos(@Query('limite', new ParseIntPipe({ optional: true })) limite?: number) {
    return this.service.maisVendidos(limite ?? 5);
  }

  @Get('produtos/:id')
  @ApiOperation({ summary: 'Detalha um produto por ID ou SKU' })
  buscarProduto(@Param('id') id: string, @CurrentUser('nivelPlano') nivel: NivelPlano | null) {
    return this.service.buscarProduto(id, nivel);
  }

  @Post('produtos')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cadastra um produto' })
  criarProduto(@Body() dto: CriarProdutoDto) {
    return this.service.criarProduto(dto);
  }

  @Patch('produtos/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualiza um produto' })
  atualizarProduto(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarProdutoDto) {
    return this.service.atualizarProduto(id, dto);
  }

  @Delete('produtos/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove um produto sem vendas' })
  removerProduto(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removerProduto(id);
  }
}

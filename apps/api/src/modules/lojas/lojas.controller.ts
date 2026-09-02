import {
  Body, Controller, Delete, Get, Param, ParseBoolPipe, ParseUUIDPipe, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdicionarProdutoDto, AtualizarLojaDto, CriarLojaDto, FiltrarLojasDto } from './dto/loja.dto';
import { LojasService } from './lojas.service';

@ApiTags('Lojas')
@ApiBearerAuth()
@Controller('lojas')
export class LojasController {
  constructor(private readonly service: LojasService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lista as lojas com filtros e paginação' })
  listar(@Query() filtros: FiltrarLojasDto) {
    return this.service.listar(filtros);
  }

  @Get('estatisticas')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Totais, visualizações e média de produtos por loja' })
  estatisticas() {
    return this.service.estatisticas();
  }

  @Public()
  @Get('publica/:slug')
  @ApiOperation({
    summary: 'Vitrine pública da loja',
    description: 'Não exige autenticação e contabiliza uma visualização a cada acesso.',
  })
  vitrine(@Param('slug') slug: string) {
    return this.service.vitrinePublica(slug);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Detalha uma loja com vitrine e desempenho' })
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.buscar(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cria uma loja' })
  criar(@Body() dto: CriarLojaDto) {
    return this.service.criar(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualiza dados e personalização da loja' })
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarLojaDto) {
    return this.service.atualizar(id, dto);
  }

  @Patch(':id/ativa/:valor')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Ativa ou desativa a loja' })
  alterarStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('valor', ParseBoolPipe) ativa: boolean,
  ) {
    return this.service.alterarStatus(id, ativa);
  }

  @Post(':id/produtos')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Adiciona um produto à vitrine',
    description: 'Valida o limite de produtos do plano e a exclusividade do produto.',
  })
  adicionarProduto(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AdicionarProdutoDto) {
    return this.service.adicionarProduto(id, dto);
  }

  @Delete(':id/produtos/:produtoId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove um produto da vitrine' })
  removerProduto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('produtoId', ParseUUIDPipe) produtoId: string,
  ) {
    return this.service.removerProduto(id, produtoId);
  }
}

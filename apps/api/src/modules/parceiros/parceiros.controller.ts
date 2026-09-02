import {
  Body, Controller, Delete, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NivelPlano, Role } from '@prisma/client';
import { CurrentUser, UsuarioAutenticado } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AtualizarBeneficioDto, AtualizarParceiroDto, CriarBeneficioDto, CriarParceiroDto, FiltrarBeneficiosDto,
} from './dto/parceiro.dto';
import { ParceirosService } from './parceiros.service';

@ApiTags('Parceiros e Benefícios')
@ApiBearerAuth()
@Controller()
export class ParceirosController {
  constructor(private readonly service: ParceirosService) {}

  // ---- parceiros ----

  @Get('parceiros')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lista parceiros com contagem de benefícios' })
  listarParceiros(@Query() filtros: FiltrarBeneficiosDto) {
    return this.service.listarParceiros(filtros);
  }

  @Get('parceiros/estatisticas')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Totais de parceiros, benefícios e mais utilizados' })
  estatisticas() {
    return this.service.estatisticas();
  }

  @Get('parceiros/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Detalha um parceiro com seus benefícios' })
  buscarParceiro(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.buscarParceiro(id);
  }

  @Post('parceiros')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cadastra um parceiro' })
  criarParceiro(@Body() dto: CriarParceiroDto) {
    return this.service.criarParceiro(dto);
  }

  @Patch('parceiros/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualiza um parceiro' })
  atualizarParceiro(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarParceiroDto) {
    return this.service.atualizarParceiro(id, dto);
  }

  @Delete('parceiros/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove um parceiro sem benefícios vinculados' })
  removerParceiro(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removerParceiro(id);
  }

  // ---- benefícios ----

  @Get('beneficios')
  @ApiOperation({
    summary: 'Lista os benefícios',
    description: 'Para associados, os acima do plano vêm com `bloqueado: true`.',
  })
  listarBeneficios(
    @Query() filtros: FiltrarBeneficiosDto,
    @CurrentUser('nivelPlano') nivel: NivelPlano | null,
  ) {
    return this.service.listarBeneficios(filtros, nivel);
  }

  @Get('beneficios/meus-usos')
  @ApiOperation({ summary: 'Histórico de benefícios resgatados pelo associado logado' })
  meusUsos(@CurrentUser() usuario: UsuarioAutenticado) {
    if (!usuario.associadoId) throw new ForbiddenException('Nenhum associado vinculado a esta conta.');
    return this.service.usosDoAssociado(usuario.associadoId);
  }

  @Get('beneficios/:id')
  @ApiOperation({ summary: 'Detalha um benefício' })
  buscarBeneficio(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.buscarBeneficio(id);
  }

  @Post('beneficios')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cria um benefício' })
  criarBeneficio(@Body() dto: CriarBeneficioDto) {
    return this.service.criarBeneficio(dto);
  }

  @Post('beneficios/:id/resgatar')
  @ApiOperation({
    summary: 'Resgata um benefício',
    description: 'Valida o plano do associado e devolve as instruções de uso.',
  })
  resgatar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() usuario: UsuarioAutenticado) {
    if (!usuario.associadoId) throw new ForbiddenException('Nenhum associado vinculado a esta conta.');
    return this.service.registrarUso(id, usuario.associadoId);
  }

  @Patch('beneficios/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualiza um benefício' })
  atualizarBeneficio(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarBeneficioDto) {
    return this.service.atualizarBeneficio(id, dto);
  }

  @Delete('beneficios/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove um benefício' })
  removerBeneficio(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removerBeneficio(id);
  }
}

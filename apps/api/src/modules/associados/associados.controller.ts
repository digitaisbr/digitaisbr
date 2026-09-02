import {
  Body, Controller, Delete, Get, Param, ParseEnumPipe, ParseIntPipe, ParseUUIDPipe,
  Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RedeSocial, Role, StatusAssociado } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AssociadosService } from './associados.service';
import {
  AlterarPlanoDto, AtualizarAssociadoDto, CriarAssociadoDto, FiltrarAssociadosDto,
  VincularRedeSocialDto,
} from './dto/associado.dto';

@ApiTags('Associados')
@ApiBearerAuth()
@Controller('associados')
export class AssociadosController {
  constructor(private readonly service: AssociadosService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lista associados com busca, filtros e paginação' })
  listar(@Query() filtros: FiltrarAssociadosDto) {
    return this.service.listar(filtros);
  }

  @Get('estatisticas')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Totais por status, plano e nicho' })
  estatisticas() {
    return this.service.estatisticas();
  }

  @Get('ranking')
  @ApiOperation({ summary: 'Ranking de associados por pontuação' })
  @ApiQuery({ name: 'limite', required: false, example: 10 })
  ranking(@Query('limite', new ParseIntPipe({ optional: true })) limite?: number) {
    return this.service.ranking(limite ?? 10);
  }

  @Public()
  @Get('perfil/:handle')
  @ApiOperation({ summary: 'Perfil público do associado (respeita as preferências de privacidade)' })
  perfilPublico(@Param('handle') handle: string) {
    return this.service.buscarPorHandle(handle);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Ficha completa do associado' })
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.buscar(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cadastra um associado (cria usuário, assinatura e loja)' })
  criar(@Body() dto: CriarAssociadoDto) {
    return this.service.criar(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualiza os dados cadastrais' })
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarAssociadoDto) {
    return this.service.atualizar(id, dto);
  }

  @Patch(':id/plano')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Troca o plano e reabre a assinatura' })
  alterarPlano(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AlterarPlanoDto) {
    return this.service.alterarPlano(id, dto);
  }

  @Patch(':id/status/:status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Ativa, inativa ou suspende (reflete no acesso e na loja)' })
  alterarStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('status', new ParseEnumPipe(StatusAssociado)) status: StatusAssociado,
  ) {
    return this.service.alterarStatus(id, status);
  }

  @Post(':id/redes-sociais')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Vincula ou atualiza uma rede social' })
  vincularRede(@Param('id', ParseUUIDPipe) id: string, @Body() dto: VincularRedeSocialDto) {
    return this.service.vincularRedeSocial(id, dto);
  }

  @Delete(':id/redes-sociais/:rede')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Desvincula uma rede social' })
  desvincularRede(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('rede', new ParseEnumPipe(RedeSocial)) rede: RedeSocial,
  ) {
    return this.service.desvincularRedeSocial(id, rede);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove um associado sem vendas registradas' })
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remover(id);
  }
}

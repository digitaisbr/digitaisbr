import { Controller, ForbiddenException, Get, Param, ParseIntPipe, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, UsuarioAutenticado } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { GamificacaoService } from './gamificacao.service';

@ApiTags('Gamificação')
@ApiBearerAuth()
@Controller('gamificacao')
export class GamificacaoController {
  constructor(private readonly service: GamificacaoService) {}

  @Get('ranking')
  @ApiOperation({ summary: 'Ranking com a posição e o percentil do associado logado' })
  @ApiQuery({ name: 'limite', required: false, example: 10 })
  ranking(
    @CurrentUser('associadoId') associadoId: string | null,
    @Query('limite', new ParseIntPipe({ optional: true })) limite?: number,
  ) {
    return this.service.ranking(limite ?? 10, associadoId);
  }

  @Get('conquistas')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Catálogo de conquistas com quantos associados desbloquearam' })
  listarConquistas() {
    return this.service.listarConquistas();
  }

  @Get('minhas-conquistas')
  @ApiOperation({ summary: 'Conquistas e progresso do associado logado' })
  minhas(@CurrentUser() usuario: UsuarioAutenticado) {
    if (!usuario.associadoId) throw new ForbiddenException('Nenhum associado vinculado a esta conta.');
    return this.service.conquistasDoAssociado(usuario.associadoId);
  }

  @Post('recalcular/:associadoId')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Recalcula pontuação e conquistas',
    description: 'Reprocessa a partir das vendas, comissões, loja, cupons e posts reais.',
  })
  recalcular(@Param('associadoId', ParseUUIDPipe) associadoId: string) {
    return this.service.recalcular(associadoId);
  }
}

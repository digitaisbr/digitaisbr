import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { AtualizarPlanoDto, CriarPlanoDto } from './dto/plano.dto';
import { PlanosService } from './planos.service';

@ApiTags('Planos')
@ApiBearerAuth()
@Controller('planos')
export class PlanosController {
  constructor(private readonly service: PlanosService) {}

  @Get()
  @ApiOperation({ summary: 'Lista os planos com contagem de associados ativos' })
  listar() {
    return this.service.listar();
  }

  @Get('metricas')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'MRR, ARR e distribuição de associados por plano' })
  metricas() {
    return this.service.metricas();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um plano' })
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.buscar(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cria um plano' })
  criar(@Body() dto: CriarPlanoDto) {
    return this.service.criar(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualiza um plano' })
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarPlanoDto) {
    return this.service.atualizar(id, dto);
  }
}

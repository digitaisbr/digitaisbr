import { Injectable } from '@nestjs/common';
import { StatusAssociado } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { num } from '../../common/utils/query.util';
import { AtualizarPlanoDto, CriarPlanoDto } from './dto/plano.dto';

@Injectable()
export class PlanosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista os planos com a contagem de associados ativos em cada um. */
  async listar() {
    const planos = await this.prisma.plano.findMany({
      orderBy: { ordem: 'asc' },
      include: {
        _count: { select: { associados: { where: { status: StatusAssociado.ATIVO } } } },
      },
    });

    return planos.map(({ _count, ...p }) => ({
      ...p,
      preco: num(p.preco),
      comissaoExtraPct: num(p.comissaoExtraPct),
      associadosAtivos: _count.associados,
    }));
  }

  async buscar(id: string) {
    const plano = await this.prisma.plano.findUniqueOrThrow({
      where: { id },
      include: {
        _count: { select: { associados: true, beneficios: true, conteudos: true } },
      },
    });
    return { ...plano, preco: num(plano.preco), comissaoExtraPct: num(plano.comissaoExtraPct) };
  }

  criar(dto: CriarPlanoDto) {
    return this.prisma.plano.create({ data: { ...dto, ordem: dto.ordem ?? 1 } });
  }

  atualizar(id: string, dto: AtualizarPlanoDto) {
    return this.prisma.plano.update({ where: { id }, data: dto });
  }

  /** Receita recorrente mensal e distribuição de associados por plano. */
  async metricas() {
    const planos = await this.listar();
    const mrr = planos.reduce((s, p) => s + p.preco * p.associadosAtivos, 0);
    const total = planos.reduce((s, p) => s + p.associadosAtivos, 0);

    return {
      mrr: Number(mrr.toFixed(2)),
      arr: Number((mrr * 12).toFixed(2)),
      totalAssociadosAtivos: total,
      distribuicao: planos.map((p) => ({
        nivel: p.nivel,
        nome: p.nome,
        preco: p.preco,
        associados: p.associadosAtivos,
        percentual: total ? Number(((p.associadosAtivos / total) * 100).toFixed(1)) : 0,
        receita: Number((p.preco * p.associadosAtivos).toFixed(2)),
      })),
    };
  }
}

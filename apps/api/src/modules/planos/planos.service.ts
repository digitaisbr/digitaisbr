import { Injectable } from '@nestjs/common';
import { StatusAssociado } from '@prisma/client';
import { AuditoriaService, type Autor } from '../../common/auditoria/auditoria.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { num } from '../../common/utils/query.util';
import { AtualizarPlanoDto, CriarPlanoDto } from './dto/plano.dto';

@Injectable()
export class PlanosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

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

  async criar(dto: CriarPlanoDto, autor: Autor = {}) {
    const plano = await this.prisma.plano.create({ data: { ...dto, ordem: dto.ordem ?? 1 } });
    await this.auditoria.registrar('CRIAR', 'Plano', plano.id, autor, {
      nome: dto.nome,
      preco: dto.preco,
      nivel: dto.nivel,
    });
    return plano;
  }

  async atualizar(id: string, dto: AtualizarPlanoDto, autor: Autor = {}) {
    // preço de plano é informação comercial sensível: guardar o valor anterior
    // é o que permite explicar depois quando e por quem um reajuste aconteceu
    const antes = await this.prisma.plano.findUniqueOrThrow({ where: { id } });
    const depois = await this.prisma.plano.update({ where: { id }, data: dto });

    const mudou = AuditoriaService.diferencas(
      antes as unknown as Record<string, unknown>,
      depois as unknown as Record<string, unknown>,
    );
    if (Object.keys(mudou).length) {
      await this.auditoria.registrar('ATUALIZAR', 'Plano', id, autor, mudou);
    }
    return depois;
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

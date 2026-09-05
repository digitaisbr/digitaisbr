import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PlanoGuard } from './common/guards/plano.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PrismaModule } from './common/prisma/prisma.module';
import { AssociadosModule } from './modules/associados/associados.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogoModule } from './modules/catalogo/catalogo.module';
import { ComissoesModule } from './modules/comissoes/comissoes.module';
import { ComunidadeModule } from './modules/comunidade/comunidade.module';
import { ConteudosModule } from './modules/conteudos/conteudos.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { FinanceiroModule } from './modules/financeiro/financeiro.module';
import { GamificacaoModule } from './modules/gamificacao/gamificacao.module';
import { LojasModule } from './modules/lojas/lojas.module';
import { NotificacoesModule } from './modules/notificacoes/notificacoes.module';
import { ParceirosModule } from './modules/parceiros/parceiros.module';
import { PlanosModule } from './modules/planos/planos.module';
import { PortalModule } from './modules/portal/portal.module';
import { SaudeModule } from './modules/saude/saude.module';
import { ServicosModule } from './modules/servicos/servicos.module';
import { SuporteModule } from './modules/suporte/suporte.module';
import { VendasModule } from './modules/vendas/vendas.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        // configurável para permitir medição de capacidade sem o limitador no caminho
        limit: Number(process.env.THROTTLE_LIMIT ?? 300),
      },
    ]),
    PrismaModule,

    // autenticação e cadastro
    AuthModule,
    PlanosModule,
    AssociadosModule,

    // comercial
    CatalogoModule,
    LojasModule,
    VendasModule,
    ComissoesModule,
    FinanceiroModule,

    // parceiros e conteúdo
    ParceirosModule,
    ConteudosModule,

    // relacionamento
    ComunidadeModule,
    SuporteModule,
    ServicosModule,
    NotificacoesModule,

    // analytics e portal
    GamificacaoModule,
    DashboardModule,
    PortalModule,
    SaudeModule,
  ],
  providers: [
    // a ordem define a cadeia: throttle -> autenticação -> papel -> plano
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PlanoGuard },
  ],
})
export class AppModule {}

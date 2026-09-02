import { Navigate, Route, Routes } from 'react-router-dom';
import { Result } from 'antd';
import { Link } from 'react-router-dom';
import { GateAcesso } from '@/auth/GateAcesso';
import { RotaProtegida } from '@/auth/RotaProtegida';
import { LayoutAdmin } from '@/layouts/LayoutAdmin';
import { LayoutPortal } from '@/layouts/LayoutPortal';

import { Acesso } from '@/paginas/auth/Acesso';
import { Login } from '@/paginas/auth/Login';

import { Dashboard } from '@/paginas/admin/Dashboard';
import { Associados } from '@/paginas/admin/Associados';
import { AssociadoDetalhe } from '@/paginas/admin/AssociadoDetalhe';
import { AssociadoNovo } from '@/paginas/admin/AssociadoNovo';
import { Planos } from '@/paginas/admin/Planos';
import { Catalogo } from '@/paginas/admin/Catalogo';
import { ProdutoDetalhe } from '@/paginas/admin/ProdutoDetalhe';
import { ProdutoNovo } from '@/paginas/admin/ProdutoNovo';
import { Lojas } from '@/paginas/admin/Lojas';
import { LojaDetalhe } from '@/paginas/admin/LojaDetalhe';
import { Vendas } from '@/paginas/admin/Vendas';
import { Comissoes } from '@/paginas/admin/Comissoes';
import { Financeiro } from '@/paginas/admin/Financeiro';
import { Parceiros } from '@/paginas/admin/Parceiros';
import { Beneficios } from '@/paginas/admin/Beneficios';
import { Conteudos } from '@/paginas/admin/Conteudos';
import { Comunidade } from '@/paginas/admin/Comunidade';
import { Servicos } from '@/paginas/admin/Servicos';
import { Suporte } from '@/paginas/admin/Suporte';
import { TicketDetalhe } from '@/paginas/admin/TicketDetalhe';
import { Comunicacoes } from '@/paginas/admin/Comunicacoes';
import { Relatorios } from '@/paginas/admin/Relatorios';

import { Inicio } from '@/paginas/portal/Inicio';
import { MinhaLoja } from '@/paginas/portal/MinhaLoja';
import { MinhasVendas } from '@/paginas/portal/MinhasVendas';
import { MeuFinanceiro } from '@/paginas/portal/MeuFinanceiro';
import { MeusCupons } from '@/paginas/portal/MeusCupons';
import { MeusLinks } from '@/paginas/portal/MeusLinks';
import { Performance } from '@/paginas/portal/Performance';
import { MeusBeneficios } from '@/paginas/portal/MeusBeneficios';
import { MeusConteudos } from '@/paginas/portal/MeusConteudos';
import { Materiais } from '@/paginas/portal/Materiais';
import { ComunidadePortal } from '@/paginas/portal/ComunidadePortal';
import { Ranking } from '@/paginas/portal/Ranking';
import { ServicosPortal } from '@/paginas/portal/ServicosPortal';
import { SuportePortal } from '@/paginas/portal/SuportePortal';
import { RedesSociais } from '@/paginas/portal/RedesSociais';
import { MeuPlano } from '@/paginas/portal/MeuPlano';
import { MeuPerfil } from '@/paginas/portal/MeuPerfil';
import { Notificacoes } from '@/paginas/portal/Notificacoes';

import { Vitrine } from '@/paginas/publico/Vitrine';
import { PerfilPublico } from '@/paginas/publico/PerfilPublico';

export function App() {
  return (
    <Routes>
      {/* --------------------------------------------------- público */}
      <Route path="/acesso" element={<Acesso />} />
      <Route path="/loja/:slug" element={<Vitrine />} />
      <Route path="/perfil/:handle" element={<PerfilPublico />} />

      {/* o login só aparece depois do código de acesso */}
      <Route element={<GateAcesso />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* --------------------------------------------------- administrativo */}
      <Route element={<RotaProtegida papel="ADMIN" />}>
        <Route element={<LayoutAdmin />}>
          <Route index element={<Dashboard />} />
          <Route path="associados" element={<Associados />} />
          <Route path="associados/novo" element={<AssociadoNovo />} />
          <Route path="associados/:id" element={<AssociadoDetalhe />} />
          <Route path="planos" element={<Planos />} />
          <Route path="catalogo" element={<Catalogo />} />
          <Route path="catalogo/novo" element={<ProdutoNovo />} />
          <Route path="catalogo/:id" element={<ProdutoDetalhe />} />
          <Route path="lojas" element={<Lojas />} />
          <Route path="lojas/:id" element={<LojaDetalhe />} />
          <Route path="vendas" element={<Vendas />} />
          <Route path="comissoes" element={<Comissoes />} />
          <Route path="financeiro" element={<Financeiro />} />
          <Route path="parceiros" element={<Parceiros />} />
          <Route path="beneficios" element={<Beneficios />} />
          <Route path="conteudos" element={<Conteudos />} />
          <Route path="comunidade" element={<Comunidade />} />
          <Route path="servicos" element={<Servicos />} />
          <Route path="suporte" element={<Suporte />} />
          <Route path="suporte/:id" element={<TicketDetalhe />} />
          <Route path="comunicacoes" element={<Comunicacoes />} />
          <Route path="relatorios" element={<Relatorios />} />
        </Route>
      </Route>

      {/* --------------------------------------------------- portal */}
      <Route element={<RotaProtegida exigeAssociado />}>
        <Route path="portal" element={<LayoutPortal />}>
          <Route index element={<Inicio />} />
          <Route path="loja" element={<MinhaLoja />} />
          <Route path="vendas" element={<MinhasVendas />} />
          <Route path="financeiro" element={<MeuFinanceiro />} />
          <Route path="cupons" element={<MeusCupons />} />
          <Route path="links" element={<MeusLinks />} />
          <Route path="performance" element={<Performance />} />
          <Route path="beneficios" element={<MeusBeneficios />} />
          <Route path="conteudos" element={<MeusConteudos />} />
          <Route path="materiais" element={<Materiais />} />
          <Route path="comunidade" element={<ComunidadePortal />} />
          <Route path="ranking" element={<Ranking />} />
          <Route path="servicos" element={<ServicosPortal />} />
          <Route path="suporte" element={<SuportePortal />} />
          <Route path="redes-sociais" element={<RedesSociais />} />
          <Route path="plano" element={<MeuPlano />} />
          <Route path="perfil" element={<MeuPerfil />} />
          <Route path="notificacoes" element={<Notificacoes />} />
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <Result
            status="404"
            title="404"
            subTitle="Esta página não existe."
            extra={<Link to="/">Voltar ao início</Link>}
            style={{ paddingTop: 80 }}
          />
        }
      />
      <Route path="/index.html" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

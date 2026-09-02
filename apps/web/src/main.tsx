import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp, ConfigProvider } from 'antd';
import ptBR from 'antd/locale/pt_BR';
import 'antd/dist/reset.css';
// o antd 5 declara suporte a React 16–18; este é o patch oficial para o 19
import '@ant-design/v5-patch-for-react-19';
import { AuthProvider } from '@/auth/AuthContext';
import { fontes, marca } from '@/marca';
import { App } from './App';
import './estilo.css';

const cliente = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      locale={ptBR}
      theme={{
        token: {
          colorPrimary: marca.digitalBlue,
          colorSuccess: marca.mintLeaf,
          colorInfo: marca.digitalBlue,
          colorLink: marca.digitalBlue,
          colorText: marca.texto,
          colorTextSecondary: marca.textoSuave,
          colorBorderSecondary: marca.linha,
          borderRadius: 10,
          fontFamily: fontes.corpo,
          fontSize: 14,
        },
        components: {
          Layout: { bodyBg: marca.fundo, headerBg: '#ffffff', siderBg: '#ffffff' },
          Card: { headerFontSize: 15, borderRadiusLG: 12 },
          Menu: {
            itemSelectedBg: 'rgba(0, 142, 234, 0.10)',
            itemSelectedColor: marca.digitalBlue,
            itemHoverColor: marca.digitalBlue,
          },
          Statistic: { contentFontSize: 22 },
          Table: { headerBg: '#FAFAFC', headerColor: marca.textoSuave },
        },
      }}
    >
      <AntApp>
        <QueryClientProvider client={cliente}>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
);

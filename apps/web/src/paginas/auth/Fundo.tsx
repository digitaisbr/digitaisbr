import type { ReactNode } from 'react';
import { gradienteEscuro } from '@/marca';

/** Fundo institucional das telas de acesso, no roxo profundo da marca. */
export function Fundo({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: gradienteEscuro,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* eco do símbolo da digital, bem sutil, como marca d'água */}
      <div
        style={{
          position: 'absolute',
          right: '-14vw',
          top: '18vh',
          width: '52vw',
          height: '52vw',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.035)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}

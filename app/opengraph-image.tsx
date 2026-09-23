import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#09090b',
          color: '#fafafa',
          padding: '72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 40, fontWeight: 900, letterSpacing: '-0.02em' }}>Gigueiros</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', fontSize: 76, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.03em', maxWidth: 980 }}>
            A agenda e o caixa da banda num lugar só.
          </div>
          <div style={{ display: 'flex', fontSize: 32, color: '#a1a1aa', fontWeight: 500 }}>
            Shows, escala e cachê de cada músico. Chega de planilha e de grupo de WhatsApp.
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

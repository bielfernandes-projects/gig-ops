import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const logo = await readFile(join(process.cwd(), 'public', 'logo-horizontal-dark.png'));
  const src = `data:image/png;base64,${logo.toString('base64')}`;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#09090b' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={960} height={360} alt="Gigueiros" />
      </div>
    ),
    { ...size }
  );
}

import { NextResponse } from 'next/server';
import { getUserInfo } from '@/lib/auth';

/** Bands of the signed-in user and which one the filter has selected (null = "Todas as bandas"). */
export async function GET() {
  const info = await getUserInfo();
  return NextResponse.json({ memberships: info.memberships, bandId: info.bandId });
}

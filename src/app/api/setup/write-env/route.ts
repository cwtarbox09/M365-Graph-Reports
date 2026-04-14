import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

/**
 * POST /api/setup/write-env
 *
 * Writes validated credentials to .env.local for local development.
 * Only works in local development (not on Vercel / NODE_ENV=production).
 *
 * This endpoint is disabled once the app is already configured.
 */
export async function POST(request: NextRequest) {
  // Only available in development and only when the app is not yet configured
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in local development.' },
      { status: 403 },
    );
  }

  const alreadyConfigured =
    process.env.AZURE_AD_CLIENT_ID &&
    process.env.AZURE_AD_CLIENT_SECRET &&
    process.env.AZURE_AD_TENANT_ID;

  if (alreadyConfigured) {
    return NextResponse.json(
      { error: 'App is already configured.' },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const { clientId, clientSecret, tenantId, nextAuthSecret } = body ?? {};

  if (!clientId || !clientSecret || !tenantId || !nextAuthSecret) {
    return NextResponse.json(
      { error: 'clientId, clientSecret, tenantId, and nextAuthSecret are required' },
      { status: 400 },
    );
  }

  const envContent = [
    `AZURE_AD_CLIENT_ID="${clientId}"`,
    `AZURE_AD_CLIENT_SECRET="${clientSecret}"`,
    `AZURE_AD_TENANT_ID="${tenantId}"`,
    `NEXTAUTH_SECRET="${nextAuthSecret}"`,
    `NEXTAUTH_URL="http://localhost:3000"`,
    '',
  ].join('\n');

  const envPath = path.join(process.cwd(), '.env.local');

  try {
    await writeFile(envPath, envContent, { encoding: 'utf8', flag: 'w' });
  } catch (err) {
    return NextResponse.json(
      { error: `Could not write .env.local: ${(err as Error).message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, path: '.env.local' });
}

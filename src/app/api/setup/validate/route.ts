import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/setup/validate
 *
 * Validates Azure AD credentials by attempting to acquire an app-only token.
 * This endpoint is intentionally unauthenticated — it's called from the
 * /setup wizard before the app is fully configured.
 *
 * Disallowed once the app is configured (env vars present) to prevent
 * credential enumeration attacks.
 */
export async function POST(request: NextRequest) {
  // Block this endpoint if the app is already configured
  const alreadyConfigured =
    process.env.AZURE_AD_CLIENT_ID &&
    process.env.AZURE_AD_CLIENT_SECRET &&
    process.env.AZURE_AD_TENANT_ID;

  if (alreadyConfigured) {
    return NextResponse.json(
      { error: 'App is already configured. Use the dashboard.' },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const { clientId, clientSecret, tenantId } = body ?? {};

  if (!clientId || !clientSecret || !tenantId) {
    return NextResponse.json(
      { error: 'clientId, clientSecret, and tenantId are required' },
      { status: 400 },
    );
  }

  // Basic GUID validation
  const guidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!guidRe.test(clientId) || !guidRe.test(tenantId)) {
    return NextResponse.json(
      { error: 'clientId and tenantId must be valid GUIDs' },
      { status: 400 },
    );
  }

  // Attempt to acquire an app-only token from the Microsoft identity platform
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     clientId,
        client_secret: clientSecret,
        grant_type:    'client_credentials',
        scope:         'https://graph.microsoft.com/.default',
      }),
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to reach Microsoft identity platform — check your network' },
      { status: 503 },
    );
  }

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok) {
    const description: string = tokenData.error_description ?? tokenData.error ?? 'Unknown error';

    // Translate common MSAL errors into user-friendly messages
    let friendlyError = description;
    if (description.includes('AADSTS700016')) {
      friendlyError = 'App registration not found. Check your Client ID and Tenant ID.';
    } else if (description.includes('AADSTS7000215') || description.includes('AADSTS7000222')) {
      friendlyError = 'Invalid client secret. Make sure you copied the secret VALUE, not the secret ID.';
    } else if (description.includes('AADSTS90002')) {
      friendlyError = 'Tenant not found. Check your Tenant ID.';
    } else if (description.includes('AADSTS50076')) {
      friendlyError = 'MFA required. Credentials look valid — try signing in interactively.';
    }

    return NextResponse.json({ error: friendlyError }, { status: 400 });
  }

  // Token acquired — now verify it has the required scopes by calling Graph
  let graphResponse: Response;
  try {
    graphResponse = await fetch(
      'https://graph.microsoft.com/v1.0/organization?$select=id,displayName,verifiedDomains',
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    );
  } catch {
    // Token works, Graph might be temporarily unreachable — still report success
    return NextResponse.json({ ok: true, tenantName: null });
  }

  if (!graphResponse.ok) {
    const graphErr = await graphResponse.json().catch(() => ({}));
    const code: string = graphErr?.error?.code ?? '';

    if (code === 'Authorization_RequestDenied' || graphResponse.status === 403) {
      return NextResponse.json({
        error:
          'Credentials are valid but missing permissions. ' +
          'Make sure AuditLog.Read.All and Directory.Read.All Application permissions ' +
          'are added and admin consent has been granted.',
      }, { status: 400 });
    }

    // Other Graph error — credentials worked, warn but still succeed
    return NextResponse.json({ ok: true, tenantName: null });
  }

  const graphData = await graphResponse.json();
  const org       = graphData?.value?.[0];
  const tenantName: string | null =
    org?.displayName ??
    org?.verifiedDomains?.find((d: { isDefault?: boolean; name?: string }) => d.isDefault)?.name ??
    null;

  return NextResponse.json({ ok: true, tenantName });
}

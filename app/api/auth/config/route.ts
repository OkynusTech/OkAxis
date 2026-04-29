import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/config/status
 * 
 * Returns the current authentication configuration status
 * Useful for debugging and verifying setup completion
 * 
 * @returns {object} Configuration status with validation results
 */
export async function GET(req: NextRequest) {
  // Check if request is from localhost (for security)
  const origin = req.headers.get('origin') || req.headers.get('referer');
  const isLocalhost = origin?.includes('localhost') || origin?.includes('127.0.0.1');
  
  if (!isLocalhost && process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Unauthorized: Only accessible from localhost' },
      { status: 401 }
    );
  }

  const status = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    zitadel: {
      issuer: process.env.ZITADEL_ISSUER || '',
      clientId: process.env.ZITADEL_CLIENT_ID ? '●●●●●' : 'NOT SET',
      clientSecret: process.env.ZITADEL_CLIENT_SECRET ? '●●●●●' : 'NOT SET',
      isConfigured: Boolean(
        process.env.ZITADEL_ISSUER &&
        process.env.ZITADEL_CLIENT_ID &&
        process.env.ZITADEL_CLIENT_SECRET &&
        !process.env.ZITADEL_CLIENT_ID?.includes('placeholder') &&
        !process.env.ZITADEL_CLIENT_SECRET?.includes('placeholder')
      ),
    },
    nextauth: {
      url: process.env.NEXTAUTH_URL || '',
      secret: process.env.NEXTAUTH_SECRET ? '●●●●●' : 'NOT SET',
      isConfigured: Boolean(
        process.env.NEXTAUTH_SECRET &&
        process.env.NEXTAUTH_URL
      ),
    },
    validation: {
      zitadelIssuerValid: (process.env.ZITADEL_ISSUER || '').startsWith('http'),
      clientIdValid: !!(process.env.ZITADEL_CLIENT_ID && !process.env.ZITADEL_CLIENT_ID.includes('placeholder')),
      clientSecretValid: !!(process.env.ZITADEL_CLIENT_SECRET && !process.env.ZITADEL_CLIENT_SECRET.includes('placeholder')),
      nextauthUrlValid: (process.env.NEXTAUTH_URL || '').startsWith('http'),
      nextauthSecretValid: !!process.env.NEXTAUTH_SECRET,
    },
    status: {
      ready: Boolean(
        process.env.ZITADEL_ISSUER &&
        process.env.ZITADEL_CLIENT_ID &&
        process.env.ZITADEL_CLIENT_SECRET &&
        !process.env.ZITADEL_CLIENT_ID?.includes('placeholder') &&
        !process.env.ZITADEL_CLIENT_SECRET?.includes('placeholder') &&
        process.env.NEXTAUTH_SECRET &&
        process.env.NEXTAUTH_URL
      ),
      message: '',
    },
    endpoints: {
      zitadelConsole: `${process.env.ZITADEL_ISSUER || 'http://localhost:8080'}/ui/console`,
      wellKnown: `${process.env.ZITADEL_ISSUER || 'http://localhost:8080'}/oauth/v2/.well-known/openid-configuration`,
      nextauthCallback: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/callback/zitadel`,
    },
    documentation: {
      setupGuide: '/docs/ZITADEL_COMPLETE_SETUP.md',
      authConfig: '/lib/auth.ts',
    },
  };

  // Generate status message
  if (!status.status.ready) {
    const missing = [];
    if (!process.env.ZITADEL_ISSUER) missing.push('ZITADEL_ISSUER');
    if (!process.env.ZITADEL_CLIENT_ID || process.env.ZITADEL_CLIENT_ID.includes('placeholder')) missing.push('ZITADEL_CLIENT_ID');
    if (!process.env.ZITADEL_CLIENT_SECRET || process.env.ZITADEL_CLIENT_SECRET.includes('placeholder')) missing.push('ZITADEL_CLIENT_SECRET');
    if (!process.env.NEXTAUTH_SECRET) missing.push('NEXTAUTH_SECRET');
    if (!process.env.NEXTAUTH_URL) missing.push('NEXTAUTH_URL');
    
    status.status.message = `Missing or invalid configuration: ${missing.join(', ')}. See setupGuide for instructions.`;
  } else {
    status.status.message = 'Authentication is fully configured and ready.';
  }

  return NextResponse.json(status, { status: status.status.ready ? 200 : 400 });
}

/**
 * POST /api/auth/config/validate
 * 
 * Performs comprehensive validation of Zitadel connectivity and configuration
 * 
 * @returns {object} Validation results
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin') || req.headers.get('referer');
  const isLocalhost = origin?.includes('localhost') || origin?.includes('127.0.0.1');
  
  if (!isLocalhost && process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Unauthorized: Only accessible from localhost' },
      { status: 401 }
    );
  }

  const results = {
    timestamp: new Date().toISOString(),
    checks: {
      environmentVariables: { passed: true, message: '' },
      zitadelConnectivity: { passed: false, message: '' },
      zitadelOidc: { passed: false, message: '' },
      redirectUri: { passed: false, message: '' },
    },
  };

  // Check 1: Environment Variables
  const envVars = {
    ZITADEL_ISSUER: process.env.ZITADEL_ISSUER,
    ZITADEL_CLIENT_ID: process.env.ZITADEL_CLIENT_ID,
    ZITADEL_CLIENT_SECRET: process.env.ZITADEL_CLIENT_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  };

  const envValid = Object.entries(envVars).every(
    ([key, value]) => value && !value.includes('placeholder')
  );

  results.checks.environmentVariables.passed = envValid;
  results.checks.environmentVariables.message = envValid
    ? 'All required environment variables are set'
    : `Missing: ${Object.entries(envVars)
        .filter(([, v]) => !v || v.includes('placeholder'))
        .map(([k]) => k)
        .join(', ')}`;

  // Check 2: Zitadel Connectivity
  try {
    const response = await fetch(`${process.env.ZITADEL_ISSUER || 'http://localhost:8080'}/healthz`, {
      method: 'GET',
      timeout: 5000,
    });
    results.checks.zitadelConnectivity.passed = response.ok;
    results.checks.zitadelConnectivity.message = response.ok
      ? 'Zitadel is reachable'
      : `Zitadel returned status ${response.status}`;
  } catch (error) {
    results.checks.zitadelConnectivity.passed = false;
    results.checks.zitadelConnectivity.message = `Cannot reach Zitadel: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  // Check 3: OIDC Configuration Endpoint
  try {
    const response = await fetch(
      `${process.env.ZITADEL_ISSUER || 'http://localhost:8080'}/oauth/v2/.well-known/openid-configuration`,
      { timeout: 5000 }
    );
    results.checks.zitadelOidc.passed = response.ok;
    results.checks.zitadelOidc.message = response.ok
      ? 'OIDC configuration is accessible'
      : `OIDC config returned status ${response.status}`;
  } catch (error) {
    results.checks.zitadelOidc.passed = false;
    results.checks.zitadelOidc.message = `Cannot access OIDC config: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  // Check 4: Redirect URI Format
  const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/callback/zitadel`;
  const redirectUriValid = redirectUri.startsWith('http');
  results.checks.redirectUri.passed = redirectUriValid;
  results.checks.redirectUri.message = redirectUriValid
    ? `Redirect URI is valid: ${redirectUri}`
    : 'Redirect URI format is invalid';

  return NextResponse.json(results, {
    status: Object.values(results.checks).every((c) => c.passed) ? 200 : 400,
  });
}

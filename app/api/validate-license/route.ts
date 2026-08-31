import { NextRequest, NextResponse } from 'next/server';
import { validateAndActivate, generateDeviceIdentifier } from '@/lib/license/validate';
import { createSessionJWT, setSessionCookie, setDeviceCookie, getDeviceFromCookies } from '@/lib/license/session';
import { isValidEdition } from '@/lib/data/types';

interface ActivateRequest {
  licenseKey: string;
  edition: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ActivateRequest;
    const { licenseKey, edition } = body;

    // Validate input
    if (!licenseKey || typeof licenseKey !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Clé de licence requise' },
        { status: 400 }
      );
    }

    if (!edition || !isValidEdition(edition)) {
      return NextResponse.json(
        { success: false, message: 'Édition invalide' },
        { status: 400 }
      );
    }

    // Get or generate device identifier
    const cookieHeader = request.headers.get('cookie') || '';
    let deviceIdentifier = getDeviceFromCookies(cookieHeader);
    if (!deviceIdentifier) {
      deviceIdentifier = generateDeviceIdentifier();
    }

    // Validate and activate via Chariow API
    const result = await validateAndActivate(licenseKey, deviceIdentifier);

    if (!result.valid) {
      return NextResponse.json(
        { success: false, message: result.reason || 'Licence invalide' },
        { status: 400 }
      );
    }

    // Create JWT session
    const sessionToken = await createSessionJWT(edition, licenseKey);

    // Build response with cookies
    const response = NextResponse.json({
      success: true,
      message: 'Licence activée avec succès',
      redirectUrl: `/${edition}`,
    });

    // Set session cookie
    const sessionCookie = setSessionCookie(edition, sessionToken);
    response.headers.append('Set-Cookie', sessionCookie);

    // Set device cookie if not already set
    if (!deviceIdentifier.startsWith('server-')) {
      const deviceCookie = setDeviceCookie(deviceIdentifier);
      response.headers.append('Set-Cookie', deviceCookie);
    }

    return response;
  } catch (error) {
    console.error('License activation error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

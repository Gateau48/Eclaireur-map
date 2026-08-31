import type { ChariowLicense, ChariowActivationResponse, ValidateResult, ActivateResult } from './types';

const CHARIOW_BASE_URL = 'https://api.chariow.com/v1';

function getApiKey(): string {
  const key = process.env.CHARIOW_API_KEY;
  if (!key) throw new Error('CHARIOW_API_KEY environment variable is not set');
  return key;
}

function getHeaders(): HeadersInit {
  return {
    'Authorization': `Bearer ${getApiKey()}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Validate a license key via Chariow API (GET /v1/licenses/{licenseKey})
 * This is step 1 of the validation process.
 */
export async function validateLicense(licenseKey: string): Promise<ValidateResult> {
  try {
    const response = await fetch(`${CHARIOW_BASE_URL}/licenses/${encodeURIComponent(licenseKey)}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { valid: false, reason: 'Licence introuvable' };
      }
      return { valid: false, reason: 'Erreur lors de la validation' };
    }

    const { data } = await response.json() as { data: ChariowLicense };

    if (data.status === 'revoked') {
      return { valid: false, reason: 'Licence révoquée' };
    }

    if (data.status === 'expired') {
      return { valid: false, reason: 'Licence expirée' };
    }

    if (!data.is_active && !data.can_activate) {
      return { valid: false, reason: 'Licence ne peut pas être activée' };
    }

    return { valid: true, license: data };
  } catch {
    return { valid: false, reason: 'Erreur réseau' };
  }
}

/**
 * Activate a license on the current device via Chariow API (POST /v1/licenses/{licenseKey}/activate)
 * This is step 2 of the validation process.
 */
export async function activateLicense(licenseKey: string, deviceIdentifier: string): Promise<ActivateResult> {
  try {
    const response = await fetch(`${CHARIOW_BASE_URL}/licenses/${encodeURIComponent(licenseKey)}/activate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ device_identifier: deviceIdentifier }),
    });

    const result = await response.json() as ChariowActivationResponse | { message: string; errors: string[] };

    if (!response.ok) {
      const errorMsg = 'message' in result ? result.message : 'Erreur lors de l\'activation';
      return { success: false, message: errorMsg };
    }

    return {
      success: true,
      message: 'Licence activée avec succès',
      license: (result as ChariowActivationResponse).data.license,
    };
  } catch {
    return { success: false, message: 'Erreur réseau lors de l\'activation' };
  }
}

/**
 * Combined validation: validate + activate if needed
 * Returns the final valid state and creates a session if successful.
 */
export async function validateAndActivate(licenseKey: string, deviceIdentifier: string): Promise<ValidateResult> {
  // Step 1: Validate
  const validation = await validateLicense(licenseKey);
  if (!validation.valid) {
    return validation;
  }

  // Step 2: Activate if needed
  if (validation.license && !validation.license.is_active && validation.license.can_activate) {
    const activation = await activateLicense(licenseKey, deviceIdentifier);
    if (!activation.success) {
      return { valid: false, reason: activation.message };
    }
    // Update license data after activation
    validation.license = activation.license;
  }

  return validation;
}

/**
 * Generate a device identifier based on available browser data.
 * In production, this could use a more robust fingerprinting approach.
 */
export function generateDeviceIdentifier(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use a combination of browser attributes
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset().toString(),
    ];
    return btoa(components.join('|')).substring(0, 64);
  }
  // Server-side fallback
  return `server-${Date.now()}`;
}

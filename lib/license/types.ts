export interface ChariowLicense {
  id: string;
  status: 'pending_activation' | 'active' | 'expired' | 'revoked';
  customer: {
    id: string;
    name: string;
    email: string;
  };
  product: {
    id: string;
    name: string;
    slug: string;
  };
  license: {
    key: string;
    masked_key: string;
  };
  is_active: boolean;
  is_expired: boolean;
  can_activate: boolean;
  activations: {
    count: number;
    max: number;
    remaining: number;
  };
  activated_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
}

export interface ChariowActivationResponse {
  message: string;
  data: {
    activation: {
      id: string;
      device_identifier: string;
      ip_address: string;
      user_agent: string;
      activated_at: string;
    };
    license: ChariowLicense;
  };
}

export interface SessionPayload {
  edition: string;
  licenseKey: string;
  iat: number;
  exp: number;
}

export interface ValidateResult {
  valid: boolean;
  reason?: string;
  license?: ChariowLicense;
}

export interface ActivateResult {
  success: boolean;
  message: string;
  license?: ChariowLicense;
}

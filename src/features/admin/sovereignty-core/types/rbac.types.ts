// Types pour le système RBAC granulaire

export type AccessAction =
  | 'read'
  | 'write'
  | 'delete'
  | 'share'
  | 'admin'
  | 'execute'
  | 'download'
  | 'upload';

export type VisibilityLevel = 'public' | 'restricted' | 'invisible' | 'classified';

export type MFALevel = 'none' | 'standard' | 'biometric' | 'hardware';

export interface AccessPolicy {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  priority: number;
  conditions: PolicyConditions;
  resource_patterns: ResourcePattern[];
  allowed_actions: AccessAction[];
  denied_actions: AccessAction[];
  required_mfa_level: MFALevel;
  is_active: boolean;
  valid_from?: string;
  valid_until?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PolicyConditions {
  ip_ranges?: string[];
  time_windows?: TimeWindow[];
  geo_locations?: string[]; // Country codes
  device_types?: ('desktop' | 'mobile' | 'tablet')[];
  requires_vpn?: boolean;
}

export interface TimeWindow {
  days: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  start: string; // Format: "HH:MM"
  end: string;   // Format: "HH:MM"
}

export interface ResourcePattern {
  type: string; // 'folder', 'file', 'catalog', etc.
  path?: string;
  tags?: string[];
  id?: string;
}

export interface TemporalAccessGrant {
  id: string;
  organization_id: string;
  user_id: string;
  resource_id: string;
  resource_type: string;
  allowed_actions: AccessAction[];
  granted_at: string;
  expires_at: string;
  auto_destroy: boolean;
  max_access_count?: number;
  current_access_count: number;
  granted_by: string;
  last_accessed_at?: string;
  revoked_at?: string;
  revoked_by?: string;
  created_at: string;
}

export interface InvisibleResource {
  id: string;
  organization_id: string;
  resource_id: string;
  resource_type: string;
  visibility_level: VisibilityLevel;
  required_mfa_level: MFALevel;
  authorized_users: string[];
  authorized_roles: string[];
  revealed_to: RevealedAccess[];
  created_at: string;
  updated_at: string;
}

export interface RevealedAccess {
  user_id: string;
  revealed_at: string;
  mfa_verified: boolean;
}

export interface AccessContext {
  ip_address?: string;
  timestamp?: string;
  device_type?: 'desktop' | 'mobile' | 'tablet';
  geo_location?: {
    country: string;
    city?: string;
  };
  is_vpn?: boolean;
}

export interface AccessCheckResult {
  allowed: boolean;
  reason: string;
  policy_id?: string;
  policy_name?: string;
  required_mfa?: MFALevel;
  grant_id?: string;
  expires_at?: string;
}

export interface CreatePolicyInput {
  name: string;
  description?: string;
  priority?: number;
  conditions: PolicyConditions;
  resource_patterns: ResourcePattern[];
  allowed_actions: AccessAction[];
  denied_actions?: AccessAction[];
  required_mfa_level?: MFALevel;
  valid_from?: string;
  valid_until?: string;
}

export interface CreateTemporalGrantInput {
  user_id: string;
  resource_id: string;
  resource_type: string;
  allowed_actions: AccessAction[];
  expires_at: string;
  auto_destroy?: boolean;
  max_access_count?: number;
}

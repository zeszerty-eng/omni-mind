// Types pour le système d'organisations multi-tenant

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  settings: OrganizationSettings;
  logo_url?: string;
  primary_color?: string;
  is_active: boolean;
  suspended_at?: string;
  suspended_reason?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface OrganizationSettings {
  features: {
    ai_surveillance: boolean;
    ghost_mode: boolean;
    dlp: boolean;
    shadow_archives: boolean;
    command_palette: boolean;
  };
  security: {
    mfa_required: boolean;
    session_timeout_minutes: number;
    max_failed_login_attempts: number;
  };
  audit: {
    retention_days: number;
    immutable_logs: boolean;
  };
}

export type OrganizationRole = 'owner' | 'admin' | 'manager' | 'member' | 'guest';

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  custom_permissions: string[];
  is_active: boolean;
  invited_at: string;
  joined_at?: string;
  invited_by?: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: OrganizationRole;
  token: string;
  expires_at: string;
  accepted_at?: string;
  accepted_by?: string;
  invited_by: string;
  created_at: string;
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  description?: string;
  settings?: Partial<OrganizationSettings>;
  logo_url?: string;
  primary_color?: string;
}

export interface InviteMemberInput {
  email: string;
  role: OrganizationRole;
  organization_id: string;
}

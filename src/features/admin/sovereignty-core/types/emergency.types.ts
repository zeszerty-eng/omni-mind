// Types pour le système d'actions d'urgence et kill switch

export type EmergencyActionType =
  | 'freeze_all'
  | 'revoke_all_sessions'
  | 'lockdown'
  | 'destroy_keys'
  | 'isolate_user'
  | 'freeze_resource';

export type EmergencyStatus =
  | 'pending'
  | 'confirmed'
  | 'executing'
  | 'executed'
  | 'failed'
  | 'cancelled';

export type LockdownLevel = 'freeze' | 'lockdown' | 'total';

export interface EmergencyAction {
  id: string;
  organization_id: string;
  action_type: EmergencyActionType;
  target_user_id?: string;
  target_resource_id?: string;
  target_resource_type?: string;
  reason: string;
  additional_context: Record<string, any>;
  requires_confirmations: number;
  confirmations: AdminConfirmation[];
  status: EmergencyStatus;
  execution_started_at?: string;
  execution_completed_at?: string;
  execution_error?: string;
  execution_result?: Record<string, any>;
  cancelled_at?: string;
  cancelled_by?: string;
  cancellation_reason?: string;
  expires_at: string;
  initiated_by: string;
  initiated_at: string;
  created_at: string;
}

export interface AdminConfirmation {
  admin_id: string;
  admin_email: string;
  confirmed_at: string;
  ip_address?: string;
  mfa_verified: boolean;
}

export interface SystemLockdown {
  id: string;
  organization_id: string;
  emergency_action_id?: string;
  level: LockdownLevel;
  config: LockdownConfig;
  can_be_lifted_by: string[];
  lift_requires_signatures: number;
  lift_confirmations: AdminConfirmation[];
  is_active: boolean;
  activated_by: string;
  activated_at: string;
  lifted_at?: string;
  lifted_by?: string;
  created_at: string;
}

export interface LockdownConfig {
  allow_read?: boolean;
  allow_admin_access?: boolean;
  blocked_actions?: string[];
  whitelist_users?: string[];
}

export interface EncryptionKey {
  id: string;
  organization_id: string;
  key_type: 'master' | 'data' | 'session' | 'backup';
  key_name: string;
  key_id: string;
  is_air_gapped: boolean;
  air_gap_location?: string;
  backup_locations: BackupLocation[];
  rotation_frequency_days: number;
  last_rotated_at: string;
  next_rotation_at?: string;
  destroyed_at?: string;
  destroyed_by?: string;
  destruction_method?: string;
  destruction_verified_by?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BackupLocation {
  type: string;
  location: string;
  responsible?: string;
  last_verified?: string;
}

export interface EmergencyContact {
  id: string;
  organization_id: string;
  user_id?: string;
  email: string;
  phone?: string;
  name: string;
  notify_email: boolean;
  notify_sms: boolean;
  notify_push: boolean;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InitiateEmergencyActionInput {
  action_type: EmergencyActionType;
  reason: string;
  target_user_id?: string;
  target_resource_id?: string;
  target_resource_type?: string;
  requires_multi_sig?: boolean;
}

export interface LockdownStatus {
  is_locked: boolean;
  level?: LockdownLevel;
  activated_at?: string;
  config?: LockdownConfig;
}

// Types pour le système d'audit et surveillance IA

export interface AuditLog {
  id: string;
  organization_id: string;
  user_id?: string;
  session_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  target_name?: string;
  metadata: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  geo_location?: GeoLocation;
  device_info?: DeviceInfo;
  risk_score: number;
  is_suspicious: boolean;
  anomaly_reasons?: string[];
  previous_hash?: string;
  current_hash: string;
  created_at: string;
}

export interface GeoLocation {
  country?: string;
  city?: string;
  lat?: number;
  lng?: number;
}

export interface DeviceInfo {
  type?: 'desktop' | 'mobile' | 'tablet';
  os?: string;
  browser?: string;
}

export interface BehavioralProfile {
  id: string;
  user_id: string;
  organization_id: string;
  baseline_metrics: BaselineMetrics;
  recent_anomalies: Anomaly[];
  anomaly_scores: AnomalyScores;
  is_blocked: boolean;
  blocked_at?: string;
  blocked_reason?: string;
  blocked_by?: string;
  learning_period_days: number;
  last_analyzed_at?: string;
  next_analysis_at: string;
  created_at: string;
  updated_at: string;
}

export interface BaselineMetrics {
  avg_daily_actions?: number;
  avg_file_downloads_per_day?: number;
  typical_action_hours?: string[];
  common_ip_ranges?: string[];
  common_devices?: string[];
  avg_session_duration_minutes?: number;
}

export interface Anomaly {
  detected_at: string;
  type: string;
  score: number;
  details: string;
}

export interface AnomalyScores {
  volume_score: number;
  timing_score: number;
  location_score: number;
  device_score: number;
  overall_score: number;
}

export interface DLPRule {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  category?: string;
  pattern_type: 'regex' | 'keyword' | 'ml_model';
  pattern: string;
  action: 'block' | 'anonymize' | 'alert' | 'log';
  severity: 'low' | 'medium' | 'high' | 'critical';
  anonymization_config?: AnonymizationConfig;
  is_active: boolean;
  detection_count: number;
  last_detection_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AnonymizationConfig {
  method: 'mask' | 'hash' | 'redact' | 'tokenize';
  mask_char?: string;
  preserve_format?: boolean;
}

export interface DLPViolation {
  id: string;
  organization_id: string;
  rule_id: string;
  user_id: string;
  resource_id?: string;
  resource_type?: string;
  matched_content: string;
  context?: string;
  action_taken: string;
  detected_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  review_notes?: string;
}

export interface ShadowArchive {
  id: string;
  organization_id: string;
  original_resource_id: string;
  original_resource_type: string;
  original_path?: string;
  archive_data: Record<string, any>;
  archive_metadata: Record<string, any>;
  checksum: string;
  encryption_key_id?: string;
  retention_until?: string;
  deletion_requires_signatures: number;
  deletion_signatures: DeletionSignature[];
  is_deletable: boolean;
  deleted_at?: string;
  deletion_reason?: string;
  archived_at: string;
  archived_by: string;
  last_accessed_at?: string;
  access_count: number;
}

export interface DeletionSignature {
  admin_id: string;
  signed_at: string;
  reason: string;
}

export interface AuditLogFilters {
  user_id?: string;
  action?: string;
  resource_type?: string;
  is_suspicious?: boolean;
  date_from?: string;
  date_to?: string;
  min_risk_score?: number;
  limit?: number;
  offset?: number;
}

export interface CreateDLPRuleInput {
  name: string;
  description?: string;
  category?: string;
  pattern_type: 'regex' | 'keyword' | 'ml_model';
  pattern: string;
  action: 'block' | 'anonymize' | 'alert' | 'log';
  severity: 'low' | 'medium' | 'high' | 'critical';
  anonymization_config?: AnonymizationConfig;
}

export interface DLPScanResult {
  has_violations: boolean;
  violations: Array<{
    rule_id: string;
    rule_name: string;
    severity: string;
    action: string;
  }>;
}

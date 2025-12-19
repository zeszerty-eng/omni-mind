// Types pour le système Command Palette

export interface CommandHistory {
  id: string;
  organization_id: string;
  admin_id: string;
  command_raw: string;
  command_parsed?: ParsedCommand;
  execution_status: 'pending' | 'success' | 'error' | 'cancelled';
  execution_result?: Record<string, any>;
  execution_error?: string;
  execution_duration_ms?: number;
  ip_address?: string;
  user_agent?: string;
  executed_at: string;
  created_at: string;
}

export interface ParsedCommand {
  action: string;
  target?: string;
  parameters: Record<string, any>;
}

export interface CommandTemplate {
  id: string;
  organization_id?: string;
  name: string;
  description?: string;
  template: string;
  category: 'access' | 'security' | 'audit' | 'admin';
  parameters: CommandParameter[];
  required_role?: string;
  usage_count: number;
  last_used_at?: string;
  is_active: boolean;
  is_system: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CommandParameter {
  name: string;
  type: 'user_email' | 'duration' | 'role_name' | 'folder_path' | 'organization' | 'date_range' | 'enum';
  required: boolean;
  default?: string;
  description?: string;
  options?: string[]; // Pour type 'enum'
}

export interface AdminSession {
  id: string;
  organization_id: string;
  admin_id: string;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  geo_location?: Record<string, any>;
  mfa_verified: boolean;
  mfa_verified_at?: string;
  created_at: string;
  last_activity_at: string;
  expires_at: string;
  is_active: boolean;
  terminated_at?: string;
  termination_reason?: string;
}

export interface CommandSuggestion {
  id: string;
  name: string;
  template: string;
  description?: string;
  category: string;
  parameters: CommandParameter[];
}

export interface CommandSuggestionsResponse {
  suggestions: CommandSuggestion[];
  count: number;
}

export interface ExecuteCommandInput {
  command: string;
  organization_id: string;
}

// Types pour le parser de commandes
export interface CommandTokens {
  action: string;
  targets: string[];
  flags: Record<string, string>;
}

export interface CommandValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}

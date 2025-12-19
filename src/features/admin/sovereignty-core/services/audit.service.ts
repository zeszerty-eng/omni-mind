import { supabase } from '@/integrations/supabase/client';
import type {
  AuditLog,
  AuditLogFilters,
  BehavioralProfile,
  DLPRule,
  DLPViolation,
  ShadowArchive,
  CreateDLPRuleInput,
  DLPScanResult
} from '../types';

export class AuditService {
  /**
   * Récupérer les logs d'audit avec filtres
   */
  async getAuditLogs(
    organizationId: string,
    filters: AuditLogFilters = {}
  ): Promise<AuditLog[]> {
    let query = supabase
      .from('audit_logs_immutable')
      .select('*')
      .eq('organization_id', organizationId);

    if (filters.user_id) query = query.eq('user_id', filters.user_id);
    if (filters.action) query = query.eq('action', filters.action);
    if (filters.resource_type) query = query.eq('resource_type', filters.resource_type);
    if (filters.is_suspicious !== undefined) query = query.eq('is_suspicious', filters.is_suspicious);
    if (filters.min_risk_score !== undefined) query = query.gte('risk_score', filters.min_risk_score);
    if (filters.date_from) query = query.gte('created_at', filters.date_from);
    if (filters.date_to) query = query.lte('created_at', filters.date_to);

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(
        filters.offset || 0,
        (filters.offset || 0) + (filters.limit || 50) - 1
      );

    if (error) throw error;
    return data || [];
  }

  /**
   * Récupérer le profil comportemental d'un utilisateur
   */
  async getUserBehavioralProfile(
    userId: string,
    organizationId: string
  ): Promise<BehavioralProfile | null> {
    const { data, error } = await supabase
      .from('ai_behavioral_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Gérer les règles DLP (Data Leak Prevention)
   */
  async getDLPRules(organizationId: string): Promise<DLPRule[]> {
    const { data, error } = await supabase
      .from('dlp_rules')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }

  async createDLPRule(
    organizationId: string,
    input: CreateDLPRuleInput
  ): Promise<DLPRule> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('dlp_rules')
      .insert({
        organization_id: organizationId,
        ...input,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Scanner un contenu pour DLP
   */
  async scanContent(
    organizationId: string,
    content: string,
    resourceId?: string,
    resourceType?: string
  ): Promise<DLPScanResult> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('scan_content_for_dlp', {
      p_organization_id: organizationId,
      p_content: content,
      p_user_id: user.id,
      p_resource_id: resourceId,
      p_resource_type: resourceType
    });

    if (error) throw error;
    return data;
  }

  /**
   * Récupérer les violations DLP
   */
  async getDLPViolations(organizationId: string): Promise<DLPViolation[]> {
    const { data, error } = await supabase
      .from('dlp_violations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('detected_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Gérer les Shadow Archives (Archives WORM)
   */
  async getShadowArchives(organizationId: string): Promise<ShadowArchive[]> {
    const { data, error } = await supabase
      .from('shadow_archives')
      .select('*')
      .eq('organization_id', organizationId)
      .order('archived_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getShadowArchive(archiveId: string): Promise<ShadowArchive | null> {
    const { data, error } = await supabase
      .from('shadow_archives')
      .select('*')
      .eq('id', archiveId)
      .single();

    if (error) throw error;
    return data;
  }
}

export const auditService = new AuditService();

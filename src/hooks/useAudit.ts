import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type AuditAction = 'login' | 'logout' | 'view' | 'create' | 'update' | 'delete' | 'download' | 'share' | 'revoke' | 'emergency_action';

export interface AuditLog {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  action: AuditAction;
  target_type: string | null;
  target_id: string | null;
  target_name: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  risk_score: number;
  is_suspicious: boolean;
  created_at: string;
  profiles?: {
    email: string | null;
    full_name: string | null;
  };
}

export interface ActiveSession {
  id: string;
  user_id: string;
  organization_id: string | null;
  session_token: string;
  status: 'active' | 'expired' | 'revoked' | 'frozen';
  ip_address: string | null;
  user_agent: string | null;
  device_info: Record<string, unknown>;
  last_activity_at: string;
  created_at: string;
  expires_at: string;
  profiles?: {
    email: string | null;
    full_name: string | null;
  };
}

export interface SystemMetric {
  id: string;
  organization_id: string | null;
  metric_type: string;
  metric_value: number;
  metadata: Record<string, unknown>;
  recorded_at: string;
}

export const useAudit = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async (options?: {
    organizationId?: string;
    userId?: string;
    action?: AuditAction;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(options?.limit || 100);

      if (options?.organizationId) {
        query = query.eq('organization_id', options.organizationId);
      }
      if (options?.userId) {
        query = query.eq('user_id', options.userId);
      }
      if (options?.action) {
        query = query.eq('action', options.action);
      }
      if (options?.startDate) {
        query = query.gte('created_at', options.startDate.toISOString());
      }
      if (options?.endDate) {
        query = query.lte('created_at', options.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs((data as AuditLog[]) || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const logAction = useCallback(async (
    action: AuditAction,
    targetType?: string,
    targetId?: string,
    targetName?: string,
    details?: Record<string, unknown>,
    organizationId?: string
  ) => {
    if (!user) return;

    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          organization_id: organizationId,
          action,
          target_type: targetType,
          target_id: targetId,
          target_name: targetName,
          details: details || {},
          user_agent: navigator.userAgent,
        });
    } catch (error) {
      console.error('Error logging action:', error);
    }
  }, [user]);

  const getSuspiciousActivity = useCallback(async (organizationId?: string) => {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('is_suspicious', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as AuditLog[]) || [];
    } catch (error) {
      console.error('Error fetching suspicious activity:', error);
      return [];
    }
  }, []);

  return {
    logs,
    loading,
    fetchLogs,
    logAction,
    getSuspiciousActivity,
  };
};

export const useSessions = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async (organizationId?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('active_sessions')
        .select(`
          *,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .eq('status', 'active')
        .order('last_activity_at', { ascending: false });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSessions((data as ActiveSession[]) || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const revokeSession = useCallback(async (sessionId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('active_sessions')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
        })
        .eq('id', sessionId);

      if (error) throw error;
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Error revoking session:', error);
      throw error;
    }
  }, [user]);

  const revokeAllSessions = useCallback(async (organizationId?: string) => {
    if (!user) return;

    try {
      let query = supabase
        .from('active_sessions')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
        })
        .eq('status', 'active');

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { error } = await query;
      if (error) throw error;
      setSessions([]);
    } catch (error) {
      console.error('Error revoking all sessions:', error);
      throw error;
    }
  }, [user]);

  return {
    sessions,
    loading,
    fetchSessions,
    revokeSession,
    revokeAllSessions,
  };
};

export const useMetrics = () => {
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = useCallback(async (organizationId?: string, metricType?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('system_metrics')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(100);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      if (metricType) {
        query = query.eq('metric_type', metricType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMetrics((data as SystemMetric[]) || []);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const recordMetric = useCallback(async (
    metricType: string,
    metricValue: number,
    organizationId?: string,
    metadata?: Record<string, unknown>
  ) => {
    try {
      await supabase
        .from('system_metrics')
        .insert({
          organization_id: organizationId,
          metric_type: metricType,
          metric_value: metricValue,
          metadata: metadata || {},
        });
    } catch (error) {
      console.error('Error recording metric:', error);
    }
  }, []);

  return {
    metrics,
    loading,
    fetchMetrics,
    recordMetric,
  };
};

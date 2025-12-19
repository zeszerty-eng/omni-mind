import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { auditService } from '../services/audit.service';
import { emergencyService } from '../services/emergency.service';
import { commandService } from '../services/command.service';
import { rbacService } from '../services/rbac.service';
import type { 
  AuditLog, 
  AuditLogFilters, 
  BehavioralProfile,
  Anomaly,
  EmergencyAction,
  LockdownStatus,
  CommandHistory,
  CommandSuggestionsResponse,
  TemporalAccessGrant
} from '../types';

export const useSovereignty = (organizationId?: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  // --- Audit & Behavior ---
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [profiles, setProfiles] = useState<BehavioralProfile[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);

  const fetchAuditLogs = useCallback(async (filters: AuditLogFilters = {}) => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const data = await auditService.getAuditLogs(organizationId, filters);
      setLogs(data);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  const fetchBehavioralProfiles = useCallback(async () => {
    if (!organizationId) return;
    try {
      const data = await auditService.getBehavioralProfiles(organizationId);
      setProfiles(data);
    } catch (err: any) {
      setError(err);
    }
  }, [organizationId]);

  const fetchAnomalies = useCallback(async () => {
    if (!organizationId) return;
    try {
      const data = await auditService.getAnomalies(organizationId);
      setAnomalies(data);
    } catch (err: any) {
      setError(err);
    }
  }, [organizationId]);

  // --- Emergency & Lockdown ---
  const [lockdownStatus, setLockdownStatus] = useState<LockdownStatus | null>(null);
  const [pendingActions, setPendingActions] = useState<EmergencyAction[]>([]);

  const refreshLockdownStatus = useCallback(async () => {
    if (!organizationId) return;
    try {
      const status = await emergencyService.getLockdownStatus(organizationId);
      setLockdownStatus(status);
    } catch (err: any) {
      setError(err);
    }
  }, [organizationId]);

  // --- Commands & History ---
  const [commandHistory, setCommandHistory] = useState<CommandHistory[]>([]);

  const fetchCommandHistory = useCallback(async (limit?: number) => {
    if (!organizationId) return;
    try {
      const data = await commandService.getCommandHistory(organizationId, limit);
      setCommandHistory(data);
    } catch (err: any) {
      setError(err);
    }
  }, [organizationId]);

  const executeCommand = useCallback(async (command: string) => {
    if (!organizationId) return;
    try {
      return await commandService.executeCommand(organizationId, command);
    } catch (err: any) {
      setError(err);
      throw err;
    }
  }, [organizationId]);

  const getCommandSuggestions = useCallback(async (partial: string) => {
    if (!organizationId) return { suggestions: [], count: 0 };
    return await commandService.getSuggestions(organizationId, partial);
  }, [organizationId]);

  // --- RBAC & Ghost Mode ---
  const [activeGrants, setActiveGrants] = useState<TemporalAccessGrant[]>([]);
  const isElevated = activeGrants.length > 0;

  const refreshActiveGrants = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !organizationId) return;
    try {
      const grants = await rbacService.getTemporalGrants(user.id, organizationId);
      setActiveGrants(grants);
    } catch (err: any) {
      setError(err);
    }
  }, [organizationId]);

  // Initial load and Real-time subscription
  useEffect(() => {
    if (!organizationId) return;

    // Initial load
    fetchAuditLogs();
    refreshLockdownStatus();
    fetchCommandHistory(15);
    fetchBehavioralProfiles();
    fetchAnomalies();
    refreshActiveGrants();

    // Subscribe to Audit Logs
    const auditChannel = supabase
      .channel('sovereignty-audit')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs_immutable',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          setLogs(prev => [payload.new as AuditLog, ...prev].slice(0, 100));
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('connected');
        if (status === 'CHANNEL_ERROR') setRealtimeStatus('error');
      });

    // Subscribe to Lockdown Status
    const lockdownChannel = supabase
      .channel('sovereignty-lockdown')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_lockdowns',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          refreshLockdownStatus();
        }
      )
      .subscribe();

    // Subscribe to Temporal Grants (Ghost Mode)
    const grantsChannel = supabase
      .channel('sovereignty-grants')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'temporal_access_grants',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          refreshActiveGrants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(auditChannel);
      supabase.removeChannel(lockdownChannel);
      supabase.removeChannel(grantsChannel);
    };
  }, [organizationId, fetchAuditLogs, refreshLockdownStatus, fetchCommandHistory, fetchBehavioralProfiles, refreshActiveGrants]);

  return {
    loading,
    error,
    realtimeStatus,
    logs,
    profiles,
    anomalies,
    lockdownStatus,
    pendingActions,
    commandHistory,
    activeGrants,
    isElevated,
    fetchAuditLogs,
    fetchBehavioralProfiles,
    fetchAnomalies,
    refreshLockdownStatus,
    fetchCommandHistory,
    executeCommand,
    getCommandSuggestions,
    refreshActiveGrants
  };
};

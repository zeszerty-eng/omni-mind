import { useState, useCallback, useEffect } from 'react';
import { auditService } from '../services/audit.service';
import { emergencyService } from '../services/emergency.service';
import { commandService } from '../services/command.service';
import { rbacService } from '../services/rbac.service';
import type { 
  AuditLog, 
  AuditLogFilters, 
  BehavioralProfile,
  EmergencyAction,
  LockdownStatus,
  CommandHistory,
  CommandSuggestionsResponse
} from '../types';

export const useSovereignty = (organizationId?: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // --- Audit & Behavior ---
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [profiles, setProfiles] = useState<BehavioralProfile[]>([]);

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

  // Initial load
  useEffect(() => {
    if (organizationId) {
      fetchAuditLogs();
      refreshLockdownStatus();
      fetchCommandHistory(10);
    }
  }, [organizationId, fetchAuditLogs, refreshLockdownStatus, fetchCommandHistory]);

  return {
    loading,
    error,
    logs,
    profiles,
    lockdownStatus,
    pendingActions,
    commandHistory,
    fetchAuditLogs,
    fetchBehavioralProfiles,
    refreshLockdownStatus,
    fetchCommandHistory,
    executeCommand,
    getCommandSuggestions
  };
};

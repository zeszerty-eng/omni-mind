import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export type EmergencyActionType = 'freeze_all' | 'revoke_all_sessions' | 'lockdown' | 'destroy_keys';

export interface EmergencyAction {
  id: string;
  organization_id: string | null;
  action_type: string;
  initiated_by: string;
  confirmed_by: string | null;
  requires_confirmation: boolean;
  is_confirmed: boolean;
  executed_at: string | null;
  rollback_at: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export const useEmergencyActions = () => {
  const { user } = useAuth();
  const [pendingActions, setPendingActions] = useState<EmergencyAction[]>([]);
  const [executing, setExecuting] = useState(false);

  const initiateEmergencyAction = useCallback(async (
    actionType: EmergencyActionType,
    organizationId?: string,
    requiresConfirmation = true
  ) => {
    if (!user) return null;

    setExecuting(true);
    try {
      const { data, error } = await supabase
        .from('emergency_actions')
        .insert({
          organization_id: organizationId,
          action_type: actionType,
          initiated_by: user.id,
          requires_confirmation: requiresConfirmation,
          is_confirmed: !requiresConfirmation,
          executed_at: !requiresConfirmation ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;

      const action = data as EmergencyAction;

      // If no confirmation required, execute immediately
      if (!requiresConfirmation) {
        await executeAction(action);
      } else {
        setPendingActions(prev => [...prev, action]);
        toast({
          title: 'Action en attente',
          description: 'Confirmation requise par un autre administrateur',
        });
      }

      return action;
    } catch (error) {
      console.error('Error initiating emergency action:', error);
      throw error;
    } finally {
      setExecuting(false);
    }
  }, [user]);

  const confirmEmergencyAction = useCallback(async (actionId: string) => {
    if (!user) return;

    setExecuting(true);
    try {
      const { data, error } = await supabase
        .from('emergency_actions')
        .update({
          confirmed_by: user.id,
          is_confirmed: true,
          executed_at: new Date().toISOString(),
        })
        .eq('id', actionId)
        .select()
        .single();

      if (error) throw error;

      const action = data as EmergencyAction;
      await executeAction(action);

      setPendingActions(prev => prev.filter(a => a.id !== actionId));

      toast({
        title: 'Action exécutée',
        description: `${action.action_type} a été exécuté avec succès`,
      });
    } catch (error) {
      console.error('Error confirming emergency action:', error);
      throw error;
    } finally {
      setExecuting(false);
    }
  }, [user]);

  const executeAction = async (action: EmergencyAction) => {
    switch (action.action_type) {
      case 'freeze_all':
        if (action.organization_id) {
          await supabase
            .from('organizations')
            .update({ is_frozen: true, frozen_at: new Date().toISOString() })
            .eq('id', action.organization_id);
        }
        break;

      case 'revoke_all_sessions': {
        let query = supabase
          .from('active_sessions')
          .update({ status: 'revoked', revoked_at: new Date().toISOString() })
          .eq('status', 'active');
        
        if (action.organization_id) {
          query = query.eq('organization_id', action.organization_id);
        }
        await query;
        break;
      }

      case 'lockdown':
        // Freeze org + revoke sessions
        if (action.organization_id) {
          await supabase
            .from('organizations')
            .update({ is_frozen: true, frozen_at: new Date().toISOString() })
            .eq('id', action.organization_id);
        }
        await supabase
          .from('active_sessions')
          .update({ status: 'frozen', revoked_at: new Date().toISOString() })
          .eq('status', 'active');
        break;

      default:
        console.warn('Unknown emergency action type:', action.action_type);
    }

    // Log the action
    await supabase
      .from('audit_logs')
      .insert({
        user_id: action.initiated_by,
        organization_id: action.organization_id,
        action: 'emergency_action',
        target_type: 'system',
        details: { action_type: action.action_type, confirmed_by: action.confirmed_by },
      });
  };

  const fetchPendingActions = useCallback(async (organizationId?: string) => {
    try {
      let query = supabase
        .from('emergency_actions')
        .select('*')
        .eq('requires_confirmation', true)
        .eq('is_confirmed', false)
        .order('created_at', { ascending: false });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPendingActions((data as EmergencyAction[]) || []);
    } catch (error) {
      console.error('Error fetching pending actions:', error);
    }
  }, []);

  return {
    pendingActions,
    executing,
    initiateEmergencyAction,
    confirmEmergencyAction,
    fetchPendingActions,
  };
};

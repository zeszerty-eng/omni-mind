import { supabase } from '@/integrations/supabase/client';
import type {
  EmergencyAction,
  InitiateEmergencyActionInput,
  SystemLockdown,
  LockdownStatus,
  EmergencyContact
} from '../types';

export class EmergencyService {
  /**
   * Initialiser une action d'urgence (nécessite potentiellement multi-sig)
   */
  async initiateEmergencyAction(
    organizationId: string,
    input: InitiateEmergencyActionInput
  ): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('initiate_emergency_action', {
      p_organization_id: organizationId,
      p_action_type: input.action_type,
      p_reason: input.reason,
      p_initiated_by: user.id,
      p_requires_multi_sig: input.requires_multi_sig ?? true
    });

    if (error) throw error;
    return data;
  }

  /**
   * Confirmer (signer) une action d'urgence
   */
  async confirmEmergencyAction(
    actionId: string
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('confirm_emergency_action', {
      p_action_id: actionId,
      p_admin_id: user.id
    });

    if (error) throw error;
    return data;
  }

  /**
   * Récupérer les actions d'urgence en cours
   */
  async getActiveEmergencyActions(organizationId: string): Promise<EmergencyAction[]> {
    const { data, error } = await supabase
      .from('emergency_actions')
      .select('*')
      .eq('organization_id', organizationId)
      .in('status', ['pending', 'confirmed', 'executing'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Vérifier si le système est en lockdown
   */
  async getLockdownStatus(organizationId: string): Promise<LockdownStatus> {
    const { data, error } = await supabase.rpc('is_organization_locked_down', {
      p_organization_id: organizationId
    });

    if (error) throw error;
    return data;
  }

  /**
   * Gérer les contacts d'urgence
   */
  async getEmergencyContacts(organizationId: string): Promise<EmergencyContact[]> {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async addEmergencyContact(
    organizationId: string,
    contact: Partial<EmergencyContact>
  ): Promise<EmergencyContact> {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .insert({
        organization_id: organizationId,
        ...contact
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const emergencyService = new EmergencyService();

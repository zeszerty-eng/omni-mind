import { supabase } from '@/integrations/supabase/client';
import type {
  CommandHistory,
  CommandTemplate,
  AdminSession,
  CommandSuggestionsResponse,
  ExecuteCommandInput
} from '../types';

export class CommandService {
  /**
   * Exécuter une commande admin
   */
  async executeCommand(
    organizationId: string,
    command: string
  ): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('execute_admin_command', {
      p_admin_id: user.id,
      p_organization_id: organizationId,
      p_command: command
    });

    if (error) throw error;
    return data;
  }

  /**
   * Récupérer des suggestions de commandes
   */
  async getSuggestions(
    organizationId: string,
    partialCommand: string = ''
  ): Promise<CommandSuggestionsResponse> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('get_command_suggestions', {
      p_organization_id: organizationId,
      p_admin_id: user.id,
      p_partial_command: partialCommand
    });

    if (error) throw error;
    return data;
  }

  /**
   * Récupérer l'historique des commandes
   */
  async getCommandHistory(
    organizationId: string,
    limit: number = 50
  ): Promise<CommandHistory[]> {
    const { data, error } = await supabase
      .from('admin_command_history')
      .select('*')
      .eq('organization_id', organizationId)
      .order('executed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Gérer les templates de commandes
   */
  async getCommandTemplates(organizationId: string): Promise<CommandTemplate[]> {
    const { data, error } = await supabase
      .from('command_templates')
      .select('*')
      .or(`organization_id.eq.${organizationId},organization_id.is.null`)
      .eq('is_active', true)
      .order('usage_count', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Gérer les sessions d'administration
   */
  async getAdminSessions(organizationId: string): Promise<AdminSession[]> {
    const { data, error } = await supabase
      .from('admin_sessions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('last_activity_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async closeAdminSession(sessionId: string, reason: string = 'closed_by_user'): Promise<void> {
    const { error } = await supabase
      .from('admin_sessions')
      .update({
        is_active: false,
        terminated_at: new Date().toISOString(),
        termination_reason: reason
      })
      .eq('id', sessionId);

    if (error) throw error;
  }
}

export const commandService = new CommandService();

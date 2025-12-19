// Service pour gérer les organisations (multi-tenant)

import { supabase } from '@/integrations/supabase/client';
import type {
  Organization,
  OrganizationMember,
  OrganizationInvitation,
  CreateOrganizationInput,
  InviteMemberInput,
  OrganizationRole
} from '../types';

export class OrganizationService {
  /**
   * Récupérer toutes les organisations dont l'utilisateur est membre
   */
  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        organizations (*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;

    return data?.map(item => item.organizations as unknown as Organization) || [];
  }

  /**
   * Récupérer une organisation par son ID
   */
  async getOrganization(organizationId: string): Promise<Organization | null> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Créer une nouvelle organisation
   */
  async createOrganization(input: CreateOrganizationInput): Promise<Organization> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('organizations')
      .insert({
        ...input,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;

    // Ajouter l'utilisateur comme owner
    await this.addMember({
      organization_id: data.id,
      user_id: user.id,
      role: 'owner'
    });

    return data;
  }

  /**
   * Mettre à jour une organisation
   */
  async updateOrganization(
    organizationId: string,
    updates: Partial<Organization>
  ): Promise<Organization> {
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', organizationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Récupérer les membres d'une organisation
   */
  async getMembers(organizationId: string): Promise<OrganizationMember[]> {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        profiles:user_id (email, full_name)
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Ajouter un membre à une organisation
   */
  private async addMember(params: {
    organization_id: string;
    user_id: string;
    role: OrganizationRole;
  }): Promise<OrganizationMember> {
    const { data, error } = await supabase
      .from('organization_members')
      .insert({
        ...params,
        joined_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Inviter un membre
   */
  async inviteMember(input: InviteMemberInput): Promise<OrganizationInvitation> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('organization_invitations')
      .insert({
        ...input,
        invited_by: user.id
      })
      .select()
      .single();

    if (error) throw error;

    // TODO: Envoyer email d'invitation

    return data;
  }

  /**
   * Mettre à jour le rôle d'un membre
   */
  async updateMemberRole(
    memberId: string,
    role: OrganizationRole
  ): Promise<OrganizationMember> {
    const { data, error } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('id', memberId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Retirer un membre (soft delete)
   */
  async removeMember(memberId: string): Promise<void> {
    const { error } = await supabase
      .from('organization_members')
      .update({ is_active: false })
      .eq('id', memberId);

    if (error) throw error;
  }

  /**
   * Vérifier si l'utilisateur est admin d'une organisation
   */
  async isOrganizationAdmin(
    userId: string,
    organizationId: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('is_organization_admin', {
        p_user_id: userId,
        p_organization_id: organizationId
      });

    if (error) throw error;
    return data || false;
  }

  /**
   * Obtenir l'organisation actuelle de l'utilisateur
   */
  async getCurrentOrganization(userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .rpc('get_user_current_organization', {
        p_user_id: userId
      });

    if (error) throw error;
    return data;
  }
}

export const organizationService = new OrganizationService();

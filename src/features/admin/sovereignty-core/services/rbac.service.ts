// Service pour le système RBAC granulaire

import { supabase } from '@/integrations/supabase/client';
import type {
  AccessPolicy,
  TemporalAccessGrant,
  InvisibleResource,
  CreatePolicyInput,
  CreateTemporalGrantInput,
  AccessCheckResult,
  AccessContext,
  AccessAction
} from '../types';

export class RBACService {
  /**
   * Vérifier l'accès contextuel d'un utilisateur à une ressource
   */
  async checkAccess(
    userId: string,
    organizationId: string,
    resourceId: string,
    resourceType: string,
    action: AccessAction,
    context?: AccessContext
  ): Promise<AccessCheckResult> {
    const { data, error } = await supabase.rpc('check_contextual_access', {
      p_user_id: userId,
      p_organization_id: organizationId,
      p_resource_id: resourceId,
      p_resource_type: resourceType,
      p_action: action,
      p_context: context || {}
    });

    if (error) throw error;
    return data;
  }

  /**
   * Créer une nouvelle policy d'accès
   */
  async createPolicy(
    organizationId: string,
    input: CreatePolicyInput
  ): Promise<AccessPolicy> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('access_policies')
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
   * Récupérer toutes les policies d'une organisation
   */
  async getPolicies(organizationId: string): Promise<AccessPolicy[]> {
    const { data, error } = await supabase
      .from('access_policies')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Mettre à jour une policy
   */
  async updatePolicy(
    policyId: string,
    updates: Partial<AccessPolicy>
  ): Promise<AccessPolicy> {
    const { data, error } = await supabase
      .from('access_policies')
      .update(updates)
      .eq('id', policyId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Désactiver une policy
   */
  async deactivatePolicy(policyId: string): Promise<void> {
    await this.updatePolicy(policyId, { is_active: false });
  }

  /**
   * Créer un accès temporaire (Ghost Mode)
   */
  async createTemporalGrant(
    organizationId: string,
    input: CreateTemporalGrantInput
  ): Promise<TemporalAccessGrant> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('temporal_access_grants')
      .insert({
        organization_id: organizationId,
        ...input,
        granted_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Récupérer les accès temporaires d'un utilisateur
   */
  async getTemporalGrants(
    userId: string,
    organizationId?: string
  ): Promise<TemporalAccessGrant[]> {
    let query = supabase
      .from('temporal_access_grants')
      .select('*')
      .eq('user_id', userId)
      .is('revoked_at', null);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Révoquer un accès temporaire
   */
  async revokeTemporalGrant(grantId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('temporal_access_grants')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: user.id
      })
      .eq('id', grantId);

    if (error) throw error;
  }

  /**
   * Nettoyer les accès temporaires expirés
   */
  async cleanupExpiredGrants(): Promise<number> {
    const { data, error } = await supabase.rpc('cleanup_expired_temporal_grants');

    if (error) throw error;
    return data || 0;
  }

  /**
   * Configurer la visibilité d'une ressource
   */
  async setResourceVisibility(
    organizationId: string,
    resourceId: string,
    resourceType: string,
    config: Partial<InvisibleResource>
  ): Promise<InvisibleResource> {
    const { data, error } = await supabase
      .from('invisible_resources')
      .upsert({
        organization_id: organizationId,
        resource_id: resourceId,
        resource_type: resourceType,
        ...config
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Obtenir la configuration de visibilité d'une ressource
   */
  async getResourceVisibility(
    resourceId: string,
    resourceType: string
  ): Promise<InvisibleResource | null> {
    const { data, error } = await supabase
      .from('invisible_resources')
      .select('*')
      .eq('resource_id', resourceId)
      .eq('resource_type', resourceType)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignore not found
    return data;
  }

  /**
   * Révéler une ressource invisible à un utilisateur
   */
  async revealResource(
    resourceId: string,
    resourceType: string,
    userId: string,
    mfaVerified: boolean = false
  ): Promise<InvisibleResource> {
    const visibility = await this.getResourceVisibility(resourceId, resourceType);
    if (!visibility) {
      throw new Error('Resource visibility configuration not found');
    }

    const revealedTo = [
      ...visibility.revealed_to,
      {
        user_id: userId,
        revealed_at: new Date().toISOString(),
        mfa_verified: mfaVerified
      }
    ];

    const { data, error } = await supabase
      .from('invisible_resources')
      .update({ revealed_to: revealedTo })
      .eq('id', visibility.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const rbacService = new RBACService();

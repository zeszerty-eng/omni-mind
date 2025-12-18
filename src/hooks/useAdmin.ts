import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'super_admin' | 'admin' | 'manager' | 'user' | 'guest' | 'auditor';
export type PermissionType = 'read' | 'write' | 'delete' | 'admin' | 'audit' | 'export';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  settings: Record<string, unknown>;
  is_frozen: boolean;
  frozen_at: string | null;
  frozen_by: string | null;
  created_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: AppRole;
  joined_at: string;
  is_active: boolean;
  profiles?: {
    email: string | null;
    full_name: string | null;
  };
}

export const useAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if current user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (error) throw error;

        const roles = (data as UserRole[]) || [];
        setUserRoles(roles);
        setIsAdmin(roles.some(r => ['admin', 'super_admin'].includes(r.role)));
        setIsSuperAdmin(roles.some(r => r.role === 'super_admin'));
      } catch (error) {
        console.error('Error checking admin status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Grant role to user
  const grantRole = useCallback(async (targetUserId: string, role: AppRole, expiresAt?: Date) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({
          user_id: targetUserId,
          role,
          granted_by: user.id,
          expires_at: expiresAt?.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as UserRole;
    } catch (error) {
      console.error('Error granting role:', error);
      throw error;
    }
  }, [user]);

  // Revoke role
  const revokeRole = useCallback(async (roleId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_active: false })
        .eq('id', roleId);

      if (error) throw error;
    } catch (error) {
      console.error('Error revoking role:', error);
      throw error;
    }
  }, []);

  return {
    isAdmin,
    isSuperAdmin,
    userRoles,
    loading,
    grantRole,
    revokeRole,
  };
};

export const useOrganizations = () => {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOrganizations = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (error) throw error;
      setOrganizations((data as Organization[]) || []);
      if (data && data.length > 0 && !currentOrg) {
        setCurrentOrg(data[0] as Organization);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentOrg]);

  const fetchMembers = useCallback(async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          *,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .eq('organization_id', orgId)
        .eq('is_active', true);

      if (error) throw error;
      setMembers((data as OrganizationMember[]) || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  }, []);

  const createOrganization = useCallback(async (name: string, slug: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('organizations')
        .insert({ name, slug })
        .select()
        .single();

      if (error) throw error;

      const org = data as Organization;

      // Add creator as super_admin
      await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'super_admin',
          invited_by: user.id,
        });

      setOrganizations(prev => [...prev, org]);
      return org;
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  }, [user]);

  const freezeOrganization = useCallback(async (orgId: string, freeze: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          is_frozen: freeze,
          frozen_at: freeze ? new Date().toISOString() : null,
          frozen_by: freeze ? user.id : null,
        })
        .eq('id', orgId);

      if (error) throw error;

      setOrganizations(prev =>
        prev.map(o => o.id === orgId ? { ...o, is_frozen: freeze } : o)
      );
    } catch (error) {
      console.error('Error freezing organization:', error);
      throw error;
    }
  }, [user]);

  return {
    organizations,
    currentOrg,
    setCurrentOrg,
    members,
    loading,
    fetchOrganizations,
    fetchMembers,
    createOrganization,
    freezeOrganization,
  };
};

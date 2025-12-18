import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Shield, UserPlus, UserMinus, Search, 
  MoreVertical, Mail, Clock, CheckCircle, XCircle,
  Crown, Star, User, Eye
} from 'lucide-react';
import { useOrganizations, AppRole } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase';
import { toast } from '@/hooks/use-toast';

interface UserManagementProps {
  organizationId?: string;
}

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  roles: AppRole[];
  is_active: boolean;
}

const roleConfig: Record<AppRole, { label: string; color: string; icon: typeof Crown }> = {
  super_admin: { label: 'Super Admin', color: 'bg-red-500', icon: Crown },
  admin: { label: 'Admin', color: 'bg-orange-500', icon: Shield },
  manager: { label: 'Manager', color: 'bg-blue-500', icon: Star },
  user: { label: 'Utilisateur', color: 'bg-green-500', icon: User },
  guest: { label: 'Invité', color: 'bg-gray-500', icon: Eye },
  auditor: { label: 'Auditeur', color: 'bg-purple-500', icon: Eye },
};

export const UserManagement = ({ organizationId }: UserManagementProps) => {
  const { members, fetchMembers } = useOrganizations();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [loading, setLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole>('user');

  useEffect(() => {
    fetchUsers();
  }, [organizationId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('is_active', true);

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRoles[] = (profiles || []).map((profile: any) => ({
        id: profile.id,
        email: profile.email || '',
        full_name: profile.full_name,
        created_at: profile.created_at,
        roles: (roles || [])
          .filter((r: any) => r.user_id === profile.id)
          .map((r: any) => r.role as AppRole),
        is_active: true,
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantRole = async (userId: string, role: AppRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (error) throw error;

      toast({
        title: 'Rôle attribué',
        description: `Le rôle ${roleConfig[role].label} a été attribué`,
      });

      fetchUsers();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'attribuer le rôle',
        variant: 'destructive',
      });
    }
  };

  const handleRevokeRole = async (userId: string, role: AppRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      toast({
        title: 'Rôle révoqué',
        description: `Le rôle ${roleConfig[role].label} a été révoqué`,
      });

      fetchUsers();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de révoquer le rôle',
        variant: 'destructive',
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Gestion des Utilisateurs
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length} utilisateur{users.length > 1 ? 's' : ''} enregistré{users.length > 1 ? 's' : ''}
          </p>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2 rounded-xl bg-gradient-omni text-primary-foreground font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <UserPlus className="w-5 h-5" />
          Inviter
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un utilisateur..."
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
        />
      </div>

      {/* Role Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(roleConfig).map(([role, config]) => (
          <div key={role} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary/50">
            <span className={`w-2 h-2 rounded-full ${config.color}`} />
            <span className="text-xs text-muted-foreground">{config.label}</span>
          </div>
        ))}
      </div>

      {/* Users List */}
      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-muted-foreground border-b border-border bg-secondary/30">
              <th className="px-4 py-3 font-medium">Utilisateur</th>
              <th className="px-4 py-3 font-medium">Rôles</th>
              <th className="px-4 py-3 font-medium">Inscription</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium w-12"></th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <motion.tr
                key={user.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-b border-border/50 hover:bg-secondary/20 transition-colors"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-omni flex items-center justify-center">
                      <span className="text-primary-foreground font-semibold">
                        {user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{user.full_name || 'Sans nom'}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1">
                    {user.roles.length > 0 ? (
                      user.roles.map((role) => {
                        const config = roleConfig[role];
                        return (
                          <span
                            key={role}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${config.color} text-white`}
                          >
                            <config.icon className="w-3 h-3" />
                            {config.label}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-xs text-muted-foreground">Aucun rôle</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {new Date(user.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                    user.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {user.is_active ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        Actif
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" />
                        Inactif
                      </>
                    )}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <MoreVertical className="w-5 h-5 text-muted-foreground" />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-elevated rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-omni flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary-foreground">
                    {selectedUser.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{selectedUser.full_name || 'Sans nom'}</h3>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Rôles actuels</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.roles.map((role) => {
                      const config = roleConfig[role];
                      return (
                        <span
                          key={role}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.color} text-white`}
                        >
                          <config.icon className="w-4 h-4" />
                          {config.label}
                          <button
                            onClick={() => handleRevokeRole(selectedUser.id, role)}
                            className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Ajouter un rôle</h4>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(roleConfig) as AppRole[])
                      .filter((role) => !selectedUser.roles.includes(role))
                      .map((role) => {
                        const config = roleConfig[role];
                        return (
                          <button
                            key={role}
                            onClick={() => handleGrantRole(selectedUser.id, role)}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.color}/20 text-foreground hover:${config.color}/40 transition-colors`}
                          >
                            <config.icon className="w-4 h-4" />
                            {config.label}
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="w-full mt-6 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium transition-colors"
              >
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-elevated rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-primary" />
                Inviter un utilisateur
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Email</label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@exemple.com"
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground">Rôle</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {(Object.entries(roleConfig) as [AppRole, typeof roleConfig[AppRole]][]).map(([role, config]) => (
                      <button
                        key={role}
                        onClick={() => setInviteRole(role)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                          inviteRole === role
                            ? `${config.color} text-white border-transparent`
                            : 'bg-secondary border-border hover:border-primary'
                        }`}
                      >
                        <config.icon className="w-4 h-4" />
                        <span className="text-sm">{config.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium"
                >
                  Annuler
                </button>
                <button
                  disabled={!inviteEmail}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-omni text-primary-foreground font-medium disabled:opacity-50"
                >
                  Envoyer l'invitation
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

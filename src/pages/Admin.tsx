import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Users, Shield, Terminal, Settings,
  AlertTriangle, Activity, Sparkles, Brain, FileSearch,
  Lock, Key
} from 'lucide-react';
import { BackgroundEffects } from '@/components/BackgroundEffects';
import { PulseDashboard } from '@/components/admin/PulseDashboard';
import { KillSwitchPanel } from '@/components/admin/KillSwitchPanel';
import { UserManagement } from '@/components/admin/UserManagement';
import { AuditExplorer } from '@/features/admin/sovereignty-core/components/AuditExplorer';
import { CommandConsole } from '@/features/admin/sovereignty-core/components/CommandConsole';
import { BehavioralIntelligence } from '@/features/admin/sovereignty-core/components/BehavioralIntelligence';
import { AccessPolicyManager } from '@/features/admin/sovereignty-core/components/AccessPolicyManager';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';

type AdminTab = 'pulse' | 'users' | 'logs' | 'ia' | 'console' | 'rbac' | 'security' | 'settings';

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, loading } = useAdmin();
  const [activeTab, setActiveTab] = useState<AdminTab>('pulse');

  // Hardcoded for local-dev alignment
  const organizationId = 'default-org';

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-primary animate-pulse mx-auto" />
          <p className="text-muted-foreground mt-4">Vérification des accès...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'pulse' as AdminTab, label: 'Pulse', icon: Activity },
    { id: 'users' as AdminTab, label: 'Utilisateurs', icon: Users },
    { id: 'logs' as AdminTab, label: 'Audit', icon: FileSearch },
    { id: 'ia' as AdminTab, label: 'Intelligence', icon: Brain },
    { id: 'console' as AdminTab, label: 'Console', icon: Terminal },
    { id: 'rbac' as AdminTab, label: 'Politiques', icon: Lock },
    { id: 'security' as AdminTab, label: 'Sécurité', icon: AlertTriangle },
    { id: 'settings' as AdminTab, label: 'Système', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background relative selection:bg-primary/30">
      <BackgroundEffects />
      
      <div className="relative z-10 flex">
        {/* Sidebar */}
        <motion.aside
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-64 min-h-screen glass border-r border-border p-4 flex flex-col sticky top-0"
        >
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-omni flex items-center justify-center shadow-lg shadow-primary/20">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-sm tracking-tight">OMNI CORE</h1>
              <p className="text-[10px] text-primary uppercase font-bold tracking-widest">Souveraineté</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
                <span className="font-medium text-sm">{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="pt-4 border-t border-border mt-4">
             <div className="px-4 py-3 mb-4 rounded-xl bg-secondary/30 border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase mb-1">Session</p>
                <p className="text-xs font-mono text-primary truncate">{user?.id}</p>
             </div>
            <button
              onClick={() => navigate('/')}
              className="w-full px-4 py-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all text-sm flex items-center justify-center gap-2"
            >
              ← Quitter le Noyau
            </button>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-foreground tracking-tight">
                  {tabs.find(t => t.id === activeTab)?.label}
                </h2>
                <div className="h-1 w-12 bg-primary mt-2 rounded-full" />
              </div>

              {activeTab === 'pulse' && <PulseDashboard organizationId={organizationId} />}
              {activeTab === 'users' && <UserManagement organizationId={organizationId} />}
              {activeTab === 'logs' && <AuditExplorer organizationId={organizationId} />}
              {activeTab === 'ia' && <BehavioralIntelligence organizationId={organizationId} />}
              {activeTab === 'console' && <CommandConsole organizationId={organizationId} />}
              {activeTab === 'rbac' && <AccessPolicyManager organizationId={organizationId} />}
              {activeTab === 'security' && <KillSwitchPanel organizationId={organizationId} />}
              {activeTab === 'settings' && (
                <div className="glass rounded-2xl p-12 text-center border-dashed border-2 border-border">
                  <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <h3 className="text-xl font-semibold text-foreground">Configuration Système</h3>
                  <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                    Le moteur de configuration sera disponible après la validation du multi-sig global.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Admin;

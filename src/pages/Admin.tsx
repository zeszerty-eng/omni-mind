import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, Users, Shield, Terminal, Settings,
  AlertTriangle, Activity, Sparkles
} from 'lucide-react';
import { BackgroundEffects } from '@/components/BackgroundEffects';
import { PulseDashboard } from '@/components/admin/PulseDashboard';
import { KillSwitchPanel } from '@/components/admin/KillSwitchPanel';
import { UserManagement } from '@/components/admin/UserManagement';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';

type AdminTab = 'pulse' | 'users' | 'security' | 'settings';

const Admin = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, isSuperAdmin, loading } = useAdmin();
  const [activeTab, setActiveTab] = useState<AdminTab>('pulse');

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
    { id: 'security' as AdminTab, label: 'Sécurité', icon: AlertTriangle },
    { id: 'settings' as AdminTab, label: 'Paramètres', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      <BackgroundEffects />
      
      <div className="relative z-10 flex">
        {/* Sidebar */}
        <motion.aside
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-64 min-h-screen glass border-r border-border p-4 flex flex-col"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-omni flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">OMNI Admin</h1>
              <p className="text-xs text-muted-foreground">Noyau de Souveraineté</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="pt-4 border-t border-border">
            <button
              onClick={() => navigate('/')}
              className="w-full px-4 py-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              ← Retour à OMNI
            </button>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 p-8 max-w-6xl">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {activeTab === 'pulse' && <PulseDashboard />}
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'security' && <KillSwitchPanel />}
            {activeTab === 'settings' && (
              <div className="glass rounded-xl p-8 text-center">
                <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground">Paramètres</h3>
                <p className="text-muted-foreground mt-2">Configuration système avancée</p>
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Admin;

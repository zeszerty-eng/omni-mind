import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Users, Shield, Terminal, Settings,
  AlertTriangle, Activity, Sparkles, Brain, FileSearch,
  Lock, Key, LogOut, RefreshCw, Bell, Search, 
  ChevronRight, ArrowLeft, MoreHorizontal, User as UserIcon,
  ShieldAlert, Archive
} from 'lucide-react';
import { BackgroundEffects } from '@/components/BackgroundEffects';
import { PulseDashboard } from '@/components/admin/PulseDashboard';
import { KillSwitchPanel } from '@/components/admin/KillSwitchPanel';
import { UserManagement } from '@/components/admin/UserManagement';
import { AuditExplorer } from '@/features/admin/sovereignty-core/components/AuditExplorer';
import { CommandConsole } from '@/features/admin/sovereignty-core/components/CommandConsole';
import { BehavioralIntelligence } from '@/features/admin/sovereignty-core/components/BehavioralIntelligence';
import { AccessPolicyManager } from '@/features/admin/sovereignty-core/components/AccessPolicyManager';
import { DLPManager } from '@/features/admin/sovereignty-core/components/DLPManager';
import { KeyManagement } from '@/features/admin/sovereignty-core/components/KeyManagement';
import { ShadowArchiveManager } from '@/features/admin/sovereignty-core/components/ShadowArchiveManager';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

import { ElevationStatusBar } from '@/features/admin/sovereignty-core/components/ElevationStatusBar';
import { useSovereignty } from '@/features/admin/sovereignty-core/hooks/useSovereignty';

type AdminTab = 'pulse' | 'users' | 'logs' | 'ia' | 'console' | 'rbac' | 'security' | 'settings' | 'dlp' | 'keys' | 'archive';

const Admin = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, isSuperAdmin, loading: adminLoading } = useAdmin();
  
  // Centralized Sovereignty State
  const organizationId = 'default-org'; // Hardcoded for local alignment
  const sovereignty = useSovereignty(organizationId);

  const [activeTab, setActiveTab] = useState<AdminTab>('pulse');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await sovereignty.fetchAuditLogs();
    await sovereignty.refreshLockdownStatus();
    await sovereignty.refreshActiveGrants();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-primary animate-pulse mx-auto" />
          <p className="text-muted-foreground mt-4">Vérification des accès...</p>
        </div>
      </div>
    );
  }

  const sections = [
    {
      title: 'Surveillance',
      tabs: [
        { id: 'pulse' as AdminTab, label: 'Pulse', icon: Activity },
        { id: 'logs' as AdminTab, label: 'Audit', icon: FileSearch },
        { id: 'ia' as AdminTab, label: 'Intelligence', icon: Brain },
      ]
    },
    {
      title: 'Contrôle',
      tabs: [
        { id: 'users' as AdminTab, label: 'Utilisateurs', icon: Users },
        { id: 'rbac' as AdminTab, label: 'Politiques', icon: Lock },
        { id: 'console' as AdminTab, label: 'Console', icon: Terminal },
      ]
    },
    {
      title: 'Protection',
      tabs: [
        { id: 'security' as AdminTab, label: 'Urgence', icon: AlertTriangle },
        { id: 'archive' as AdminTab, label: 'Archives WORM', icon: Archive },
        { id: 'dlp' as AdminTab, label: 'DLP (Fuites)', icon: ShieldAlert },
        { id: 'keys' as AdminTab, label: 'Clés KMS', icon: Key },
        { id: 'settings' as AdminTab, label: 'Système', icon: Settings },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background relative selection:bg-primary/30 flex overflow-hidden">
      <BackgroundEffects />

      <ElevationStatusBar 
        activeGrants={sovereignty.activeGrants}
        lockdownStatus={sovereignty.lockdownStatus}
        onRefresh={sovereignty.refreshActiveGrants}
      />
      
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        className="w-72 min-h-screen glass-elevated border-r border-border p-6 flex flex-col z-30"
      >
        <div className="flex items-center gap-3 mb-10 px-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-12 h-12 rounded-2xl bg-gradient-omni flex items-center justify-center shadow-xl shadow-primary/30">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-lg tracking-tight leading-none">OMNI CORE</h1>
            <p className="text-[10px] text-primary uppercase font-bold tracking-[0.2em] mt-1">Souveraineté</p>
          </div>
        </div>

        <nav className="flex-1 space-y-8">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest px-4 mb-3">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group ${
                      activeTab === tab.id
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                        : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                    }`}
                  >
                    <tab.icon className={`w-4 h-4 transition-transform ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className="font-medium text-sm">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="pt-6 border-t border-border mt-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground group h-11 px-4"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Sortir du Noyau</span>
          </Button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-20">
        {/* Top Bar Header */}
        <header className="h-20 border-b border-border bg-background/50 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
              <span>OMNI CORE</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-primary">{sections.flatMap(s => s.tabs).find(t => t.id === activeTab)?.label}</span>
            </div>
            
            <Badge variant="outline" className="hidden md:flex ml-4 gap-1.5 py-1 px-3 bg-green-500/10 text-green-400 border-green-500/20 font-bold uppercase text-[9px]">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Système Opérationnel
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden lg:block w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher logs ou actions..." 
                className="pl-9 h-10 bg-secondary/30 border-border/50 focus-visible:ring-primary/20"
              />
            </div>

            <Button size="icon" variant="ghost" className="relative group" onClick={handleRefresh}>
              <RefreshCw className={`w-5 h-5 text-muted-foreground group-hover:text-primary transition-all ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            
            <Button size="icon" variant="ghost" className="relative text-muted-foreground hover:text-primary transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 pl-4 border-l border-border hover:opacity-80 transition-opacity cursor-pointer">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-foreground leading-none">Admin Omni</p>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-widest">Souverain</p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-secondary border border-border flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full bg-gradient-omni flex items-center justify-center text-primary-foreground font-bold">
                       A
                    </div>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 glass-elevated border-border p-2">
                <DropdownMenuLabel className="px-3 pt-3 pb-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Session Active</p>
                  <p className="text-[11px] font-mono text-primary truncate">{user?.id}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-3 p-3 rounded-lg cursor-pointer">
                  <UserIcon className="w-4 h-4 text-muted-foreground" />
                  <span>Mon Profil</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-3 p-3 rounded-lg cursor-pointer">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  <span>Paramètres Sécurité</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="gap-3 p-3 rounded-lg cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-500/10"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Déconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Dynamic Content Container */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="max-w-7xl mx-auto"
            >
              {/* Header inside content for context */}
              <div className="flex items-end justify-between mb-10">
                <div className="space-y-1">
                  <h2 className="text-4xl font-extrabold text-white tracking-tight">
                    {sections.flatMap(s => s.tabs).find(t => t.id === activeTab)?.label}
                  </h2>
                  <p className="text-muted-foreground text-sm max-w-lg">
                    {activeTab === 'pulse' && "Surveillance temps réel de l'activité du noyau et de la santé système."}
                    {activeTab === 'users' && "Gestion des identités, des rôles et des invitations pour l'organisation."}
                    {activeTab === 'logs' && "Exploration des journaux d'audit immuables pour la conformité et la sécurité."}
                    {activeTab === 'ia' && "Analyse des comportements et détection préventive des anomalies par IA."}
                    {activeTab === 'console' && "Interface de commande directe pour les opérations administratives critiques."}
                    {activeTab === 'rbac' && "Définition précise des droits d'accès contextuels et temporels."}
                    {activeTab === 'security' && "Protocoles d'urgence et mécanisme de verrouillage global du système."}
                    {activeTab === 'dlp' && "Surveillance et prévention des fuites de données sensibles (Patterns & Regex)."}
                    {activeTab === 'keys' && "Gestion du cycle de vie des clés de chiffrement et statut HSM."}
                    {activeTab === 'settings' && "Configuration avancée des paramètres internes de souveraineté."}
                  </p>
                </div>
                
                {/* Module Actions Placeholder */}
                <div className="flex items-center gap-2">
                   <Button variant="outline" className="border-primary/20 bg-primary/5 text-primary gap-2 hover:bg-primary/10">
                      <MoreHorizontal className="w-4 h-4" />
                      Actions du Module
                   </Button>
                </div>
              </div>

              {/* Actual Components */}
              <div className="relative min-h-[500px]">
                {activeTab === 'pulse' && <PulseDashboard organizationId={organizationId} />}
                {activeTab === 'users' && <UserManagement organizationId={organizationId} />}
                {activeTab === 'logs' && <AuditExplorer organizationId={organizationId} />}
                {activeTab === 'ia' && <BehavioralIntelligence organizationId={organizationId} />}
                {activeTab === 'console' && <CommandConsole organizationId={organizationId} />}
                {activeTab === 'rbac' && <AccessPolicyManager organizationId={organizationId} />}
                {activeTab === 'security' && <KillSwitchPanel organizationId={organizationId} />}
                {activeTab === 'dlp' && <DLPManager organizationId={organizationId} />}
                {activeTab === 'archive' && <ShadowArchiveManager organizationId={organizationId} />}
                {activeTab === 'keys' && <KeyManagement organizationId={organizationId} />}
                {activeTab === 'settings' && (
                  <div className="flex flex-col items-center justify-center p-20 glass rounded-3xl border-dashed border-2 border-border/60">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                      <Settings className="w-10 h-10 text-primary opacity-40" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Configuration Système</h3>
                    <p className="text-muted-foreground text-center max-w-md">
                      Le moteur de configuration centralisé sera activé après la validation du premier cycle multi-sig global.
                    </p>
                    <Button variant="outline" className="mt-8">Lire la Documentation</Button>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Admin;

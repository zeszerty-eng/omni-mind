import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileSearch, Shield, User, Calendar,
  ExternalLink, Hash, AlertTriangle, XCircle,
  Wifi, WifiOff, Activity, RotateCcw
} from 'lucide-react';
import { useSovereignty } from '../hooks/useSovereignty';
import { auditService } from '../services/audit.service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { AuditTable } from './ui/AuditTable';
import { AuditFilters } from './ui/AuditFilters';
import type { AuditLog, ShadowArchive } from '../types';

interface AuditExplorerProps {
  organizationId: string;
}

export const AuditExplorer = ({ organizationId }: AuditExplorerProps) => {
  const { logs, loading, fetchAuditLogs, realtimeStatus } = useSovereignty(organizationId);
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [filterAction, setFilterAction] = useState<string | null>(null);
  const [shadowArchive, setShadowArchive] = useState<ShadowArchive | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    fetchAuditLogs({ 
      action: filterAction as any || undefined
    });
  }, [organizationId, filterAction, fetchAuditLogs]);

  useEffect(() => {
    if (selectedLog && selectedLog.action === 'delete') {
      auditService.getShadowArchiveByResource(selectedLog.resource_id!, selectedLog.resource_type)
        .then(setShadowArchive)
        .catch(() => setShadowArchive(null));
    } else {
      setShadowArchive(null);
    }
  }, [selectedLog]);

  const handleRestore = async () => {
    if (!shadowArchive) return;
    setIsRestoring(true);
    try {
      await auditService.restoreFromShadowArchive(shadowArchive.id);
      toast({
        title: "Restauration initiée",
        description: "La ressource a été restaurée avec succès depuis l'archive Shadow.",
      });
      setShadowArchive(null);
    } catch (err: any) {
      toast({
        title: "Échec de la restauration",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.target_name?.toLowerCase().includes(search.toLowerCase()) ||
    (log.profiles?.email && log.profiles.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
               <Activity className="w-4 h-4" /> Analyse Dynamique
            </h3>
            <Badge 
              variant="outline" 
              className={`gap-1.5 py-0.5 px-2 text-[9px] uppercase font-bold border-none ${
                realtimeStatus === 'connected' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
              }`}
            >
              <div className={`w-1 h-1 rounded-full ${realtimeStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              {realtimeStatus === 'connected' ? 'Live Sync' : 'Offline'}
            </Badge>
          </div>
          <span className="text-[10px] text-muted-foreground italic font-mono">
            {filteredLogs.length} Entrées chargées
          </span>
        </div>

        <AuditFilters
          search={search}
          onSearchChange={setSearch}
          filterAction={filterAction}
          onFilterChange={setFilterAction}
          onExport={() => alert('Export non implémenté en mode local')}
        />
      </div>

      {/* Logs Table */}
      <AuditTable 
        logs={filteredLogs}
        loading={loading}
        onSelectLog={setSelectedLog}
      />

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-background/95 backdrop-blur-md border-l border-border z-[60] shadow-2xl p-6 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FileSearch className="w-5 h-5 text-primary" />
                Détails de l'Audit
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedLog(null)}>
                <XCircle className="w-6 h-6 text-muted-foreground" />
              </Button>
            </div>

            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">ID de l'Audit</p>
                <p className="text-sm font-mono break-all flex items-center gap-2">
                  <Hash className="w-3 h-3 text-muted-foreground" />
                  {selectedLog.id}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> Utilisateur
                  </p>
                  <p className="text-sm font-medium">{selectedLog.profiles?.full_name || 'Système'}</p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Action
                  </p>
                  <Badge variant="outline" className="uppercase text-[10px]">{selectedLog.action}</Badge>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Timestamp précis
                </p>
                <p className="text-sm font-mono">{selectedLog.created_at}</p>
              </div>

              <div>
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 ${selectedLog.risk_score > 0.4 ? 'text-orange-500' : 'text-green-500'}`} />
                  Analyse de Risque IA
                </p>
                <div className="h-4 bg-secondary rounded-full overflow-hidden flex">
                   <div 
                    className={`h-full ${selectedLog.risk_score > 0.7 ? 'bg-red-500' : selectedLog.risk_score > 0.4 ? 'bg-orange-500' : 'bg-green-500'}`} 
                    style={{ width: `${selectedLog.risk_score * 100}%` }}
                   />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedLog.is_suspicious 
                    ? "Attention : Cette action a été marquée comme hautement suspecte par le moteur comportemental." 
                    : "Action conforme au profil habituel de l'utilisateur."}
                </p>
              </div>

              {shadowArchive && (
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <RotateCcw className="w-4 h-4" />
                    <p className="text-xs font-bold uppercase tracking-widest">Archive WORM disponible</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Une copie immuable de cette ressource (Node ID: {shadowArchive.original_resource_id}) a été capturée avant sa suppression. 
                    Vous pouvez restaurer cette donnée immédiatement.
                  </p>
                  <Button 
                    className="w-full h-8 text-[10px] uppercase font-bold gap-2 bg-primary hover:bg-primary/90"
                    onClick={handleRestore}
                    disabled={isRestoring}
                  >
                    {isRestoring ? "Restauration..." : "Restaurer via Multi-sig (Simulation)"}
                  </Button>
                </div>
              )}

              <div className="pt-6 border-t border-border flex gap-2">
                <Button variant="outline" className="flex-1 gap-2">
                  <Shield className="w-4 h-4" />
                  Scanner (DLP)
                </Button>
                <Button className="flex-1 gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Audit complet
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuditExplorer;

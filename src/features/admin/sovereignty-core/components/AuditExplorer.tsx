import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, Download, Eye, AlertTriangle, 
  ChevronDown, FileSearch, Shield, User, Calendar,
  ExternalLink, Hash
} from 'lucide-react';
import { useSovereignty } from '../hooks/useSovereignty';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AuditLog } from '../types';

interface AuditExplorerProps {
  organizationId: string;
}

export const AuditExplorer = ({ organizationId }: AuditExplorerProps) => {
  const { logs, loading, fetchAuditLogs } = useSovereignty(organizationId);
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [filterAction, setFilterAction] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditLogs({ 
      organizationId,
      action: filterAction as any || undefined
    });
  }, [organizationId, filterAction, fetchAuditLogs]);

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.target_name?.toLowerCase().includes(search.toLowerCase()) ||
    log.profiles?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getRiskColor = (score: number) => {
    if (score > 0.7) return 'bg-red-500/20 text-red-500 border-red-500/50';
    if (score > 0.4) return 'bg-orange-500/20 text-orange-500 border-orange-500/50';
    return 'bg-green-500/20 text-green-500 border-green-500/50';
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher par action, utilisateur ou cible..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary/50 border-border"
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                {filterAction || 'Toutes les actions'}
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setFilterAction(null)}>Toutes les actions</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterAction('login')}>Connexion</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterAction('create')}>Création</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterAction('delete')}>Suppression</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterAction('revoke')}>Révocation</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Logs Table */}
      <Card className="glass overflow-hidden border-border">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow>
              <TableHead className="w-[180px]">Action</TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Cible / Ressource</TableHead>
              <TableHead>Date / Heure</TableHead>
              <TableHead className="text-right">Score de Risque</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Chargement des logs...
                </TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Aucun log trouvé.
                </TableCell>
              </TableRow>
            ) : filteredLogs.map((log) => (
              <TableRow 
                key={log.id} 
                className="hover:bg-secondary/30 transition-colors cursor-pointer"
                onClick={() => setSelectedLog(log)}
              >
                <TableCell>
                  <Badge variant="outline" className="font-mono text-[10px] uppercase bg-secondary/80">
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{log.profiles?.full_name || 'Inconnu'}</span>
                    <span className="text-xs text-muted-foreground italic">{log.profiles?.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{log.resource_type}</span>
                    <span className="text-sm">{log.target_name || log.resource_id?.slice(0, 8)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">
                  {new Date(log.created_at).toLocaleString('fr-FR')}
                </TableCell>
                <TableCell className="text-right">
                  <Badge className={getRiskColor(log.risk_score)}>
                    {(log.risk_score * 100).toFixed(0)}%
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/20">
                    <Eye className="w-4 h-4 text-primary" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Panel (Slide-in or Dialog) */}
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
                  <p className="text-sm font-medium">{selectedLog.profiles?.full_name}</p>
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

              <div>
                <p className="text-sm font-semibold mb-3">Métadonnées étendues (Immutable)</p>
                <pre className="text-[10px] font-mono p-4 rounded-xl bg-black/40 text-primary-foreground overflow-x-auto">
                  {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                </pre>
              </div>

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

const XCircle = ({ className, ...props }: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </svg>
);

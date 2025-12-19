import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, Fingerprint, Plus, Trash2, 
  Search, AlertCircle, FileLock, CheckCircle2,
  Lock, Settings2, Eye, Ban
} from 'lucide-react';
import { auditService } from '../services/audit.service';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import type { DLPRule, DLPViolation } from '../types';

interface DLPManagerProps {
  organizationId: string;
}

export const DLPManager = ({ organizationId }: DLPManagerProps) => {
  const [rules, setRules] = useState<DLPRule[]>([]);
  const [violations, setViolations] = useState<DLPViolation[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const activeRules = await auditService.getDLPRules(organizationId);
      const activeViolations = await auditService.getDLPViolations(organizationId);
      setRules(activeRules);
      setViolations(activeViolations);
    } catch (err) {
      console.error('Error fetching DLP data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-500 border-red-500/50';
      case 'high': return 'bg-orange-500/20 text-orange-500 border-orange-500/50';
      default: return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileLock className="w-6 h-6 text-primary" />
            Data Loss Prevention (DLP)
          </h2>
          <p className="text-sm text-muted-foreground italic">Surveillance et protection des données sensibles</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="gap-2" onClick={fetchData}>
             <Search className="w-4 h-4" /> Scanner Maintenant
           </Button>
           <Button onClick={() => setIsAddRuleOpen(true)} className="gap-2">
             <Plus className="w-4 h-4" /> Nouvelle Règle
           </Button>
        </div>
      </div>

      <Tabs defaultValue="violations" className="w-full">
        <TabsList className="bg-secondary/30 mb-6">
          <TabsTrigger value="violations" className="gap-2">
            <ShieldAlert className="w-4 h-4" /> Violations Récentes
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <Settings2 className="w-4 h-4" /> Règles de Filtrage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="violations">
          <Card className="glass border-border">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead className="w-[150px]">Date</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Ressource</TableHead>
                  <TableHead>Type Sensible</TableHead>
                  <TableHead className="text-right">Sévérité/Score</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {violations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic text-sm">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-10" />
                      Aucune violation détectée. Le périmètre est sécurisé.
                    </TableCell>
                  </TableRow>
                ) : violations.map((v) => (
                  <TableRow key={v.id} className="hover:bg-red-500/5 transition-colors">
                    <TableCell className="text-xs font-mono">
                       {new Date(v.detected_at).toLocaleString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">UID: {v.user_id?.slice(0, 8)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="ghost" className="text-[10px]">{v.resource_type}</Badge>
                        <span className="text-xs text-muted-foreground">{v.resource_id?.slice(0, 12)}...</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {v.matched_rules?.map((rule, idx) => (
                          <Badge key={idx} variant="outline" className="text-[9px] uppercase border-red-500/30 text-red-400">
                             {rule}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                       <Badge className={getSeverityColor(v.sensitivity_score > 0.8 ? 'critical' : 'high')}>
                         {(v.sensitivity_score * 100).toFixed(0)} CP
                       </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                         <Eye className="w-4 h-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rules.map((rule) => (
              <Card key={rule.id} className="glass border-border hover:border-primary/40 transition-all group">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                  <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-widest bg-primary/10 text-primary">
                    {rule.severity}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <CardTitle className="text-base mb-1">{rule.name}</CardTitle>
                  <CardDescription className="text-xs mb-4">{rule.description}</CardDescription>
                  
                  <div className="p-3 rounded-lg bg-black/20 border border-border/50 space-y-2">
                     <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                       <Fingerprint className="w-3 h-3" /> Pattern Requis
                     </p>
                     <code className="text-[11px] text-green-400 font-mono block truncate">
                       {rule.pattern}
                     </code>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                     <span className="text-[10px] text-muted-foreground italic">Actions: {rule.action_on_match}</span>
                     <Badge variant="outline" className="text-[9px] text-green-500 border-green-500/20">ACTIF</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Template Card for Quick Add */}
            <Card className="border-dashed border-2 border-border bg-transparent flex flex-col items-center justify-center p-8 hover:border-primary/40 transition-colors cursor-pointer" onClick={() => setIsAddRuleOpen(true)}>
               <Plus className="w-10 h-10 text-muted-foreground opacity-20 mb-2" />
               <p className="text-sm font-bold text-muted-foreground">Ajouter un Pattern</p>
               <p className="text-[11px] text-muted-foreground/60">Regex, Mots-clés ou IA</p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="p-6 rounded-2xl bg-orange-500/5 border border-orange-500/20 flex gap-4">
         <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-orange-500" />
         </div>
         <div>
            <h4 className="text-sm font-bold text-orange-500 uppercase tracking-widest mb-1">Protection contre l'Exfiltration (WIP)</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Le blocage automatique des téléchargements massifs est actuellement en mode simulé. 
              Les alertes sont loggées dans le canal de souveraineté immuable.
            </p>
         </div>
      </div>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, Clock, Ghost, ShieldAlert, Plus, 
  Trash2, Settings2, Info, Lock, EyeOff, AlertTriangle
} from 'lucide-react';
import { rbacService } from '../services/rbac.service';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import type { AccessPolicy, TemporalAccessGrant } from '../types';

interface AccessPolicyManagerProps {
  organizationId: string;
}

export const AccessPolicyManager = ({ organizationId }: AccessPolicyManagerProps) => {
  const [policies, setPolicies] = useState<AccessPolicy[]>([]);
  const [grants, setGrants] = useState<TemporalAccessGrant[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddPolicyOpen, setIsAddPolicyOpen] = useState(false);
  
  // Policy Form State
  const [newResource, setNewResource] = useState('');
  const [newAction, setNewAction] = useState('');
  const [newMfaRequired, setNewMfaRequired] = useState(false);

  // Ghost Mode State
  const [isGhostOpen, setIsGhostOpen] = useState(false);
  const [ghostDuration, setGhostDuration] = useState('60'); // minutes
  const [ghostReason, setGhostReason] = useState('');

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const activePolicies = await rbacService.getPolicies(organizationId);
      setPolicies(activePolicies);
      // Fetching all grants for the org would require a specific method, 
      // here we assume we can fetch them for management.
    } catch (err) {
      console.error('Error fetching RBAC data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivatePolicy = async (policyId: string) => {
    try {
      await rbacService.deactivatePolicy(policyId);
      toast({ title: 'Policy désactivée' });
      fetchData();
    } catch (err) {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleCreatePolicy = async () => {
    try {
      await rbacService.createPolicy(organizationId, {
        resource_type: newResource,
        action: newAction as any, // Typed as string mostly, but should check types
        priority: 10,
        effect: 'allow',
        require_mfa: newMfaRequired,
        conditions: {}
      });
      toast({ title: 'Politique créée avec succès' });
      setIsAddPolicyOpen(false);
      setNewResource('');
      setNewAction('');
      setNewMfaRequired(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erreur création', description: err.message, variant: 'destructive' });
    }
  };

  const handleCreateGhostGrant = async () => {
    try {
      const minutes = parseInt(ghostDuration);
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + minutes);

      // Assume current user for self-elevation in this context, 
      // or we might need a user selector if granting to others. 
      // Given the UI context, "Créer un accès Ghost" likely implies self-elevation for admin tasks.
      // But rbacService.createTemporalGrant takes user_id.
      // Let's assume we are elevating OURSELVES or creating a generic grant token?
      // Usually Ghost Mode is self-elevation.
      // We need the current user ID. Let's get it from supabase auth inside the component or pass it.
      // better: rbacService.createTemporalGrant requires user_id.
      // We can fetch current user.
      
      // For now, let's just use a placeholder or handle it in service if possible?
      // No, service uses getUser() for 'granted_by'.
      const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
      
      if (!user) throw new Error("Utilisateur non authentifié");

      await rbacService.createTemporalGrant(organizationId, {
        user_id: user.id,
        reason: ghostReason || 'Urgence Opérationnelle',
        expires_at: expiresAt.toISOString(),
        access_level: 'admin_audit' // Example level
      });

      toast({ title: 'MODE GHOST ACTIVÉ', description: `Élévation active pour ${minutes} minutes.` });
      setIsGhostOpen(false);
      // Trigger global refresh via prop or context? 
      // AccessPolicyManager doesn't have onRefresh prop that affects the top bar directly, 
      // but ElevationStatusBar listens to realtime.
    } catch (err: any) {
      toast({ title: 'Echec activation', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Noyau RBAC Granulaire
          </h2>
          <p className="text-sm text-muted-foreground italic">Gestion des politiques d'accès contextuelles et temporelles</p>
        </div>
        <Button onClick={() => setIsAddPolicyOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle Policy
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Policies List */}
        <Card className="lg:col-span-2 glass border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-orange-400" />
              Politiques Actives
            </CardTitle>
            <CardDescription className="text-xs">Règles de filtrage des actions basées sur le contexte</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead className="text-[10px] uppercase">Ressource</TableHead>
                  <TableHead className="text-[10px] uppercase">Action</TableHead>
                  <TableHead className="text-[10px] uppercase">Condition</TableHead>
                  <TableHead className="text-[10px] uppercase text-right">Priorité</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic text-sm">
                      Aucune politique personnalisée. Les droits RBAC standards s'appliquent.
                    </TableCell>
                  </TableRow>
                ) : policies.map((policy) => (
                  <TableRow key={policy.id} className="group">
                    <TableCell className="font-mono text-xs">{policy.resource_type || '*'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] uppercase">{policy.action}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {policy.require_mfa && <Badge variant="secondary" className="w-fit text-[8px] bg-blue-500/10 text-blue-400 border-blue-500/30">MFA REQUIS</Badge>}
                        <span className="text-[10px] text-muted-foreground">{policy.condition_rules ? JSON.stringify(policy.condition_rules) : 'Aucune restriction'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold">{policy.priority}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-8 w-8 text-red-400" onClick={() => handleDeactivatePolicy(policy.id)}>
                         <Trash2 className="w-4 h-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Temporal Access / Ghost Mode Info */}
        <div className="space-y-6">
          <Card className="glass border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Ghost className="w-5 h-5 text-primary" />
                Accès Temporels
              </CardTitle>
              <CardDescription className="text-xs">"Ghost Mode" : élévation de privilèges limitée dans le temps</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-black/20 border border-primary/10">
                   <p className="text-xs text-muted-foreground flex items-center gap-2 mb-2">
                     <Info className="w-3 h-3 text-primary" /> Concept
                   </p>
                   <p className="text-[11px] leading-relaxed italic text-foreground/80">
                     Permet d'octroyer des droits d'ADMIN ou de MANAGER à un utilisateur pour une durée fixe (ex: débug d'une heure).
                   </p>
                </div>
                
                <Button 
                  className="w-full gap-2 variant-primary shadow-lg shadow-primary/20"
                  onClick={() => setIsGhostOpen(true)}
                >
                  <Clock className="w-4 h-4" />
                  Créer un accès Ghost
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <EyeOff className="w-5 h-5 text-muted-foreground" />
                Ressources Invisibles
              </CardTitle>
              <CardDescription className="text-xs">Masquage total d'actifs sensibles</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
               <div className="text-center py-4">
                  <Lock className="w-8 h-8 text-muted-foreground mx-auto opacity-20 mb-2" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Fonctionnalité active</p>
                  <p className="text-[11px] text-muted-foreground mt-1 italic">Toutes les ressources tagged #SECURE sont masquées par défaut.</p>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Policy Dialog */}
      <Dialog open={isAddPolicyOpen} onOpenChange={setIsAddPolicyOpen}>
        <DialogContent className="glass-elevated border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle Politique d'Accès</DialogTitle>
            <DialogDescription>Définissez une règle granulaire pour le noyau de souveraineté.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
                <Label>Type de Ressource</Label>
                <Input 
                  placeholder="ex: files, profiles, analytics" 
                  className="bg-secondary/50" 
                  value={newResource}
                  onChange={(e) => setNewResource(e.target.value)}
                />
             </div>
             <div className="space-y-2">
                <Label>Action</Label>
                <Input 
                  placeholder="ex: delete, download_raw" 
                  className="bg-secondary/50" 
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value)}
                />
             </div>
             <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                <input 
                  type="checkbox" 
                  id="mfa" 
                  className="accent-primary" 
                  checked={newMfaRequired}
                  onChange={(e) => setNewMfaRequired(e.target.checked)}
                />
                <Label htmlFor="mfa" className="text-sm font-medium">Exiger une validation MFA pour cette action</Label>
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddPolicyOpen(false)}>Annuler</Button>
            <Button className="bg-gradient-omni" onClick={handleCreatePolicy}>Enregistrer la règle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ghost Mode Dialog */}
      <Dialog open={isGhostOpen} onOpenChange={setIsGhostOpen}>
        <DialogContent className="glass-elevated border-primary/20 bg-black/90 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Ghost className="w-5 h-5 animate-pulse" />
              Activation Ghost Mode
            </DialogTitle>
            <DialogDescription>
              Vous êtes sur le point d'élever vos privilèges pour une durée limitée. Cette action est auditée de manière indélébile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
                <Label>Justification (Audit Log)</Label>
                <Input 
                  placeholder="ex: Incident Response #1234" 
                  className="bg-secondary/50 font-mono text-sm" 
                  value={ghostReason}
                  onChange={(e) => setGhostReason(e.target.value)}
                />
             </div>
             <div className="space-y-2">
                <Label>Durée (Minutes)</Label>
                <div className="grid grid-cols-4 gap-2">
                  {['15', '30', '60', '120'].map((m) => (
                    <Button 
                      key={m} 
                      variant={ghostDuration === m ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setGhostDuration(m)}
                    >
                      {m} min
                    </Button>
                  ))}
                </div>
             </div>
             
             <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-3 items-start">
               <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
               <p className="text-[11px] text-red-200">
                 Toute action effectuée sous ce mode sera marquée avec le flag <span className="font-mono font-bold">ELEVATED_PRIVILEGE</span> et ne pourra pas être effacée de l'audit log.
               </p>
             </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsGhostOpen(false)}>Annuler</Button>
            <Button variant="destructive" className="gap-2" onClick={handleCreateGhostGrant}>
              <Ghost className="w-4 h-4" />
              Activer l'Élévation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

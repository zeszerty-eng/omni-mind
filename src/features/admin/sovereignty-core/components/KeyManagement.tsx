import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Key, RefreshCw, ShieldCheck, Zap, 
  Settings, Lock, Clock, History, AlertTriangle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';

interface KeyManagementProps {
  organizationId: string;
}

export const KeyManagement = ({ organizationId }: KeyManagementProps) => {
  const [isRotating, setIsRotating] = useState(false);
  const [rotationProgress, setRotationProgress] = useState(0);

  const handleRotateKeys = () => {
    setIsRotating(true);
    setRotationProgress(0);
    
    // Simulate complex rotation process
    const interval = setInterval(() => {
      setRotationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRotating(false);
          toast({ title: "Rotation des clés réussie", description: "Toutes les ressources ont été re-chiffrées avec le nouveau Master Key Set." });
          return 100;
        }
        return prev + 5;
      });
    }, 150);
  };

  const keyHistory = [
    { version: 'v4.2.0', status: 'Active', rotatedAt: '2025-11-15', algorithm: 'AES-256-GCM' },
    { version: 'v4.1.8', status: 'Deprecated', rotatedAt: '2025-08-10', algorithm: 'AES-256-GCM' },
    { version: 'v4.1.0', status: 'Revoked', rotatedAt: '2025-05-01', algorithm: 'AES-256-CBC' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Key className="w-6 h-6 text-primary" />
            Gestion des Clés Maîtres (KMS)
          </h2>
          <p className="text-sm text-muted-foreground italic">Contrôle cryptographique et rotation des secrets du noyau</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Key Status */}
        <Card className="glass-elevated border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <ShieldCheck className="w-32 h-32 text-primary" />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
               <Zap className="w-5 h-5 text-yellow-400" /> État des Clés Actives
            </CardTitle>
            <CardDescription>Version de chiffrement standard de l'organisation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/10">
               <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-1">Standard de Chiffrement</p>
                  <p className="text-lg font-mono font-bold text-foreground">AES-256-GCM (Quantum Ready)</p>
               </div>
               <Badge className="bg-green-500/20 text-green-400 border-green-500/30">CERTIFIÉ</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Dernière Rotation
                  </p>
                  <p className="text-sm font-medium">Il y a 34 jours</p>
               </div>
               <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1 flex items-center gap-1">
                    <History className="w-3 h-3" /> Validité
                  </p>
                  <p className="text-sm font-medium text-green-400">Excellent</p>
               </div>
            </div>

            <div className="pt-4 space-y-4">
               <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium">Rotation Manuelle Force Majeure</p>
                  <span className="text-[10px] text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded">Multi-sig Requis</span>
               </div>
               {isRotating ? (
                 <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-mono">
                       <span className="text-primary animate-pulse">RE-CHIFFREMENT EN COURS...</span>
                       <span>{rotationProgress}%</span>
                    </div>
                    <Progress value={rotationProgress} className="h-1" />
                 </div>
               ) : (
                 <Button className="w-full gap-2 bg-gradient-omni shadow-lg shadow-primary/20" onClick={handleRotateKeys}>
                   <RefreshCw className="w-4 h-4" />
                   Déclencher une Rotation de Clés
                 </Button>
               )}
            </div>
          </CardContent>
        </Card>

        {/* Key History */}
        <Card className="glass border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-5 h-5 text-muted-foreground" /> Historique de Versioning
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y divide-border">
                {keyHistory.map((k, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                     <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                          k.status === 'Active' ? 'bg-green-500/10 border-green-500/30' : 'bg-secondary border-border opacity-50'
                        }`}>
                           <Lock className={`w-4 h-4 ${k.status === 'Active' ? 'text-green-500' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                           <p className="text-sm font-bold font-mono">{k.version}</p>
                           <p className="text-[10px] text-muted-foreground">Rotated on {k.rotatedAt}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-mono mb-1">{k.algorithm}</p>
                        <Badge variant="outline" className={`text-[9px] ${
                          k.status === 'Active' ? 'text-green-400 border-green-400/30' : 
                          k.status === 'Deprecated' ? 'text-orange-400 border-orange-400/30' : 'text-red-400 border-red-400/30'
                        }`}>
                           {k.status}
                        </Badge>
                     </div>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="glass border-border p-4 bg-primary/5">
            <h4 className="text-xs font-bold text-primary flex items-center gap-2 mb-2 uppercase tracking-widest">
               <Settings className="w-3 h-3" /> HSM Status
            </h4>
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
               <p className="text-sm font-bold">Matériel Sécurisé Connecté</p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Signature cryptographique déportée active.</p>
         </Card>
         
         <Card className="glass border-red-500/20 p-4 hover:border-red-500/40 transition-colors cursor-pointer group">
            <h4 className="text-xs font-bold text-red-500 flex items-center gap-2 mb-2 uppercase tracking-widest">
               <AlertTriangle className="w-3 h-3" /> Zone Rouge
            </h4>
            <div className="flex items-center gap-2">
               <p className="text-sm font-bold group-hover:text-red-400 transition-colors">Destruction Totale (Zeroing)</p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Effacement définitif de toutes les clés de déchiffrement.</p>
         </Card>

         <Card className="glass border-border p-4">
            <h4 className="text-xs font-bold text-muted-foreground flex items-center gap-2 mb-2 uppercase tracking-widest">
               <ShieldCheck className="w-3 h-3" /> Audit KMS
            </h4>
            <div className="flex items-center gap-2">
               <p className="text-sm font-bold">Vérification Régulière</p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Dernière vérification de conformité : 12h:03m.</p>
         </Card>
      </div>
    </div>
  );
};

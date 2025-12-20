import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Archive, RotateCcw, FileText, Database, 
  Trash2, ShieldCheck, AlertTriangle, Search
} from 'lucide-react';
import { useSovereignty } from '../hooks/useSovereignty';
import { auditService } from '../services/audit.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

interface ShadowArchiveManagerProps {
  organizationId: string;
}

export const ShadowArchiveManager = ({ organizationId }: ShadowArchiveManagerProps) => {
  const { archives, fetchShadowArchives, loading } = useSovereignty(organizationId);
  const [filter, setFilter] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    fetchShadowArchives();
  }, [organizationId, fetchShadowArchives]);

  const handleRestore = async (archiveId: string) => {
    setRestoringId(archiveId);
    try {
      await auditService.restoreFromShadowArchive(archiveId);
      toast({
        title: "Restauration Complète",
        description: "La ressource a été réinjectée dans le système avec succès.",
      });
      // Refresh list to show updated status if needed, 
      // though typically restored items might remain in archive but marked restored?
      // Assuming they stay available for audit.
      fetchShadowArchives();
    } catch (err: unknown) {
      const error = err as Error; // Basic safe cast for now or use unknown
      toast({
        title: "Erreur Critique",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRestoringId(null);
    }
  };

  const filteredArchives = archives.filter(archive => 
    archive.original_resource_type.toLowerCase().includes(filter.toLowerCase()) ||
    archive.original_resource_id.includes(filter) ||
    JSON.stringify(archive.content).toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Archive className="w-6 h-6 text-primary" />
            Shadow Archives (WORM)
          </h2>
          <p className="text-sm text-muted-foreground italic">
            Référentiel immuable des données supprimées. Restauration sous mandat souverain.
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher par ID ou contenu..." 
            className="pl-9 bg-secondary/30 border-border/50"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <Card className="glass border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="w-5 h-5 text-muted-foreground" />
              Archives Système
            </CardTitle>
            <Badge variant="outline" className="gap-1.5 bg-blue-500/10 text-blue-400 border-blue-500/20">
              <ShieldCheck className="w-3 h-3" />
              Protection Intégrité Active
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Les éléments ci-dessous sont physiquement supprimés de la production mais conservés cryptographiquement.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow>
                <TableHead className="text-[10px] uppercase">Ressource</TableHead>
                <TableHead className="text-[10px] uppercase">ID Original</TableHead>
                <TableHead className="text-[10px] uppercase">Date Archivage</TableHead>
                <TableHead className="text-[10px] uppercase">Taille</TableHead>
                <TableHead className="text-[10px] uppercase text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 <TableRow>
                   <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                     Chargement du cryptex...
                   </TableCell>
                 </TableRow>
              ) : filteredArchives.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic text-sm flex flex-col items-center gap-2">
                    <Archive className="w-8 h-8 opacity-20" />
                    Aucune archive trouvée. Le système est propre.
                  </TableCell>
                </TableRow>
              ) : (
                filteredArchives.map((archive) => (
                  <TableRow key={archive.id} className="group hover:bg-white/5 transition-colors">
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[10px] uppercase">
                        {archive.original_resource_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {archive.original_resource_id}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(archive.archived_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {JSON.stringify(archive.content).length} bytes
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="gap-2 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => handleRestore(archive.id)}
                        disabled={restoringId === archive.id}
                      >
                         <RotateCcw className={`w-4 h-4 ${restoringId === archive.id ? 'animate-spin' : ''}`} />
                         {restoringId === archive.id ? '...' : 'Restaurer'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-yellow-500/90 mb-1">Attention</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              La restauration réinjecte les données avec leur ID original. Si un nouvel objet a pris cet ID (rare), un conflit de clé primaire surviendra.
            </p>
          </div>
        </div>
         <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3 col-span-2">
          <ShieldCheck className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-blue-500/90 mb-1">Garantie d'Intégrité</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Le Shard d'archive est stocké sur un stockage WORM. Il ne peut être ni modifié ni supprimé avant la période de rétention légale (simulée à 30 jours ici).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

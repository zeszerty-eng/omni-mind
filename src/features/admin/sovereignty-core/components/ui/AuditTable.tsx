import { Eye } from 'lucide-react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { AuditLog } from '../../types';

interface AuditTableProps {
  logs: AuditLog[];
  loading: boolean;
  onSelectLog: (log: AuditLog) => void;
}

export const AuditTable = ({ logs, loading, onSelectLog }: AuditTableProps) => {
  const getRiskColor = (score: number) => {
    if (score > 0.7) return 'bg-red-500/20 text-red-500 border-red-500/50';
    if (score > 0.4) return 'bg-orange-500/20 text-orange-500 border-orange-500/50';
    return 'bg-green-500/20 text-green-500 border-green-500/50';
  };

  return (
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
              <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                   <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                   <span>Analyse des journaux immuables...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                Aucun log trouvé pour cette période.
              </TableCell>
            </TableRow>
          ) : logs.map((log) => (
            <TableRow 
              key={log.id} 
              className="hover:bg-secondary/30 transition-colors cursor-pointer group"
              onClick={() => onSelectLog(log)}
            >
              <TableCell>
                <Badge variant="outline" className="font-mono text-[10px] uppercase bg-secondary/80">
                  {log.action}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{log.profiles?.full_name || 'Inconnu'}</span>
                  <span className="text-xs text-muted-foreground italic font-mono">{log.user_id?.slice(0, 8)}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">{log.resource_type}</span>
                  <span className="text-xs truncate max-w-[150px]">{log.target_name || log.resource_id?.slice(0, 12)}</span>
                </div>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground font-mono">
                {new Date(log.created_at).toLocaleString('fr-FR')}
              </TableCell>
              <TableCell className="text-right">
                <Badge className={`${getRiskColor(log.risk_score)} font-bold`}>
                  {(log.risk_score * 100).toFixed(0)}%
                </Badge>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="w-4 h-4 text-primary" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};

import { motion } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { SyncStatus as SyncStatusType } from '@/lib/syncService';
import { cn } from '@/lib/utils';

interface SyncStatusProps {
  status: SyncStatusType;
  onSync?: () => void;
  pendingCount?: number;
}

export const SyncStatusIndicator = ({ status, onSync, pendingCount = 0 }: SyncStatusProps) => {
  const getStatusColor = () => {
    if (!status.isOnline) return 'text-destructive';
    if (status.isSyncing) return 'text-primary';
    return 'text-green-500';
  };

  const getStatusText = () => {
    if (!status.isOnline) return 'Hors-ligne';
    if (status.isSyncing) return 'Synchronisation...';
    if (pendingCount > 0) return `${pendingCount} en attente`;
    return 'Synchronisé';
  };

  const formatLastSync = (date: string | null) => {
    if (!date) return 'Jamais';
    const d = new Date(date);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div 
      className="flex items-center gap-3 px-3 py-2 rounded-lg glass"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Online/Offline indicator */}
      <div className={cn('flex items-center gap-2', getStatusColor())}>
        {status.isOnline ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
      </div>

      {/* Sync status */}
      <div className="flex items-center gap-2">
        {status.isSyncing ? (
          <RefreshCw className="w-4 h-4 text-primary animate-spin" />
        ) : status.isOnline ? (
          <Cloud className="w-4 h-4 text-green-500" />
        ) : (
          <CloudOff className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-xs text-muted-foreground">{getStatusText()}</span>
      </div>

      {/* Last sync time */}
      {status.lastSync && (
        <span className="text-xs text-muted-foreground/60 hidden sm:inline">
          • {formatLastSync(status.lastSync)}
        </span>
      )}

      {/* Manual sync button */}
      {onSync && status.isOnline && !status.isSyncing && (
        <button
          onClick={onSync}
          className="p-1 hover:bg-secondary rounded transition-colors"
          title="Synchroniser maintenant"
        >
          <RefreshCw className="w-3 h-3 text-muted-foreground" />
        </button>
      )}
    </motion.div>
  );
};

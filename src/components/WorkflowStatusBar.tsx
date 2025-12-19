import { motion } from 'framer-motion';
import { OfflineDocument } from '@/lib/offlineDB';
import { CheckCircle, Clock, Edit2, Archive, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowStatusBarProps {
  documents: OfflineDocument[];
  onFilterByStatus: (status: OfflineDocument['status'] | null) => void;
  activeFilter: OfflineDocument['status'] | null;
}

export const WorkflowStatusBar = ({ 
  documents, 
  onFilterByStatus, 
  activeFilter 
}: WorkflowStatusBarProps) => {
  const counts = {
    draft: documents.filter(d => d.status === 'draft').length,
    pending_review: documents.filter(d => d.status === 'pending_review').length,
    approved: documents.filter(d => d.status === 'approved').length,
    archived: documents.filter(d => d.status === 'archived').length,
  };

  const statuses: { 
    key: OfflineDocument['status']; 
    label: string; 
    icon: typeof Edit2; 
    color: string;
  }[] = [
    { key: 'draft', label: 'Brouillons', icon: Edit2, color: 'text-muted-foreground' },
    { key: 'pending_review', label: 'En révision', icon: Clock, color: 'text-amber-500' },
    { key: 'approved', label: 'Approuvés', icon: CheckCircle, color: 'text-green-500' },
    { key: 'archived', label: 'Archivés', icon: Archive, color: 'text-muted-foreground/60' },
  ];

  return (
    <motion.div 
      className="flex items-center gap-2 p-2 glass rounded-xl overflow-x-auto"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* All documents */}
      <button
        onClick={() => onFilterByStatus(null)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap',
          activeFilter === null
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
        )}
      >
        Tous
        <span className={cn(
          'px-1.5 py-0.5 rounded-full text-xs',
          activeFilter === null ? 'bg-primary-foreground/20' : 'bg-secondary'
        )}>
          {documents.length}
        </span>
      </button>

      {/* Workflow arrow */}
      <ArrowRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />

      {/* Status filters */}
      {statuses.map((status, index) => {
        const Icon = status.icon;
        const count = counts[status.key];
        
        return (
          <div key={status.key} className="flex items-center">
            <button
              onClick={() => onFilterByStatus(status.key)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap',
                activeFilter === status.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <Icon className={cn('w-4 h-4', activeFilter !== status.key && status.color)} />
              <span className="hidden sm:inline">{status.label}</span>
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-xs',
                activeFilter === status.key ? 'bg-primary-foreground/20' : 'bg-secondary'
              )}>
                {count}
              </span>
            </button>
            
            {index < statuses.length - 1 && (
              <ArrowRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0 mx-1" />
            )}
          </div>
        );
      })}
    </motion.div>
  );
};

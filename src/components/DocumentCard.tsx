import { motion } from 'framer-motion';
import { 
  FileText, Image, File, Film, Music, Archive,
  MoreHorizontal, Download, Printer, Trash2, FolderInput,
  Eye, CheckCircle, Clock, AlertCircle, Edit2
} from 'lucide-react';
import { OfflineDocument } from '@/lib/offlineDB';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface DocumentCardProps {
  document: OfflineDocument;
  onView?: (doc: OfflineDocument) => void;
  onPrint?: (doc: OfflineDocument) => void;
  onDownload?: (doc: OfflineDocument) => void;
  onDelete?: (id: string) => void;
  onMove?: (doc: OfflineDocument) => void;
  onStatusChange?: (id: string, status: OfflineDocument['status']) => void;
  index?: number;
  compact?: boolean;
}

const getFileIcon = (mimeType: string | null) => {
  if (!mimeType) return File;
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Film;
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType.includes('pdf')) return FileText;
  if (mimeType.includes('zip') || mimeType.includes('archive')) return Archive;
  return File;
};

const getStatusBadge = (status: OfflineDocument['status']) => {
  switch (status) {
    case 'draft':
      return { label: 'Brouillon', variant: 'secondary' as const, icon: Edit2 };
    case 'pending_review':
      return { label: 'En révision', variant: 'outline' as const, icon: Clock };
    case 'approved':
      return { label: 'Approuvé', variant: 'default' as const, icon: CheckCircle };
    case 'archived':
      return { label: 'Archivé', variant: 'secondary' as const, icon: Archive };
    default:
      return { label: status, variant: 'outline' as const, icon: File };
  }
};

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const DocumentCard = ({
  document,
  onView,
  onPrint,
  onDownload,
  onDelete,
  onMove,
  onStatusChange,
  index = 0,
  compact = false,
}: DocumentCardProps) => {
  const Icon = getFileIcon(document.mime_type);
  const statusInfo = getStatusBadge(document.status);
  const StatusIcon = statusInfo.icon;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03 }}
        className={cn(
          'group flex items-center gap-3 p-3 rounded-lg glass hover:border-primary/30 transition-all cursor-pointer',
          !document.synced && 'border-l-2 border-l-amber-500'
        )}
        onClick={() => onView?.(document)}
      >
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {document.smart_name || document.original_name}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(document.file_size)} • {formatDate(document.created_at)}
          </p>
        </div>

        <Badge variant={statusInfo.variant} className="hidden sm:flex gap-1">
          <StatusIcon className="w-3 h-3" />
          {statusInfo.label}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-secondary rounded"
            >
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView?.(document)}>
              <Eye className="w-4 h-4 mr-2" />
              Voir
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload?.(document)}>
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPrint?.(document)}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMove?.(document)}>
              <FolderInput className="w-4 h-4 mr-2" />
              Déplacer
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete?.(document.id)}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'group relative rounded-xl glass p-4 hover:border-primary/30 transition-all cursor-pointer',
        !document.synced && 'ring-1 ring-amber-500/50'
      )}
      onClick={() => onView?.(document)}
    >
      {/* Sync indicator */}
      {!document.synced && (
        <div className="absolute top-2 right-2">
          <AlertCircle className="w-4 h-4 text-amber-500" />
        </div>
      )}

      {/* Icon */}
      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-primary" />
      </div>

      {/* Content */}
      <h4 className="font-medium text-foreground truncate mb-1">
        {document.smart_name || document.original_name}
      </h4>
      
      <p className="text-xs text-muted-foreground mb-3">
        {formatFileSize(document.file_size)} • {formatDate(document.created_at)}
      </p>

      {/* Summary */}
      {document.summary && (
        <p className="text-xs text-muted-foreground/80 line-clamp-2 mb-3">
          {document.summary}
        </p>
      )}

      {/* Tags */}
      {document.tags && document.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {document.tags.slice(0, 3).map((tag, i) => (
            <span 
              key={i}
              className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Status */}
      <div className="flex items-center justify-between">
        <Badge variant={statusInfo.variant} className="gap-1">
          <StatusIcon className="w-3 h-3" />
          {statusInfo.label}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-secondary rounded"
            >
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView?.(document)}>
              <Eye className="w-4 h-4 mr-2" />
              Voir
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload?.(document)}>
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPrint?.(document)}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMove?.(document)}>
              <FolderInput className="w-4 h-4 mr-2" />
              Déplacer
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {onStatusChange && (
              <>
                <DropdownMenuItem onClick={() => onStatusChange(document.id, 'pending_review')}>
                  <Clock className="w-4 h-4 mr-2" />
                  Envoyer en révision
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(document.id, 'approved')}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approuver
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(document.id, 'archived')}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archiver
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem 
              onClick={() => onDelete?.(document.id)}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
};

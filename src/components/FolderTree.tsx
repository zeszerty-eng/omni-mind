import { motion, AnimatePresence } from 'framer-motion';
import { 
  Folder, FolderPlus, ChevronRight, MoreHorizontal, 
  Edit2, Trash2, FolderOpen 
} from 'lucide-react';
import { OfflineFolder } from '@/lib/offlineDB';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FolderTreeProps {
  folders: OfflineFolder[];
  currentFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onCreateFolder: (name: string, parentId?: string) => void;
  onDeleteFolder: (id: string) => void;
  documentCounts?: Map<string, number>;
}

export const FolderTree = ({
  folders,
  currentFolderId,
  onFolderSelect,
  onCreateFolder,
  onDeleteFolder,
  documentCounts = new Map(),
}: FolderTreeProps) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [createParentId, setCreateParentId] = useState<string | undefined>();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const rootFolders = folders.filter(f => !f.parent_id);

  const getChildFolders = (parentId: string) => 
    folders.filter(f => f.parent_id === parentId);

  const toggleExpand = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleCreate = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), createParentId);
      setNewFolderName('');
      setIsCreateOpen(false);
      setCreateParentId(undefined);
    }
  };

  const openCreateDialog = (parentId?: string) => {
    setCreateParentId(parentId);
    setIsCreateOpen(true);
  };

  const FolderItem = ({ folder, depth = 0 }: { folder: OfflineFolder; depth?: number }) => {
    const children = getChildFolders(folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = currentFolderId === folder.id;
    const docCount = documentCounts.get(folder.id) || 0;

    return (
      <div>
        <motion.div
          className={cn(
            'group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors',
            isSelected 
              ? 'bg-primary/10 text-primary' 
              : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
          )}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => onFolderSelect(folder.id)}
          whileHover={{ x: 2 }}
        >
          {children.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(folder.id);
              }}
              className="p-0.5 hover:bg-secondary/50 rounded"
            >
              <ChevronRight 
                className={cn(
                  'w-3 h-3 transition-transform',
                  isExpanded && 'rotate-90'
                )} 
              />
            </button>
          )}
          
          {children.length === 0 && <div className="w-4" />}

          {isSelected ? (
            <FolderOpen className="w-4 h-4" />
          ) : (
            <Folder className="w-4 h-4" />
          )}

          <span className="flex-1 text-sm truncate">{folder.name}</span>

          {docCount > 0 && (
            <span className="text-xs text-muted-foreground/60 px-1.5 py-0.5 rounded-full bg-secondary">
              {docCount}
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                onClick={(e) => e.stopPropagation()}
                className="p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-secondary rounded"
              >
                <MoreHorizontal className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => openCreateDialog(folder.id)}>
                <FolderPlus className="w-4 h-4 mr-2" />
                Sous-dossier
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit2 className="w-4 h-4 mr-2" />
                Renommer
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDeleteFolder(folder.id)}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </motion.div>

        <AnimatePresence>
          {isExpanded && children.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {children.map(child => (
                <FolderItem key={child.id} folder={child} depth={depth + 1} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {/* All Documents */}
      <motion.div
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors',
          currentFolderId === null
            ? 'bg-primary/10 text-primary'
            : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
        )}
        onClick={() => onFolderSelect(null)}
        whileHover={{ x: 2 }}
      >
        <Folder className="w-4 h-4" />
        <span className="flex-1 text-sm">Tous les documents</span>
      </motion.div>

      {/* Folder tree */}
      {rootFolders.map(folder => (
        <FolderItem key={folder.id} folder={folder} />
      ))}

      {/* Create folder button */}
      <motion.button
        className="flex items-center gap-2 px-2 py-1.5 w-full rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        onClick={() => openCreateDialog()}
        whileHover={{ x: 2 }}
      >
        <FolderPlus className="w-4 h-4" />
        <span className="text-sm">Nouveau dossier</span>
      </motion.button>

      {/* Create folder dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un dossier</DialogTitle>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Nom du dossier"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={!newFolderName.trim()}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

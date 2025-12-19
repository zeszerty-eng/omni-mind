/**
 * useOfflineDocuments - Hook for managing documents with offline support
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineDB, OfflineDocument, OfflineFolder } from '@/lib/offlineDB';
import { syncService, SyncStatus } from '@/lib/syncService';
import { toast } from '@/hooks/use-toast';

// File processing utilities
const generateHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const generateSmartName = (originalName: string, mimeType: string): string => {
  const date = new Date();
  const dateStr = date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).replace(/\//g, '-');

  const extension = originalName.split('.').pop() || '';
  const baseName = originalName.replace(/\.[^/.]+$/, '').toLowerCase();

  if (mimeType.startsWith('image/')) {
    if (baseName.includes('img') || baseName.includes('dsc') || /^[0-9]+$/.test(baseName)) {
      return `Photo_${dateStr}.${extension}`;
    }
    if (baseName.includes('screen') || baseName.includes('capture')) {
      return `Capture_Ecran_${dateStr}.${extension}`;
    }
    return `Image_${dateStr}.${extension}`;
  }

  if (mimeType.includes('pdf')) {
    if (baseName.includes('facture') || baseName.includes('invoice')) {
      return `Facture_${dateStr}.pdf`;
    }
    if (baseName.includes('contrat') || baseName.includes('contract')) {
      return `Contrat_${dateStr}.pdf`;
    }
    return `Document_${dateStr}.pdf`;
  }

  if (mimeType.startsWith('audio/')) return `Audio_${dateStr}.${extension}`;
  if (mimeType.startsWith('video/')) return `Video_${dateStr}.${extension}`;

  return `${baseName}_${dateStr}.${extension}`;
};

const generateSummary = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'Image analysée. OCR disponible si texte présent.';
  if (mimeType.includes('pdf')) return 'Document PDF indexé pour recherche sémantique.';
  if (mimeType.startsWith('audio/')) return 'Fichier audio. Transcription disponible.';
  if (mimeType.startsWith('video/')) return 'Vidéo détectée. Extraction frames possible.';
  return 'Fichier analysé et indexé.';
};

const generateTags = (mimeType: string, originalName: string): string[] => {
  const tags: string[] = [];
  const lowerName = originalName.toLowerCase();

  if (mimeType.startsWith('image/')) tags.push('Image', 'Visuel');
  if (mimeType.includes('pdf')) tags.push('Document', 'PDF');
  if (mimeType.startsWith('audio/')) tags.push('Audio', 'Média');
  if (mimeType.startsWith('video/')) tags.push('Vidéo', 'Média');

  if (lowerName.includes('facture') || lowerName.includes('invoice')) tags.push('Facture', 'Finance');
  if (lowerName.includes('contrat') || lowerName.includes('contract')) tags.push('Contrat', 'Légal');
  if (lowerName.includes('cv') || lowerName.includes('resume')) tags.push('CV', 'Carrière');

  return [...new Set(tags)].slice(0, 5);
};

export const useOfflineDocuments = () => {
  const [documents, setDocuments] = useState<OfflineDocument[]>([]);
  const [folders, setFolders] = useState<OfflineFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getStatus());
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Initialize and load data
  useEffect(() => {
    const init = async () => {
      try {
        await offlineDB.init();
        await loadDocuments();
        await loadFolders();
        syncService.startAutoSync(30000);
      } catch (error) {
        console.error('Failed to initialize offline DB:', error);
      } finally {
        setLoading(false);
      }
    };

    init();

    const unsubscribe = syncService.subscribe(setSyncStatus);
    return () => {
      unsubscribe();
      syncService.stopAutoSync();
    };
  }, []);

  const loadDocuments = useCallback(async () => {
    const docs = await offlineDB.getAllDocuments();
    setDocuments(docs.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    ));
  }, []);

  const loadFolders = useCallback(async () => {
    const flds = await offlineDB.getAllFolders();
    setFolders(flds);
  }, []);

  // Process and upload files
  const processFiles = useCallback(async (files: File[], folderId?: string): Promise<OfflineDocument[]> => {
    const results: OfflineDocument[] = [];

    for (const file of files) {
      try {
        const contentHash = await generateHash(file);
        const smartName = generateSmartName(file.name, file.type);
        const summary = generateSummary(file.type);
        const tags = generateTags(file.type, file.name);

        const doc = await syncService.uploadDocument(file, {
          content_hash: contentHash,
          smart_name: smartName,
          summary,
          tags,
          folder_id: folderId || currentFolderId,
          metadata: {
            originalSize: file.size,
            lastModified: new Date(file.lastModified).toISOString(),
          },
        });

        results.push(doc);

        toast({
          title: 'Fichier ajouté',
          description: syncStatus.isOnline 
            ? `${smartName} synchronisé` 
            : `${smartName} enregistré (hors-ligne)`,
        });
      } catch (error) {
        console.error('Error processing file:', file.name, error);
        toast({
          title: 'Erreur',
          description: `Impossible de traiter ${file.name}`,
          variant: 'destructive',
        });
      }
    }

    await loadDocuments();
    return results;
  }, [currentFolderId, syncStatus.isOnline, loadDocuments]);

  // Update document
  const updateDocument = useCallback(async (id: string, updates: Partial<OfflineDocument>) => {
    await syncService.updateDocument(id, updates);
    await loadDocuments();
  }, [loadDocuments]);

  // Delete document
  const deleteDocument = useCallback(async (id: string) => {
    await syncService.deleteDocument(id);
    await loadDocuments();
    toast({
      title: 'Document supprimé',
      description: syncStatus.isOnline ? 'Synchronisé' : 'Sera supprimé à la reconnexion',
    });
  }, [loadDocuments, syncStatus.isOnline]);

  // Search documents
  const searchDocuments = useCallback(async (query: string): Promise<OfflineDocument[]> => {
    if (!query) return documents;
    return offlineDB.searchDocuments(query);
  }, [documents]);

  // Folder operations
  const createFolder = useCallback(async (name: string, parentId?: string) => {
    const folder: OfflineFolder = {
      id: crypto.randomUUID(),
      name,
      parent_id: parentId || null,
      color: '#3b82f6',
      icon: 'folder',
      document_count: 0,
      created_at: new Date().toISOString(),
    };
    await offlineDB.saveFolder(folder);
    await loadFolders();
    return folder;
  }, [loadFolders]);

  const deleteFolder = useCallback(async (id: string) => {
    await offlineDB.deleteFolder(id);
    await loadFolders();
  }, [loadFolders]);

  // Move document to folder
  const moveToFolder = useCallback(async (docId: string, folderId: string | null) => {
    await updateDocument(docId, { folder_id: folderId });
  }, [updateDocument]);

  // Workflow operations
  const updateWorkflowStatus = useCallback(async (
    docId: string, 
    status: OfflineDocument['status'],
    step?: number
  ) => {
    const updates: Partial<OfflineDocument> = { status };
    if (step !== undefined) updates.workflow_step = step;
    await updateDocument(docId, updates);
  }, [updateDocument]);

  // Force sync
  const forceSync = useCallback(async () => {
    const result = await syncService.syncNow();
    if (result.success) {
      await loadDocuments();
    }
    return result;
  }, [loadDocuments]);

  // Filter documents by current folder
  const filteredDocuments = currentFolderId 
    ? documents.filter(d => d.folder_id === currentFolderId)
    : documents;

  return {
    // Data
    documents: filteredDocuments,
    allDocuments: documents,
    folders,
    loading,
    syncStatus,
    currentFolderId,

    // Document operations
    processFiles,
    updateDocument,
    deleteDocument,
    searchDocuments,
    moveToFolder,

    // Folder operations
    createFolder,
    deleteFolder,
    setCurrentFolderId,

    // Workflow
    updateWorkflowStatus,

    // Sync
    forceSync,
    refreshDocuments: loadDocuments,
  };
};

/**
 * SyncService - Handles synchronization between IndexedDB and server
 * Supports online/offline detection and background sync
 */

import { offlineDB, OfflineDocument, SyncQueueItem } from './offlineDB';
import { toast } from '@/hooks/use-toast';

const getApiUrl = () => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = '3001';
  return `${protocol}//${hostname}:${port}/api`;
};

class SyncService {
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;
  private syncInterval: number | null = null;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
      this.syncNow();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });
  }

  getStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSync: localStorage.getItem('omni_last_sync') || null,
    };
  }

  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach(listener => listener(status));
  }

  startAutoSync(intervalMs: number = 30000) {
    if (this.syncInterval) return;
    this.syncInterval = window.setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncNow();
      }
    }, intervalMs);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      window.clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async syncNow(): Promise<SyncResult> {
    if (!this.isOnline) {
      return { success: false, synced: 0, failed: 0, message: 'Mode hors-ligne' };
    }

    if (this.isSyncing) {
      return { success: false, synced: 0, failed: 0, message: 'Synchronisation en cours' };
    }

    this.isSyncing = true;
    this.notifyListeners();

    const result: SyncResult = { success: true, synced: 0, failed: 0 };

    try {
      // 1. Process sync queue (push local changes to server)
      const queue = await offlineDB.getSyncQueue();
      for (const item of queue) {
        try {
          await this.processSyncItem(item);
          await offlineDB.removeSyncQueueItem(item.id);
          result.synced++;
        } catch (error) {
          console.error('Sync item failed:', item, error);
          await offlineDB.updateSyncQueueRetry(item.id);
          result.failed++;
        }
      }

      // 2. Fetch latest from server and update local
      await this.pullFromServer();

      localStorage.setItem('omni_last_sync', new Date().toISOString());
      result.success = result.failed === 0;
      
      if (result.synced > 0) {
        toast({
          title: 'Synchronisation terminée',
          description: `${result.synced} élément(s) synchronisé(s)`,
        });
      }
    } catch (error) {
      console.error('Sync failed:', error);
      result.success = false;
      result.message = 'Erreur de synchronisation';
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }

    return result;
  }

  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    const API_URL = getApiUrl();

    switch (item.operation) {
      case 'create': {
        const doc = item.payload as OfflineDocument;
        const formData = new FormData();
        
        // Get blob if exists
        const blob = await offlineDB.getFileBlob(doc.id);
        if (blob) {
          formData.append('file', blob, doc.original_name);
        }
        
        // Add document metadata
        Object.entries(doc).forEach(([key, value]) => {
          if (key !== 'local_file_blob' && key !== 'synced' && value !== undefined && value !== null) {
            formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
          }
        });

        const response = await fetch(`${API_URL}/nodes`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error(`Upload failed: ${response.status}`);

        // Mark as synced
        doc.synced = true;
        await offlineDB.saveDocument(doc);
        break;
      }

      case 'update': {
        const updates = item.payload as Partial<OfflineDocument>;
        const response = await fetch(`${API_URL}/nodes/${item.entity_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!response.ok) throw new Error(`Update failed: ${response.status}`);
        break;
      }

      case 'delete': {
        const response = await fetch(`${API_URL}/nodes/${item.entity_id}`, {
          method: 'DELETE',
        });

        if (!response.ok && response.status !== 404) {
          throw new Error(`Delete failed: ${response.status}`);
        }
        break;
      }
    }
  }

  private async pullFromServer(): Promise<void> {
    const API_URL = getApiUrl();
    
    try {
      const response = await fetch(`${API_URL}/nodes`);
      if (!response.ok) return;

      const serverDocs = await response.json();
      
      for (const serverDoc of serverDocs) {
        const localDoc = await offlineDB.getDocument(serverDoc.id);
        
        if (!localDoc || new Date(serverDoc.updated_at) > new Date(localDoc.updated_at)) {
          await offlineDB.saveDocument({
            ...serverDoc,
            folder_id: serverDoc.folder_id || null,
            status: serverDoc.status || 'draft',
            workflow_step: serverDoc.workflow_step || 0,
            assigned_to: serverDoc.assigned_to || null,
            due_date: serverDoc.due_date || null,
            synced: true,
          });
        }
      }
    } catch (error) {
      console.error('Pull from server failed:', error);
    }
  }

  // Upload with offline support
  async uploadDocument(file: File, metadata: Partial<OfflineDocument>): Promise<OfflineDocument> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const doc: OfflineDocument = {
      id,
      user_id: 'local-user',
      content_hash: null,
      mime_type: file.type,
      original_name: file.name,
      smart_name: metadata.smart_name || null,
      raw_content: null,
      summary: metadata.summary || null,
      metadata: metadata.metadata || null,
      tags: metadata.tags || null,
      storage_url: null,
      thumbnail_url: null,
      file_size: file.size,
      processing_status: 'completed',
      folder_id: metadata.folder_id || null,
      status: 'draft',
      workflow_step: 0,
      assigned_to: null,
      due_date: null,
      synced: false,
      created_at: now,
      updated_at: now,
    };

    // Save file blob locally
    await offlineDB.saveFileBlob(id, file);
    
    // Save document metadata
    await offlineDB.saveDocument(doc);

    // Add to sync queue
    await offlineDB.addToSyncQueue({
      operation: 'create',
      entity_type: 'document',
      entity_id: id,
      payload: doc,
    });

    // Try immediate sync if online
    if (this.isOnline) {
      this.syncNow();
    }

    return doc;
  }

  async updateDocument(id: string, updates: Partial<OfflineDocument>): Promise<void> {
    const doc = await offlineDB.getDocument(id);
    if (!doc) return;

    const updatedDoc = {
      ...doc,
      ...updates,
      synced: false,
      updated_at: new Date().toISOString(),
    };

    await offlineDB.saveDocument(updatedDoc);

    await offlineDB.addToSyncQueue({
      operation: 'update',
      entity_type: 'document',
      entity_id: id,
      payload: updates,
    });

    if (this.isOnline) {
      this.syncNow();
    }
  }

  async deleteDocument(id: string): Promise<void> {
    await offlineDB.deleteDocument(id);
    await offlineDB.deleteFileBlob(id);

    await offlineDB.addToSyncQueue({
      operation: 'delete',
      entity_type: 'document',
      entity_id: id,
      payload: null,
    });

    if (this.isOnline) {
      this.syncNow();
    }
  }
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: string | null;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  message?: string;
}

export const syncService = new SyncService();

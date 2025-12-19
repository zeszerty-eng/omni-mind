/**
 * OfflineDB - IndexedDB wrapper for complete offline functionality
 * Handles: Documents, Sync Queue, Folders, Workflows
 */

const DB_NAME = 'omni_offline';
const DB_VERSION = 2;

export interface OfflineDocument {
  id: string;
  user_id: string;
  content_hash: string | null;
  mime_type: string | null;
  original_name: string;
  smart_name: string | null;
  raw_content: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  tags: string[] | null;
  storage_url: string | null;
  thumbnail_url: string | null;
  file_size: number | null;
  processing_status: 'pending' | 'processing' | 'completed' | 'error';
  
  // Workflow fields
  folder_id: string | null;
  status: 'draft' | 'pending_review' | 'approved' | 'archived';
  workflow_step: number;
  assigned_to: string | null;
  due_date: string | null;
  
  // Sync fields
  synced: boolean;
  local_file_blob?: Blob;
  created_at: string;
  updated_at: string;
}

export interface OfflineFolder {
  id: string;
  name: string;
  parent_id: string | null;
  color: string;
  icon: string;
  document_count: number;
  created_at: string;
}

export interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  entity_type: 'document' | 'folder';
  entity_id: string;
  payload: unknown;
  retry_count: number;
  created_at: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  steps: {
    order: number;
    name: string;
    required_action: 'review' | 'approve' | 'sign';
    assignee_role?: string;
  }[];
  created_at: string;
}

class OfflineDB {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Documents store
        if (!db.objectStoreNames.contains('documents')) {
          const docStore = db.createObjectStore('documents', { keyPath: 'id' });
          docStore.createIndex('by_folder', 'folder_id', { unique: false });
          docStore.createIndex('by_status', 'status', { unique: false });
          docStore.createIndex('by_synced', 'synced', { unique: false });
          docStore.createIndex('by_updated', 'updated_at', { unique: false });
          docStore.createIndex('by_name', 'original_name', { unique: false });
        }

        // Folders store
        if (!db.objectStoreNames.contains('folders')) {
          const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
          folderStore.createIndex('by_parent', 'parent_id', { unique: false });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
          syncStore.createIndex('by_created', 'created_at', { unique: false });
        }

        // File blobs store (for offline file storage)
        if (!db.objectStoreNames.contains('file_blobs')) {
          db.createObjectStore('file_blobs', { keyPath: 'id' });
        }

        // Workflow templates store
        if (!db.objectStoreNames.contains('workflows')) {
          db.createObjectStore('workflows', { keyPath: 'id' });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });

    return this.initPromise;
  }

  // Documents CRUD
  async saveDocument(doc: OfflineDocument): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('documents', 'readwrite');
      const store = tx.objectStore('documents');
      const request = store.put(doc);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getDocument(id: string): Promise<OfflineDocument | undefined> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('documents', 'readonly');
      const store = tx.objectStore('documents');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllDocuments(): Promise<OfflineDocument[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('documents', 'readonly');
      const store = tx.objectStore('documents');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getDocumentsByFolder(folderId: string | null): Promise<OfflineDocument[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('documents', 'readonly');
      const store = tx.objectStore('documents');
      const index = store.index('by_folder');
      const request = index.getAll(folderId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getUnsyncedDocuments(): Promise<OfflineDocument[]> {
    const docs = await this.getAllDocuments();
    return docs.filter(doc => !doc.synced);
  }

  async deleteDocument(id: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('documents', 'readwrite');
      const store = tx.objectStore('documents');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async searchDocuments(query: string): Promise<OfflineDocument[]> {
    const docs = await this.getAllDocuments();
    const lowerQuery = query.toLowerCase();
    return docs.filter(doc => 
      doc.original_name?.toLowerCase().includes(lowerQuery) ||
      doc.smart_name?.toLowerCase().includes(lowerQuery) ||
      doc.summary?.toLowerCase().includes(lowerQuery) ||
      doc.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      doc.raw_content?.toLowerCase().includes(lowerQuery)
    );
  }

  // Folders CRUD
  async saveFolder(folder: OfflineFolder): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('folders', 'readwrite');
      const store = tx.objectStore('folders');
      const request = store.put(folder);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllFolders(): Promise<OfflineFolder[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('folders', 'readonly');
      const store = tx.objectStore('folders');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFolder(id: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('folders', 'readwrite');
      const store = tx.objectStore('folders');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // File Blobs (for storing actual file data offline)
  async saveFileBlob(id: string, blob: Blob): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('file_blobs', 'readwrite');
      const store = tx.objectStore('file_blobs');
      const request = store.put({ id, blob, created_at: new Date().toISOString() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getFileBlob(id: string): Promise<Blob | undefined> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('file_blobs', 'readonly');
      const store = tx.objectStore('file_blobs');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result?.blob);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFileBlob(id: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('file_blobs', 'readwrite');
      const store = tx.objectStore('file_blobs');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Sync Queue
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'created_at' | 'retry_count'>): Promise<void> {
    const db = await this.init();
    const fullItem: SyncQueueItem = {
      ...item,
      id: crypto.randomUUID(),
      retry_count: 0,
      created_at: new Date().toISOString(),
    };
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const request = store.put(fullItem);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readonly');
      const store = tx.objectStore('sync_queue');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateSyncQueueRetry(id: string): Promise<void> {
    const db = await this.init();
    const item = await this.getSyncQueueItem(id);
    if (item) {
      item.retry_count++;
      return new Promise((resolve, reject) => {
        const tx = db.transaction('sync_queue', 'readwrite');
        const store = tx.objectStore('sync_queue');
        const request = store.put(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  private async getSyncQueueItem(id: string): Promise<SyncQueueItem | undefined> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readonly');
      const store = tx.objectStore('sync_queue');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Workflow templates
  async saveWorkflow(workflow: WorkflowTemplate): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('workflows', 'readwrite');
      const store = tx.objectStore('workflows');
      const request = store.put(workflow);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllWorkflows(): Promise<WorkflowTemplate[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('workflows', 'readonly');
      const store = tx.objectStore('workflows');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Settings
  async setSetting(key: string, value: unknown): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSetting<T>(key: string): Promise<T | undefined> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }

  // Utility: Clear all data
  async clearAll(): Promise<void> {
    const db = await this.init();
    const stores = ['documents', 'folders', 'sync_queue', 'file_blobs', 'workflows'];
    const tx = db.transaction(stores, 'readwrite');
    for (const store of stores) {
      tx.objectStore(store).clear();
    }
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  }

  // Get storage usage
  async getStorageInfo(): Promise<{ used: number; quota: number }> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
    return { used: 0, quota: 0 };
  }
}

export const offlineDB = new OfflineDB();

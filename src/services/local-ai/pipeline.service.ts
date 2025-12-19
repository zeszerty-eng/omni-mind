import { db, type LocalDocument } from './db';

class AIPipelineService {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, (result: any) => void>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initWorker();
    }
  }

  private initWorker() {
    this.worker = new Worker(new URL('./ai.worker.ts', import.meta.url), {
      type: 'module'
    });

    this.worker.onmessage = (event) => {
      const { type, id, embedding, status, message, error } = event.data;
      
      if (status === 'loading' || status === 'ready') {
        console.log(`[AI Worker] ${message}`);
      }

      if (type === 'embedding-result' && id) {
        const resolve = this.pendingRequests.get(id);
        if (resolve) {
          resolve(embedding);
          this.pendingRequests.delete(id);
        }
      }

      if (type === 'text-result' && id) {
        const resolve = this.pendingRequests.get(id);
        if (resolve) {
          resolve(text);
          this.pendingRequests.delete(id);
        }
      }

      if (type === 'error') {
        console.error(`[AI Worker Error] ${error}`);
      }
    };
  }

  async processFile(file: File): Promise<LocalDocument> {
    let text = '';
    let preview: string | undefined;

    // 1. Extraction du texte
    if (file.type.startsWith('image/')) {
      preview = await this.fileToBase64(file);
      const requestId = crypto.randomUUID();
      text = await new Promise<string>((resolve) => {
        this.pendingRequests.set(requestId, resolve);
        this.worker?.postMessage({
          type: 'extract-text',
          id: requestId,
          image: preview
        });
      });
      if (!text) text = `Image: ${file.name}`;
    } else {
      text = await file.text();
    }
    
    // 2. Vectorisation via le Worker
    const requestId = crypto.randomUUID();
    const embedding = await new Promise<number[]>((resolve) => {
      this.pendingRequests.set(requestId, resolve);
      this.worker?.postMessage({
        type: 'extract-embedding',
        id: requestId,
        text
      });
    });

    // 3. Sauvegarde dans Dexie
    const doc: LocalDocument = {
      name: file.name,
      type: file.type,
      size: file.size,
      content: text,
      embedding,
      preview,
      tags: [],
      metadata: {},
      createdAt: Date.now()
    };

    const id = await db.documents.add(doc);
    return { ...doc, id: id as number };
  }

  async semanticSearch(query: string, limit = 5): Promise<Array<LocalDocument & { score: number }>> {
    // 1. Vectoriser la requête
    const requestId = crypto.randomUUID();
    const queryEmbedding = await new Promise<number[]>((resolve) => {
      this.pendingRequests.set(requestId, resolve);
      this.worker?.postMessage({
        type: 'extract-embedding',
        id: requestId,
        text: query
      });
    });

    // 2. Récupérer tous les documents
    const allDocs = await db.documents.toArray();

    // 3. Calculer la similarité cosinus
    const results = allDocs.map(doc => ({
      ...doc,
      score: this.cosineSimilarity(queryEmbedding, doc.embedding || [])
    }));

    // 4. Trier par score
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private cosineSimilarity(v1: number[], v2: number[]): number {
    if (v1.length !== v2.length || v1.length === 0) return 0;
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    for (let i = 0; i < v1.length; i++) {
      dotProduct += v1[i] * v2[i];
      norm1 += v1[i] * v1[i];
      norm2 += v2[i] * v2[i];
    }
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

export const aiPipeline = new AIPipelineService();

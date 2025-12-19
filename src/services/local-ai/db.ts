import Dexie, { type Table } from 'dexie';

export interface LocalDocument {
  id?: number;
  name: string;
  type: string;
  size: number;
  content: string; // Texte brut extrait
  embedding: number[] | null; // Vecteur sémantique
  preview?: string; // URL blob ou base64
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: number;
}

export class OmniDatabase extends Dexie {
  documents!: Table<LocalDocument>;

  constructor() {
    super('OmniDatabase');
    this.version(1).stores({
      documents: '++id, name, type, createdAt, *tags' // Indexes
    });
  }
}

export const db = new OmniDatabase();

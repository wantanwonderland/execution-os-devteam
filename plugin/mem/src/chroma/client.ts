import { ChromaClient, type Collection } from 'chromadb';
import type Database from 'better-sqlite3';

const COLLECTION_NAME = 'wantan_observations';
const CHROMA_DIR = process.env.WANTAN_MEM_CHROMA_DIR || `${process.env.HOME}/.wantan-mem/chroma`;

export class ChromaIntegration {
  private client: ChromaClient;
  private collection: Collection | null = null;
  private ready = false;

  constructor(private db: Database.Database) {
    this.client = new ChromaClient({ path: CHROMA_DIR });
  }

  async initialize(): Promise<void> {
    try {
      this.collection = await this.client.getOrCreateCollection({
        name: COLLECTION_NAME,
        metadata: { description: 'wantan-mem observation embeddings' }
      });
      this.ready = true;
      console.log('ChromaDB initialized');
    } catch (err) {
      console.error('ChromaDB initialization failed (continuing without vector search):', (err as Error).message);
      this.ready = false;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  async addObservation(id: number, content: string, metadata: Record<string, string>): Promise<void> {
    if (!this.ready || !this.collection) return;
    try {
      await this.collection.add({
        ids: [String(id)],
        documents: [content],
        metadatas: [metadata]
      });
    } catch (err) {
      console.error(`ChromaDB add failed for observation ${id}:`, (err as Error).message);
    }
  }

  async semanticSearch(query: string, limit = 10, where?: Record<string, string>): Promise<number[]> {
    if (!this.ready || !this.collection) return [];
    try {
      const results = await this.collection.query({
        queryTexts: [query],
        nResults: limit,
        where: where
      });
      return (results.ids[0] || []).map(id => parseInt(id));
    } catch (err) {
      console.error('ChromaDB search failed:', (err as Error).message);
      return [];
    }
  }

  async backfill(): Promise<number> {
    if (!this.ready || !this.collection) return 0;
    const existing = await this.collection.count();
    const observations = this.db
      .prepare('SELECT id, content, agent, type, project FROM observations WHERE id > ? ORDER BY id ASC')
      .all(existing) as any[];

    if (observations.length === 0) return 0;

    const batchSize = 100;
    let synced = 0;
    for (let i = 0; i < observations.length; i += batchSize) {
      const batch = observations.slice(i, i + batchSize);
      await this.collection.add({
        ids: batch.map((o: any) => String(o.id)),
        documents: batch.map((o: any) => o.content),
        metadatas: batch.map((o: any) => ({ agent: o.agent, type: o.type, project: o.project }))
      });
      synced += batch.length;
    }
    return synced;
  }
}

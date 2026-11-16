import fs from 'node:fs/promises';
import path from 'node:path';
import { createInitialDatabase } from './seed.js';
import type { BeeloftDatabase } from './types.js';

export class JsonStore {
  private db: BeeloftDatabase | null = null;
  private readonly filePath: string;

  constructor(filePath?: string) {
    this.filePath =
      filePath ??
      path.resolve(process.cwd(), 'server', 'data', 'db.json');
  }

  async init(): Promise<BeeloftDatabase> {
    if (this.db) return this.db;
    const defaults = createInitialDatabase();
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<BeeloftDatabase>;
      const merged: BeeloftDatabase = {
        ...defaults,
        ...parsed,
        user: { ...defaults.user, ...(parsed.user ?? {}) },
        brands: (parsed.brands ?? defaults.brands).map((b) => ({
          engagementRatioMode: 'REACH',
          tags: [],
          whiteLabel: { enabled: false, logoText: b.name, primaryColor: '#F5A623', footerNote: '' },
          aiConfig: { tone: 'Neutral informative', targetAudience: '', brandVoice: '', bannedWords: '' },
          integrations: {
            canva: false,
            googleDrive: false,
            slack: false,
            zapier: false,
            adobeExpress: false,
            lookerStudio: false
          },
          ...b
        }))
      };
      this.db = merged;
      return this.db;
    } catch {
      this.db = defaults;
      await this.persist();
      return this.db;
    }
  }

  async get(): Promise<BeeloftDatabase> {
    return this.init();
  }

  async persist(): Promise<void> {
    if (!this.db) return;
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.db, null, 2), 'utf-8');
  }

  async reset(): Promise<BeeloftDatabase> {
    this.db = createInitialDatabase();
    await this.persist();
    return this.db;
  }
}

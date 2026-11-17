import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createEmptySnapshot,
  MemoryPlatformRepository,
  type PlatformSnapshot
} from './memoryRepository.js';

export class NodeFilePlatformRepository extends MemoryPlatformRepository {
  private readonly filePath: string;
  private loaded = false;

  constructor(filePath?: string) {
    super(createEmptySnapshot(), async (snapshot) => {
      await this.writeSnapshot(snapshot);
    });
    this.driver = 'local-file';
    this.filePath =
      filePath ?? path.resolve(process.cwd(), 'server', 'data', 'platform-db.json');
  }

  override async ensureReady(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<PlatformSnapshot>;
      this.data = {
        ...createEmptySnapshot(),
        ...parsed,
        globalMeta: {
          ...createEmptySnapshot().globalMeta,
          ...(parsed.globalMeta ?? {})
        }
      };
    } catch {
      await this.writeSnapshot(this.data);
    }
  }

  private async writeSnapshot(snapshot: PlatformSnapshot): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
  }
}

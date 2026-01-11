import { StorageAdapter } from "./StorageAdapter";

interface MemoryEntry {
  id: string;
  data: Buffer;
  createdAt: number;
}

/**
 * MemoryStorage - Fallback storage implementation
 * In-memory Map storage, used when disk is unwritable
 */
export class MemoryStorage implements StorageAdapter {
  private entries: Map<string, MemoryEntry> = new Map();
  private entriesByTime: Array<{ id: string; createdAt: number }> = [];
  private currentSize = 0;
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  async write(
    id: string,
    data: Buffer,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type?: "data" | "events"
  ): Promise<void> {
    const entry: MemoryEntry = {
      id,
      data,
      createdAt: Date.now(),
    };

    // Remove old entry if exists
    const oldEntry = this.entries.get(id);
    if (oldEntry) {
      this.currentSize -= oldEntry.data.length;
      const index = this.entriesByTime.findIndex((e) => e.id === id);
      if (index !== -1) {
        this.entriesByTime.splice(index, 1);
      }
    }

    this.entries.set(id, entry);
    this.entriesByTime.push({ id, createdAt: entry.createdAt });
    this.currentSize += data.length;

    // Cleanup if needed
    if (this.currentSize > this.maxSize) {
      await this.cleanup(this.maxSize);
    }
  }

  async read(id: string): Promise<Buffer | null> {
    const entry = this.entries.get(id);
    return entry ? entry.data : null;
  }

  async delete(id: string): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) {
      return;
    }

    this.entries.delete(id);
    const index = this.entriesByTime.findIndex((e) => e.id === id);
    if (index !== -1) {
      this.currentSize -= entry.data.length;
      this.entriesByTime.splice(index, 1);
    }
  }

  async list(): Promise<string[]> {
    return Array.from(this.entries.keys());
  }

  getSize(): number {
    return this.currentSize;
  }

  async cleanup(maxSize: number): Promise<void> {
    while (this.currentSize > maxSize && this.entriesByTime.length > 0) {
      const oldest = this.entriesByTime[0];
      await this.delete(oldest.id);
    }
  }
}

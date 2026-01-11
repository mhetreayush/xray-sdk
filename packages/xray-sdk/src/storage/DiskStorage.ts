import * as fs from "fs/promises";
import * as path from "path";
import { StorageAdapter } from "./StorageAdapter";

interface StorageEntry {
  id: string;
  filePath: string;
  size: number;
  createdAt: number;
}

/**
 * DiskStorage - Primary storage implementation
 * Writes to disk, tracks size in memory, FIFO deletion
 */
export class DiskStorage implements StorageAdapter {
  private entries: Map<string, StorageEntry> = new Map();
  private entriesByTime: Array<{ id: string; createdAt: number }> = [];
  private currentSize = 0;
  private dataDir: string;
  private eventsDir: string;
  private maxSize: number;

  constructor(storageDir: string, maxSize: number) {
    this.dataDir = path.join(storageDir, "data");
    this.eventsDir = path.join(storageDir, "events");
    this.maxSize = maxSize;
  }

  /**
   * Initialize storage directory and scan for existing files
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(this.eventsDir, { recursive: true });
      await this.scanDirectory();
    } catch (error) {
      // Directory creation failed, will be handled by write operations
    }
  }

  /**
   * Scan directory for existing files and populate tracking structures
   * Uses filename convention to determine which folder to look in
   */
  private async scanDirectory(): Promise<void> {
    try {
      // Scan both directories
      let dataFiles: string[] = [];
      let eventFiles: string[] = [];

      try {
        dataFiles = await fs.readdir(this.dataDir);
      } catch (error) {
        // Directory doesn't exist yet
      }

      try {
        eventFiles = await fs.readdir(this.eventsDir);
      } catch (error) {
        // Directory doesn't exist yet
      }

      // Process files from both directories
      await this.processFiles(dataFiles, this.dataDir, "data");
      await this.processFiles(eventFiles, this.eventsDir, "events");

      // Sort by creation time (oldest first)
      this.entriesByTime.sort((a, b) => a.createdAt - b.createdAt);
    } catch (error) {
      // Directory doesn't exist yet or can't be read
    }
  }

  /**
   * Process files from a directory and add them to tracking
   */
  private async processFiles(
    files: string[],
    dir: string,
    expectedType: "data" | "events"
  ): Promise<void> {
    for (const file of files) {
      const filePath = path.join(dir, file);
      try {
        const stats = await fs.stat(filePath);
        const id = this.extractIdFromFilename(file);
        const type = this.getTypeFromFilename(file);
        // Only process if filename matches convention and expected type
        if (id && type === expectedType) {
          const entry: StorageEntry = {
            id,
            filePath,
            size: stats.size,
            createdAt: stats.birthtimeMs,
          };
          this.entries.set(id, entry);
          this.entriesByTime.push({ id, createdAt: stats.birthtimeMs });
          this.currentSize += stats.size;
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }

  /**
   * Extract ID from filename
   * Format: {id}.data.bin or {id}.events.json
   */
  private extractIdFromFilename(filename: string): string | null {
    const match = filename.match(/^([^.]+)\.(?:data|events)\.(?:bin|json)$/);
    return match ? match[1] : null;
  }

  /**
   * Determine file type from filename
   * Returns 'data' or 'events' based on filename suffix
   */
  private getTypeFromFilename(filename: string): "data" | "events" | null {
    if (filename.endsWith(".data.bin")) {
      return "data";
    }
    if (filename.endsWith(".events.json")) {
      return "events";
    }
    return null;
  }

  async write(
    id: string,
    data: Buffer,
    type: "data" | "events" = "data"
  ): Promise<void> {
    const filename = this.generateFilename(id, type);
    const dir = type === "data" ? this.dataDir : this.eventsDir;
    const filePath = path.join(dir, filename);

    await fs.writeFile(filePath, data);

    const stats = await fs.stat(filePath);
    const entry: StorageEntry = {
      id,
      filePath,
      size: stats.size,
      createdAt: Date.now(),
    };

    // Remove old entry if exists
    const oldEntry = this.entries.get(id);
    if (oldEntry) {
      this.currentSize -= oldEntry.size;
      const index = this.entriesByTime.findIndex((e) => e.id === id);
      if (index !== -1) {
        this.entriesByTime.splice(index, 1);
      }
    }

    this.entries.set(id, entry);
    this.entriesByTime.push({ id, createdAt: entry.createdAt });
    this.currentSize += entry.size;

    // Cleanup if needed
    if (this.currentSize > this.maxSize) {
      await this.cleanup(this.maxSize);
    }
  }

  async read(id: string): Promise<Buffer | null> {
    const entry = this.entries.get(id);
    if (!entry) {
      return null;
    }

    try {
      return await fs.readFile(entry.filePath);
    } catch (error) {
      // File doesn't exist, remove from tracking
      this.entries.delete(id);
      const index = this.entriesByTime.findIndex((e) => e.id === id);
      if (index !== -1) {
        this.currentSize -= entry.size;
        this.entriesByTime.splice(index, 1);
      }
      return null;
    }
  }

  async delete(id: string): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) {
      return;
    }

    try {
      await fs.unlink(entry.filePath);
      this.entries.delete(id);
      const index = this.entriesByTime.findIndex((e) => e.id === id);
      if (index !== -1) {
        this.currentSize -= entry.size;
        this.entriesByTime.splice(index, 1);
      }
    } catch (error) {
      // File already deleted or doesn't exist, remove from tracking anyway
      this.entries.delete(id);
      const index = this.entriesByTime.findIndex((e) => e.id === id);
      if (index !== -1) {
        this.currentSize -= entry.size;
        this.entriesByTime.splice(index, 1);
      }
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

  /**
   * Generate filename from ID
   * Format: {id}.data.bin or {id}.events.json
   * The filename convention makes it easy to determine type without scanning folders
   */
  private generateFilename(
    id: string,
    type: "data" | "events" = "data"
  ): string {
    const extension = type === "data" ? "bin" : "json";
    const suffix = type === "data" ? "data" : "events";
    return `${id}.${suffix}.${extension}`;
  }

  /**
   * Get data directory path (for recovery scanning)
   */
  getDataDir(): string {
    return this.dataDir;
  }

  /**
   * Get events directory path (for recovery scanning)
   */
  getEventsDir(): string {
    return this.eventsDir;
  }
}

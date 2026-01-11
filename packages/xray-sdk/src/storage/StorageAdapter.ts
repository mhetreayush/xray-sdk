/**
 * Storage Adapter Interface
 *
 * Defines the interface for storage implementations (DiskStorage, MemoryStorage)
 */

export interface StorageAdapter {
  /**
   * Write data to storage
   * @param id Unique identifier for the stored data
   * @param data Data buffer to store
   * @param type Type of data: 'data' for data blobs, 'events' for event batches
   */
  write(id: string, data: Buffer, type?: "data" | "events"): Promise<void>;

  /**
   * Read data from storage
   * @param id Unique identifier
   * @returns Data buffer or null if not found
   */
  read(id: string): Promise<Buffer | null>;

  /**
   * Delete data from storage
   * @param id Unique identifier
   */
  delete(id: string): Promise<void>;

  /**
   * List all stored data IDs
   * @returns Array of IDs
   */
  list(): Promise<string[]>;

  /**
   * Get current storage size in bytes
   * @returns Current size
   */
  getSize(): number;

  /**
   * Clean up storage by deleting oldest entries until size is under limit
   * @param maxSize Maximum size in bytes
   */
  cleanup(maxSize: number): Promise<void>;
}

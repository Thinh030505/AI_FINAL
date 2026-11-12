import { Injectable, Logger } from '@nestjs/common';

export interface CachedImageBuffer {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
  cachedAt: number;
}

@Injectable()
export class ImageBufferCacheService {
  private readonly logger = new Logger(ImageBufferCacheService.name);
  private readonly cache = new Map<string, CachedImageBuffer>();
  private readonly ttlMs = 5 * 60 * 1000; // 5 minutes TTL
  private readonly maxEntries = 50; // Bound memory usage

  /**
   * Stores image buffer in temporary memory cache keyed by image ID
   */
  set(
    imageId: string,
    buffer: Buffer,
    mimeType = 'image/jpeg',
    originalName = 'image.jpg',
  ): void {
    if (!imageId || !buffer) return;

    this.cleanupExpired();

    // Evict oldest entry if at capacity
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.logger.debug(`[BufferCache] Evicted oldest cache entry: ${oldestKey}`);
      }
    }

    this.cache.set(imageId, {
      buffer,
      mimeType,
      originalName,
      sizeBytes: buffer.length,
      cachedAt: Date.now(),
    });

    this.logger.log(
      `[BufferCache] Cached image buffer for imageId: ${imageId} (size: ${buffer.length} bytes, ttl: ${this.ttlMs / 1000}s)`,
    );
  }

  /**
   * Retrieves image buffer if present and not expired
   */
  get(imageId: string): CachedImageBuffer | null {
    if (!imageId) return null;

    const entry = this.cache.get(imageId);
    if (!entry) {
      this.logger.debug(`[BufferCache] Cache MISS for imageId: ${imageId}`);
      return null;
    }

    if (Date.now() - entry.cachedAt > this.ttlMs) {
      this.cache.delete(imageId);
      this.logger.debug(`[BufferCache] Cache EXPIRED for imageId: ${imageId}`);
      return null;
    }

    this.logger.log(
      `[BufferCache] Cache HIT for imageId: ${imageId} (size: ${entry.sizeBytes} bytes)`,
    );
    return entry;
  }

  /**
   * Explicitly removes a buffer from cache
   */
  delete(imageId: string): void {
    this.cache.delete(imageId);
  }

  /**
   * Checks if an unexpired entry exists
   */
  has(imageId: string): boolean {
    const entry = this.cache.get(imageId);
    if (!entry) return false;
    if (Date.now() - entry.cachedAt > this.ttlMs) {
      this.cache.delete(imageId);
      return false;
    }
    return true;
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.cachedAt > this.ttlMs) {
        this.cache.delete(key);
      }
    }
  }
}

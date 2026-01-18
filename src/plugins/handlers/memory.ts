/**
 * Memory handler plugin for testing and prototyping.
 * Stores feedback items in memory.
 */

import type { FeedbackItem } from '../../types/feedback.js';
import type { HandlerPlugin } from '../../types/plugins.js';

export interface MemoryHandlerOptions {
  /** Maximum number of items to store (0 = unlimited) */
  maxItems?: number;
}

/**
 * Memory handler that stores feedback items in an array.
 * Useful for testing and prototyping.
 * 
 * @example
 * ```typescript
 * const memory = new MemoryHandler<NpsScore>();
 * collector.use(memory);
 * 
 * await collector.collect({ score: 9 });
 * console.log(memory.items); // [{ id: '...', data: { score: 9 }, ... }]
 * ```
 */
export class MemoryHandler<T = unknown> implements HandlerPlugin<T> {
  readonly name = 'memory-handler';
  readonly type = 'handler' as const;

  private readonly maxItems: number;
  private _items: FeedbackItem<T>[] = [];

  constructor(options: MemoryHandlerOptions = {}) {
    this.maxItems = options.maxItems ?? 0;
  }

  handle(item: FeedbackItem<T>): void {
    this._items.push(item);

    // Enforce max items limit
    if (this.maxItems > 0 && this._items.length > this.maxItems) {
      this._items = this._items.slice(-this.maxItems);
    }
  }

  /**
   * Get all stored items.
   */
  get items(): readonly FeedbackItem<T>[] {
    return this._items;
  }

  /**
   * Get the number of stored items.
   */
  get count(): number {
    return this._items.length;
  }

  /**
   * Get the most recent item.
   */
  get last(): FeedbackItem<T> | undefined {
    return this._items[this._items.length - 1];
  }

  /**
   * Clear all stored items.
   */
  clear(): void {
    this._items = [];
  }

  /**
   * Find items by a predicate.
   */
  find(predicate: (item: FeedbackItem<T>) => boolean): FeedbackItem<T>[] {
    return this._items.filter(predicate);
  }

  /**
   * Find items by type.
   */
  findByType(type: string): FeedbackItem<T>[] {
    return this._items.filter((item) => item.type === type);
  }
}

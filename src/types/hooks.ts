/**
 * Lifecycle hook types for the feedback collector.
 */

import type { FeedbackItem, CollectionContext } from './feedback.js';

/**
 * Hook called before feedback is collected.
 * Can modify the data/metadata or return false to cancel collection.
 * @template T - The type of feedback data
 */
export type BeforeCollectHook<T = unknown> = (
  context: CollectionContext<T>
) => void | boolean | Promise<void | boolean>;

/**
 * Hook called after feedback is successfully collected.
 * @template T - The type of feedback data
 */
export type AfterCollectHook<T = unknown> = (
  item: FeedbackItem<T>
) => void | Promise<void>;

/**
 * Hook called when an error occurs during collection or handling.
 */
export type ErrorHook = (
  error: Error,
  context?: { phase: 'validation' | 'collection' | 'transform' | 'handler' }
) => void | Promise<void>;

/**
 * Hook called when a retry attempt is made.
 */
export type RetryHook = (
  attempt: number,
  error: Error,
  nextDelayMs: number
) => void | Promise<void>;

/**
 * Internal hook registry type.
 */
export interface HookRegistry<T = unknown> {
  beforeCollect: BeforeCollectHook<T>[];
  afterCollect: AfterCollectHook<T>[];
  error: ErrorHook[];
  retry: RetryHook[];
}

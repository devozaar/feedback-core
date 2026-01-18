/**
 * Configuration types for the feedback collector.
 */

import type { ZodType } from 'zod';

/**
 * Debounce configuration options.
 */
export interface DebounceConfig {
  /** Debounce delay in milliseconds. Set to 0 to disable. */
  wait: number;
  /** Maximum time to wait before forcing a flush (optional) */
  maxWait?: number;
  /** Whether to fire on the leading edge instead of trailing */
  leading?: boolean;
}

/**
 * Retry configuration options.
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  attempts: number;
  /** Base delay in milliseconds (default: 1000) */
  baseDelay: number;
  /** Maximum delay cap in milliseconds (default: 30000) */
  maxDelay?: number;
  /** Backoff strategy */
  backoff: 'exponential' | 'linear' | 'fixed';
  /** Custom predicate to determine if an error should trigger a retry */
  retryOn?: (error: Error) => boolean;
}

/**
 * Main configuration for the FeedbackCollector.
 * @template T - The type of feedback data
 */
export interface CollectorConfig<T = unknown> {
  /** Type/category of feedback this collector handles */
  type: string;
  /** Optional Zod schema for validation */
  schema?: ZodType<T>;
  /** Debounce configuration (disabled by default) */
  debounce?: DebounceConfig;
  /** Retry configuration (disabled by default) */
  retry?: RetryConfig;
  /** Default metadata to include with all feedback items */
  defaultMetadata?: Partial<import('./feedback.js').FeedbackMetadata>;
}

/**
 * Helper to define configuration with type inference.
 * @template T - The type of feedback data
 */
export function defineConfig<T>(config: CollectorConfig<T>): CollectorConfig<T> {
  return config;
}

/**
 * Default retry configuration.
 */
export const DEFAULT_RETRY_CONFIG: Required<Omit<RetryConfig, 'retryOn'>> = {
  attempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoff: 'exponential',
};

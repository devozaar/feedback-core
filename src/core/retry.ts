/**
 * Retry manager with configurable backoff strategies.
 */

import { RetryExhaustedError } from '../utils/errors.js';
import type { RetryConfig } from '../types/config.js';

export interface RetryOptions extends RetryConfig {
  /** Callback invoked on each retry attempt */
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void | Promise<void>;
}

/**
 * Calculate delay based on backoff strategy.
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  backoff: RetryConfig['backoff']
): number {
  let delay: number;

  switch (backoff) {
    case 'exponential':
      // Exponential: baseDelay * 2^(attempt-1)
      delay = baseDelay * Math.pow(2, attempt - 1);
      break;
    case 'linear':
      // Linear: baseDelay * attempt
      delay = baseDelay * attempt;
      break;
    case 'fixed':
    default:
      // Fixed: always baseDelay
      delay = baseDelay;
      break;
  }

  // Apply jitter (±10%) to prevent thundering herd
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  delay = Math.min(delay + jitter, maxDelay);

  return Math.round(delay);
}

/**
 * Sleep for a specified duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic.
 * 
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the function
 * @throws RetryExhaustedError if all attempts fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    attempts,
    baseDelay,
    maxDelay = 30000,
    backoff,
    retryOn,
    onRetry,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry this error
      if (retryOn && !retryOn(lastError)) {
        throw lastError;
      }

      // If this was the last attempt, don't retry
      if (attempt >= attempts) {
        break;
      }

      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, baseDelay, maxDelay, backoff);

      // Call onRetry hook
      if (onRetry) {
        await onRetry(attempt, lastError, delay);
      }

      // Wait before next attempt
      await sleep(delay);
    }
  }

  throw new RetryExhaustedError(attempts, lastError!);
}

/**
 * Create a retry wrapper for a function.
 */
export function createRetryWrapper<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => withRetry(() => fn(...args), options);
}

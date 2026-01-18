/**
 * Custom error classes for the feedback collection library.
 */

/**
 * Base error class for all feedback-related errors.
 */
export class FeedbackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeedbackError';
    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FeedbackError);
    }
  }
}

/**
 * Error thrown when feedback validation fails.
 */
export class ValidationError extends FeedbackError {
  /** List of validation error messages */
  public readonly errors: string[];

  constructor(errors: string[], message?: string) {
    super(message || `Validation failed: ${errors.join(', ')}`);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Error thrown when a plugin fails during execution.
 */
export class PluginError extends FeedbackError {
  /** Name of the plugin that failed */
  public readonly pluginName: string;
  /** Phase where the error occurred */
  public readonly phase: 'install' | 'validate' | 'transform' | 'handle';
  /** Original error that caused this error */
  public readonly cause?: Error;

  constructor(
    pluginName: string,
    phase: 'install' | 'validate' | 'transform' | 'handle',
    originalError?: Error
  ) {
    super(`Plugin "${pluginName}" failed during ${phase}: ${originalError?.message || 'Unknown error'}`);
    this.name = 'PluginError';
    this.pluginName = pluginName;
    this.phase = phase;
    this.cause = originalError;
  }
}

/**
 * Error thrown when collection is cancelled (e.g., by a hook).
 */
export class CollectionCancelledError extends FeedbackError {
  constructor(reason?: string) {
    super(reason || 'Collection was cancelled');
    this.name = 'CollectionCancelledError';
  }
}

/**
 * Error thrown when all retry attempts are exhausted.
 */
export class RetryExhaustedError extends FeedbackError {
  /** Number of attempts made */
  public readonly attempts: number;
  /** Last error that occurred */
  public readonly lastError: Error;

  constructor(attempts: number, lastError: Error) {
    super(`All ${attempts} retry attempts exhausted. Last error: ${lastError.message}`);
    this.name = 'RetryExhaustedError';
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

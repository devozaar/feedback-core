/**
 * Debouncer utility for rate-limiting feedback collection.
 */

export interface DebouncerOptions {
  /** Delay in milliseconds before executing */
  wait: number;
  /** Maximum time to wait before forcing execution */
  maxWait?: number;
  /** Execute on leading edge instead of trailing */
  leading?: boolean;
}

type AnyFunction = (...args: never[]) => unknown;

/**
 * A debouncer that delays function execution until after a specified wait time.
 * Supports maxWait for guaranteed execution and leading edge execution.
 */
export class Debouncer<T extends AnyFunction> {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private maxWaitTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private lastArgs: Parameters<T> | null = null;
  private leadingExecuted = false;
  private pendingPromises: Array<{
    resolve: (value: ReturnType<T> | PromiseLike<ReturnType<T>>) => void;
    reject: (error: unknown) => void;
  }> = [];

  constructor(
    private readonly fn: T,
    private readonly options: DebouncerOptions
  ) {}

  /**
   * Call the debounced function.
   * Returns a promise that resolves when the function is eventually executed.
   */
  call(...args: Parameters<T>): Promise<ReturnType<T>> {
    return new Promise((resolve, reject) => {
      this.lastArgs = args;
      this.pendingPromises.push({ resolve, reject });

      // Leading edge execution
      if (this.options.leading && !this.leadingExecuted) {
        this.leadingExecuted = true;
        this.execute();
        return;
      }

      // Clear existing timeout
      if (this.timeoutId !== null) {
        clearTimeout(this.timeoutId);
      }

      // Set new timeout for trailing edge
      this.timeoutId = setTimeout(() => {
        this.execute();
      }, this.options.wait);

      // Set maxWait timeout if configured and not already set
      if (this.options.maxWait !== undefined && this.maxWaitTimeoutId === null) {
        this.maxWaitTimeoutId = setTimeout(() => {
          this.execute();
        }, this.options.maxWait);
      }
    });
  }

  /**
   * Immediately execute any pending debounced call.
   */
  async flush(): Promise<void> {
    if (this.lastArgs !== null) {
      this.execute();
    }
  }

  /**
   * Cancel any pending execution.
   */
  cancel(): void {
    this.clearTimeouts();
    this.lastArgs = null;
    this.leadingExecuted = false;
    
    // Reject all pending promises
    const error = new Error('Debounced call cancelled');
    for (const { reject } of this.pendingPromises) {
      reject(error);
    }
    this.pendingPromises = [];
  }

  /**
   * Check if there's a pending execution.
   */
  get pending(): boolean {
    return this.lastArgs !== null;
  }

  private execute(): void {
    this.clearTimeouts();

    const args = this.lastArgs;
    const promises = [...this.pendingPromises];
    
    this.lastArgs = null;
    this.pendingPromises = [];
    this.leadingExecuted = false;

    if (args === null) return;

    try {
      const result = this.fn(...args);
      
      // Handle async functions
      if (result instanceof Promise) {
        result
          .then((value) => {
            for (const { resolve } of promises) {
              resolve(value as ReturnType<T>);
            }
          })
          .catch((error) => {
            for (const { reject } of promises) {
              reject(error);
            }
          });
      } else {
        for (const { resolve } of promises) {
          resolve(result as ReturnType<T>);
        }
      }
    } catch (error) {
      for (const { reject } of promises) {
        reject(error);
      }
    }
  }

  private clearTimeouts(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.maxWaitTimeoutId !== null) {
      clearTimeout(this.maxWaitTimeoutId);
      this.maxWaitTimeoutId = null;
    }
  }
}

/**
 * Create a debounced version of a function.
 */
export function debounce<T extends AnyFunction>(
  fn: T,
  options: DebouncerOptions
): Debouncer<T> {
  return new Debouncer(fn, options);
}

/**
 * Console handler plugin for development/debugging.
 * Logs feedback items to the console.
 */

import type { FeedbackItem } from '../../types/feedback.js';
import type { HandlerPlugin } from '../../types/plugins.js';

export interface ConsoleHandlerOptions {
  /** Log level to use */
  level?: 'log' | 'info' | 'debug';
  /** Whether to pretty-print the output */
  pretty?: boolean;
  /** Custom prefix for log messages */
  prefix?: string;
}

/**
 * Console handler that logs feedback items for debugging.
 * 
 * @example
 * ```typescript
 * collector.use(new ConsoleHandler({ pretty: true }));
 * ```
 */
export class ConsoleHandler<T = unknown> implements HandlerPlugin<T> {
  readonly name = 'console-handler';
  readonly type = 'handler' as const;

  private readonly options: Required<ConsoleHandlerOptions>;

  constructor(options: ConsoleHandlerOptions = {}) {
    this.options = {
      level: options.level ?? 'log',
      pretty: options.pretty ?? true,
      prefix: options.prefix ?? '[Feedback]',
    };
  }

  handle(item: FeedbackItem<T>): void {
    const { level, pretty, prefix } = this.options;
    const output = pretty ? JSON.stringify(item, null, 2) : JSON.stringify(item);
    console[level](`${prefix} ${item.type}:`, output);
  }
}

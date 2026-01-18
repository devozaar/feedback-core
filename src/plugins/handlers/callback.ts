/**
 * Callback handler plugin for custom integrations.
 * Executes a callback function for each feedback item.
 */

import type { FeedbackItem } from '../../types/feedback.js';
import type { HandlerPlugin } from '../../types/plugins.js';

/**
 * Callback function type for the callback handler.
 */
export type FeedbackCallback<T = unknown> = (
  item: FeedbackItem<T>
) => void | Promise<void>;

/**
 * Callback handler that executes a custom function for each feedback item.
 * 
 * @example
 * ```typescript
 * collector.use(new CallbackHandler(async (item) => {
 *   await fetch('/api/feedback', {
 *     method: 'POST',
 *     body: JSON.stringify(item),
 *   });
 * }));
 * ```
 */
export class CallbackHandler<T = unknown> implements HandlerPlugin<T> {
  readonly name: string;
  readonly type = 'handler' as const;

  constructor(
    private readonly callback: FeedbackCallback<T>,
    name = 'callback-handler'
  ) {
    this.name = name;
  }

  async handle(item: FeedbackItem<T>): Promise<void> {
    await this.callback(item);
  }
}

/**
 * Create a callback handler with a custom name.
 */
export function createCallbackHandler<T>(
  callback: FeedbackCallback<T>,
  name?: string
): CallbackHandler<T> {
  return new CallbackHandler(callback, name);
}

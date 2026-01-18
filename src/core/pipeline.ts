/**
 * Plugin pipeline orchestration.
 * Manages the execution of validators, transformers, and handlers.
 */

import type { FeedbackItem, ValidationResult } from '../types/feedback.js';
import type {
  FeedbackPlugin,
  ValidatorPlugin,
  TransformerPlugin,
  HandlerPlugin,
} from '../types/plugins.js';
import { isValidatorPlugin, isTransformerPlugin, isHandlerPlugin } from '../types/plugins.js';
import { PluginError } from '../utils/errors.js';

/**
 * Plugin registry for organizing plugins by type.
 */
export interface PluginRegistry<T = unknown> {
  validators: ValidatorPlugin<T>[];
  transformers: TransformerPlugin<T, unknown>[];
  handlers: HandlerPlugin<unknown>[];
}

/**
 * Create an empty plugin registry.
 */
export function createPluginRegistry<T>(): PluginRegistry<T> {
  return {
    validators: [],
    transformers: [],
    handlers: [],
  };
}

/**
 * Register a plugin in the registry.
 */
export function registerPlugin<T>(
  registry: PluginRegistry<T>,
  plugin: FeedbackPlugin<T>
): void {
  if (isValidatorPlugin(plugin)) {
    registry.validators.push(plugin);
  } else if (isTransformerPlugin(plugin)) {
    registry.transformers.push(plugin as TransformerPlugin<T, unknown>);
  } else if (isHandlerPlugin(plugin)) {
    registry.handlers.push(plugin as HandlerPlugin<unknown>);
  }
}

/**
 * Run all validators on the data.
 * @returns Combined validation result
 */
export async function runValidators<T>(
  validators: ValidatorPlugin<T>[],
  data: T
): Promise<ValidationResult> {
  const allErrors: string[] = [];

  for (const validator of validators) {
    try {
      const result = await validator.validate(data);
      if (!result.valid) {
        allErrors.push(...result.errors);
      }
    } catch (error) {
      throw new PluginError(
        validator.name,
        'validate',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Run all transformers on the feedback item.
 * Transformers are run sequentially, each receiving the output of the previous.
 */
export async function runTransformers<T>(
  transformers: TransformerPlugin<unknown, unknown>[],
  item: FeedbackItem<T>
): Promise<FeedbackItem<unknown>> {
  let current: FeedbackItem<unknown> = item;

  for (const transformer of transformers) {
    try {
      current = await transformer.transform(current);
    } catch (error) {
      throw new PluginError(
        transformer.name,
        'transform',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  return current;
}

/**
 * Run all handlers on the feedback item.
 * Handlers are run in parallel by default.
 */
export async function runHandlers<T>(
  handlers: HandlerPlugin<T>[],
  item: FeedbackItem<T>,
  options: { parallel?: boolean } = { parallel: true }
): Promise<void> {
  const runHandler = async (handler: HandlerPlugin<T>) => {
    try {
      await handler.handle(item);
    } catch (error) {
      throw new PluginError(
        handler.name,
        'handle',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  };

  if (options.parallel) {
    await Promise.all(handlers.map(runHandler));
  } else {
    for (const handler of handlers) {
      await runHandler(handler);
    }
  }
}

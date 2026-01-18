/**
 * Main FeedbackCollector class.
 * The primary entry point for the feedback collection library.
 */

import type { ZodType } from 'zod';
import type {
  FeedbackItem,
  FeedbackMetadata,
  ValidationResult,
  CollectionContext,
} from '../types/feedback.js';
import type { FeedbackPlugin, HandlerPlugin } from '../types/plugins.js';
import type {
  BeforeCollectHook,
  AfterCollectHook,
  ErrorHook,
  RetryHook,
  HookRegistry,
} from '../types/hooks.js';
import type { CollectorConfig } from '../types/config.js';
import { generateId } from '../utils/id.js';
import {
  ValidationError,
  CollectionCancelledError,
  PluginError,
} from '../utils/errors.js';
import { Debouncer } from './debouncer.js';
import { withRetry } from './retry.js';
import {
  createPluginRegistry,
  registerPlugin,
  runValidators,
  runTransformers,
  runHandlers,
  type PluginRegistry,
} from './pipeline.js';
import { validateWithSchema, createZodValidator } from './schema.js';

type CollectorFunction<T> = (data: T, metadata?: Partial<FeedbackMetadata>) => Promise<FeedbackItem<T>>;

/**
 * Framework-agnostic, headless feedback collector.
 * 
 * @template T - The type of feedback data this collector handles
 * 
 * @example
 * ```typescript
 * import { FeedbackCollector } from '@devozaar/feedback-core';
 * import { z } from 'zod';
 * 
 * const schema = z.object({ score: z.number().min(0).max(10) });
 * const collector = new FeedbackCollector({ type: 'nps', schema });
 * 
 * await collector.collect({ score: 9 });
 * ```
 */
export class FeedbackCollector<T = unknown> {
  private readonly config: CollectorConfig<T>;
  private readonly plugins: PluginRegistry<T>;
  private readonly hooks: HookRegistry<T>;
  private debouncer: Debouncer<CollectorFunction<T>> | null = null;

  constructor(config: CollectorConfig<T>) {
    this.config = config;
    this.plugins = createPluginRegistry<T>();
    this.hooks = {
      beforeCollect: [],
      afterCollect: [],
      error: [],
      retry: [],
    };

    // Set up debouncer if configured
    if (config.debounce && config.debounce.wait > 0) {
      const boundExecute = this.executeCollection.bind(this) as CollectorFunction<T>;
      this.debouncer = new Debouncer(
        boundExecute,
        {
          wait: config.debounce.wait,
          maxWait: config.debounce.maxWait,
          leading: config.debounce.leading,
        }
      );
    }

    // Add Zod schema validator if provided
    if (config.schema) {
      this.use(createZodValidator(config.schema) as FeedbackPlugin<T>);
    }
  }

  /**
   * Register a plugin with this collector.
   * @param plugin - The plugin to register
   * @returns this for chaining
   */
  use(plugin: FeedbackPlugin<T>): this {
    registerPlugin(this.plugins, plugin);
    
    // Call install hook if present
    if (plugin.install) {
      try {
        plugin.install(this);
      } catch (error) {
        throw new PluginError(
          plugin.name,
          'install',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }

    return this;
  }

  /**
   * Add a Zod schema for validation.
   * @param schema - The Zod schema to use
   * @returns this for chaining
   */
  withSchema<S extends ZodType<T>>(schema: S): this {
    this.use(createZodValidator(schema) as FeedbackPlugin<T>);
    return this;
  }

  /**
   * Register a before-collect hook.
   * @param hook - Hook called before collection
   * @returns this for chaining
   */
  onBeforeCollect(hook: BeforeCollectHook<T>): this {
    this.hooks.beforeCollect.push(hook);
    return this;
  }

  /**
   * Register an after-collect hook.
   * @param hook - Hook called after successful collection
   * @returns this for chaining
   */
  onAfterCollect(hook: AfterCollectHook<T>): this {
    this.hooks.afterCollect.push(hook);
    return this;
  }

  /**
   * Register an error hook.
   * @param hook - Hook called when an error occurs
   * @returns this for chaining
   */
  onError(hook: ErrorHook): this {
    this.hooks.error.push(hook);
    return this;
  }

  /**
   * Register a retry hook.
   * @param hook - Hook called on each retry attempt
   * @returns this for chaining
   */
  onRetry(hook: RetryHook): this {
    this.hooks.retry.push(hook);
    return this;
  }

  /**
   * Validate data without collecting.
   * @param data - The data to validate
   * @returns Validation result
   */
  async validate(data: T): Promise<ValidationResult> {
    // Run schema validation if configured
    if (this.config.schema) {
      const schemaResult = validateWithSchema(this.config.schema, data);
      if (!schemaResult.valid) {
        return schemaResult;
      }
    }

    // Run plugin validators
    return runValidators(this.plugins.validators, data);
  }

  /**
   * Collect feedback data.
   * This is the main method for submitting feedback.
   * 
   * @param data - The feedback data to collect
   * @param metadata - Optional metadata to include
   * @returns The collected feedback item
   * @throws ValidationError if validation fails
   * @throws CollectionCancelledError if cancelled by a hook
   */
  async collect(
    data: T,
    metadata?: Partial<FeedbackMetadata>
  ): Promise<FeedbackItem<T>> {
    // Use debouncer if configured
    if (this.debouncer) {
      return this.debouncer.call(data, metadata);
    }

    return this.executeCollection(data, metadata);
  }

  /**
   * Force flush any pending debounced collections.
   */
  async flush(): Promise<void> {
    if (this.debouncer) {
      await this.debouncer.flush();
    }
  }

  /**
   * Cancel any pending debounced collections.
   */
  cancel(): void {
    if (this.debouncer) {
      this.debouncer.cancel();
    }
  }

  /**
   * Get the feedback type this collector handles.
   */
  get type(): string {
    return this.config.type;
  }

  /**
   * Internal method to execute the collection pipeline.
   */
  private async executeCollection(
    data: T,
    metadata?: Partial<FeedbackMetadata>
  ): Promise<FeedbackItem<T>> {
    const timestamp = Date.now();
    const mergedMetadata: FeedbackMetadata = {
      ...this.config.defaultMetadata,
      ...metadata,
    };

    const context: CollectionContext<T> = {
      type: this.config.type,
      data,
      metadata: mergedMetadata,
      timestamp,
    };

    try {
      // Run before-collect hooks
      for (const hook of this.hooks.beforeCollect) {
        const result = await hook(context);
        if (result === false) {
          throw new CollectionCancelledError('Cancelled by beforeCollect hook');
        }
      }

      // Validate
      const validationResult = await this.validate(data);
      if (!validationResult.valid) {
        throw new ValidationError(validationResult.errors);
      }

      // Create feedback item
      let item: FeedbackItem<T> = {
        id: generateId(),
        type: this.config.type,
        data,
        metadata: mergedMetadata,
        timestamp,
      };

      // Run transformers
      if (this.plugins.transformers.length > 0) {
        const transformed = await runTransformers(
          this.plugins.transformers as Parameters<typeof runTransformers>[0],
          item as FeedbackItem<unknown>
        );
        item = transformed as FeedbackItem<T>;
      }

      // Run handlers (with retry if configured)
      if (this.plugins.handlers.length > 0) {
        await this.runHandlersWithRetry(item);
      }

      // Run after-collect hooks
      for (const hook of this.hooks.afterCollect) {
        await hook(item);
      }

      return item;
    } catch (error) {
      // Run error hooks
      const phase = this.getErrorPhase(error);
      for (const hook of this.hooks.error) {
        await hook(
          error instanceof Error ? error : new Error(String(error)),
          phase ? { phase } : undefined
        );
      }
      throw error;
    }
  }

  /**
   * Run handlers with retry logic if configured.
   */
  private async runHandlersWithRetry(item: FeedbackItem<T>): Promise<void> {
    const handlersToRun = async () => {
      await runHandlers(
        this.plugins.handlers as HandlerPlugin<T>[],
        item
      );
    };

    if (this.config.retry) {
      await withRetry(handlersToRun, {
        ...this.config.retry,
        onRetry: async (attempt, error, nextDelay) => {
          for (const hook of this.hooks.retry) {
            await hook(attempt, error, nextDelay);
          }
        },
      });
    } else {
      await handlersToRun();
    }
  }

  /**
   * Determine the phase where an error occurred.
   */
  private getErrorPhase(
    error: unknown
  ): 'validation' | 'collection' | 'transform' | 'handler' | undefined {
    if (error instanceof ValidationError) {
      return 'validation';
    }
    if (error instanceof PluginError) {
      if (error.phase === 'validate') return 'validation';
      if (error.phase === 'transform') return 'transform';
      if (error.phase === 'handle') return 'handler';
    }
    return undefined;
  }
}

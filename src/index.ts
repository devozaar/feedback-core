/**
 * @devozaar/feedback-core
 * 
 * A framework-agnostic, headless TypeScript library for collecting feedback.
 * 
 * @packageDocumentation
 */

// Core
export { FeedbackCollector } from './core/collector.js';
export { Debouncer, debounce } from './core/debouncer.js';
export { withRetry, createRetryWrapper } from './core/retry.js';
export { validateWithSchema, createZodValidator } from './core/schema.js';
export {
  createPluginRegistry,
  registerPlugin,
  runValidators,
  runTransformers,
  runHandlers,
} from './core/pipeline.js';

// Types - Feedback
export type {
  FeedbackItem,
  FeedbackMetadata,
  ValidationResult,
  CollectionContext,
} from './types/feedback.js';

// Types - Plugins
export type {
  FeedbackPlugin,
  ValidatorPlugin,
  TransformerPlugin,
  HandlerPlugin,
} from './types/plugins.js';
export {
  isValidatorPlugin,
  isTransformerPlugin,
  isHandlerPlugin,
} from './types/plugins.js';

// Types - Hooks
export type {
  BeforeCollectHook,
  AfterCollectHook,
  ErrorHook,
  RetryHook,
  HookRegistry,
} from './types/hooks.js';

// Types - Config
export type {
  CollectorConfig,
  DebounceConfig,
  RetryConfig,
} from './types/config.js';
export { DEFAULT_RETRY_CONFIG } from './types/config.js';

// Built-in Plugins - Handlers
export { ConsoleHandler } from './plugins/handlers/console.js';
export type { ConsoleHandlerOptions } from './plugins/handlers/console.js';

export { MemoryHandler } from './plugins/handlers/memory.js';
export type { MemoryHandlerOptions } from './plugins/handlers/memory.js';

export { CallbackHandler, createCallbackHandler } from './plugins/handlers/callback.js';
export type { FeedbackCallback } from './plugins/handlers/callback.js';

// Utilities
export { generateId, generateShortId } from './utils/id.js';
export {
  FeedbackError,
  ValidationError,
  PluginError,
  CollectionCancelledError,
  RetryExhaustedError,
} from './utils/errors.js';

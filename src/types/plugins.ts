/**
 * Plugin interfaces for extending the feedback collector.
 */

import type { FeedbackItem, ValidationResult } from './feedback.js';
import type { FeedbackCollector } from '../core/collector.js';

/**
 * Base plugin interface that all plugins must implement.
 * @template T - The type of feedback data this plugin handles
 */
export interface FeedbackPlugin<T = unknown> {
  /** Unique name for this plugin */
  name: string;
  /** Type of plugin: validator, transformer, or handler */
  type: 'validator' | 'transformer' | 'handler';
  /** Called when plugin is registered with a collector */
  install?(collector: FeedbackCollector<T>): void;
  /** Called when plugin is removed from a collector */
  uninstall?(collector: FeedbackCollector<T>): void;
}

/**
 * Plugin that validates feedback data before collection.
 * @template T - The type of feedback data to validate
 */
export interface ValidatorPlugin<T = unknown> extends FeedbackPlugin<T> {
  type: 'validator';
  /** Validate the feedback data */
  validate(data: T): ValidationResult | Promise<ValidationResult>;
}

/**
 * Plugin that transforms feedback items during the collection pipeline.
 * @template T - Input feedback data type
 * @template U - Output feedback data type (default: same as input)
 */
export interface TransformerPlugin<T = unknown, U = T> extends FeedbackPlugin<T> {
  type: 'transformer';
  /** Transform the feedback item */
  transform(item: FeedbackItem<T>): FeedbackItem<U> | Promise<FeedbackItem<U>>;
}

/**
 * Plugin that handles collected feedback items (e.g., sending to API, logging).
 * @template T - The type of feedback data to handle
 */
export interface HandlerPlugin<T = unknown> extends FeedbackPlugin<T> {
  type: 'handler';
  /** Handle the collected feedback item */
  handle(item: FeedbackItem<T>): void | Promise<void>;
}

/**
 * Type guard to check if a plugin is a ValidatorPlugin.
 */
export function isValidatorPlugin<T>(plugin: FeedbackPlugin<T>): plugin is ValidatorPlugin<T> {
  return plugin.type === 'validator';
}

/**
 * Type guard to check if a plugin is a TransformerPlugin.
 */
export function isTransformerPlugin<T>(plugin: FeedbackPlugin<T>): plugin is TransformerPlugin<T> {
  return plugin.type === 'transformer';
}

/**
 * Type guard to check if a plugin is a HandlerPlugin.
 */
export function isHandlerPlugin<T>(plugin: FeedbackPlugin<T>): plugin is HandlerPlugin<T> {
  return plugin.type === 'handler';
}

/**
 * Core feedback types for the feedback collection library.
 */

/**
 * Metadata associated with a feedback item.
 * Can be extended with custom properties.
 */
export interface FeedbackMetadata {
  /** Unique session identifier */
  sessionId?: string;
  /** User identifier */
  userId?: string;
  /** Source of the feedback (e.g., 'web', 'mobile', 'api') */
  source?: string;
  /** Allow additional custom properties */
  [key: string]: unknown;
}

/**
 * A collected feedback item with full metadata.
 * @template T - The type of the feedback data payload
 */
export interface FeedbackItem<T = unknown> {
  /** Unique identifier for this feedback item */
  id: string;
  /** Type/category of feedback (e.g., 'nps', 'rating', 'survey') */
  type: string;
  /** The actual feedback data */
  data: T;
  /** Associated metadata */
  metadata: FeedbackMetadata;
  /** Unix timestamp when feedback was collected */
  timestamp: number;
}

/**
 * Result of a validation operation.
 */
export interface ValidationResult {
  /** Whether the validation passed */
  valid: boolean;
  /** List of validation error messages */
  errors: string[];
}

/**
 * Context passed to hooks during the collection lifecycle.
 */
export interface CollectionContext<T = unknown> {
  /** The feedback type */
  type: string;
  /** Original data being collected */
  data: T;
  /** Metadata for this collection */
  metadata: FeedbackMetadata;
  /** Timestamp of collection */
  timestamp: number;
}

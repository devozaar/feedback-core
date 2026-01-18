/**
 * Zod schema integration for validation.
 */

import type { ZodType, ZodError } from 'zod';
import type { ValidationResult } from '../types/feedback.js';

/**
 * Validate data against a Zod schema.
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns Validation result with errors if any
 */
export function validateWithSchema<T>(
  schema: ZodType<T>,
  data: unknown
): ValidationResult {
  const result = schema.safeParse(data);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  // Extract error messages from Zod error
  const errors = formatZodErrors(result.error);
  return { valid: false, errors };
}

/**
 * Format Zod errors into readable strings.
 */
function formatZodErrors(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
    return `${path}${issue.message}`;
  });
}

/**
 * Create a validator plugin from a Zod schema.
 * @param schema - The Zod schema to use for validation
 * @param name - Optional name for the validator plugin
 */
export function createZodValidator<T>(
  schema: ZodType<T>,
  name = 'zod-validator'
): import('../types/plugins.js').ValidatorPlugin<T> {
  return {
    name,
    type: 'validator',
    validate: (data: T) => validateWithSchema(schema, data),
  };
}

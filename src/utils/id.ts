/**
 * ID generation utilities.
 * Uses crypto.randomUUID when available, falls back to custom implementation.
 */

/**
 * Generate a unique ID for feedback items.
 * Uses native crypto.randomUUID() for best entropy.
 */
export function generateId(): string {
  // Use native crypto.randomUUID if available (Node 19+, modern browsers)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback: Generate a UUID v4-like string
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a short ID (useful for session IDs).
 */
export function generateShortId(length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

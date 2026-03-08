// Fingerprinting — deduplicates errors within a session
// Generates stable fingerprints for error deduplication and frequency tracking.

import { simpleHash } from '../hash.js';

/**
 * Generate a stable fingerprint for an error.
 * Same error type + message + location = same fingerprint.
 *
 * @param {{ type: string, message: string, file?: string, line?: number }} error
 * @returns {string} Fingerprint hash
 */
export function fingerprint(error) {
  const input = `${error.type}:${error.message}:${error.file || ''}:${error.line || ''}`;
  return simpleHash(input);
}

/**
 * Deduplicate an array of errors, keeping the richest version of each.
 * @param {object[]} errors - Array of parsed errors
 * @returns {object[]} Deduplicated errors
 */
export function deduplicateErrors(errors) {
  const seen = new Map();
  for (const error of errors) {
    const fp = fingerprint(error);
    const existing = seen.get(fp);
    if (!existing || (error.rawLines?.length || 0) > (existing.rawLines?.length || 0)) {
      seen.set(fp, { ...error, fingerprint: fp });
    }
  }
  return Array.from(seen.values());
}


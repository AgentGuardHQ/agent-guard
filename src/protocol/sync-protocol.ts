// Shared WebSocket sync protocol constants
// Used by both CLI sync-server and browser sync client.

export const SYNC_PORT = 9876;

export const MSG_PULL_CLI_STATE = 'pull_cli_state';
export const MSG_BROWSER_STATE = 'browser_state';
export const MSG_PONG = 'pong';

export const MSG_CLI_STATE = 'cli_state';
export const MSG_CLI_EVENT = 'cli_event';
export const MSG_PING = 'ping';

export const PING_INTERVAL = 15000;
export const RECONNECT_INTERVAL = 5000;
export const MAX_RECONNECT_ATTEMPTS = 12;

// Protocol version — bump when message format changes
export const PROTOCOL_VERSION = 2;

/**
 * Monotonic sequence counter for message ordering.
 * Each side maintains its own counter; receivers detect out-of-order delivery.
 */
let _seq = 0;
export function nextSeq(): number {
  return ++_seq;
}
export function resetSeq(): void {
  _seq = 0;
}

/**
 * Field-level timestamp for last-write-wins conflict resolution.
 * Each mutable field carries the timestamp of its last update.
 */
export interface TimestampedField<T> {
  value: T;
  updatedAt: number;
}

/**
 * Merge two timestamped fields using last-write-wins.
 * Returns the field with the more recent timestamp.
 */
export function mergeField<T>(
  local: TimestampedField<T>,
  remote: TimestampedField<T>,
): TimestampedField<T> {
  return remote.updatedAt > local.updatedAt ? remote : local;
}

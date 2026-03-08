// Browser-side sync client
// Connects to the local BugMon sync server (started via `bugmon sync`)
// Uses WebSocket for real-time bidirectional sync between CLI and browser

import {
  SYNC_PORT,
  RECONNECT_INTERVAL,
  MAX_RECONNECT_ATTEMPTS,
  MSG_PULL_CLI_STATE,
  MSG_BROWSER_STATE,
  MSG_PONG,
  MSG_CLI_STATE,
  MSG_CLI_EVENT,
  MSG_PING,
} from '../../ecosystem/sync-protocol.js';

const SYNC_URL = `ws://localhost:${SYNC_PORT}`;

let ws = null;
let connected = false;
let reconnectAttempts = 0;
let reconnectTimer = null;
let onSyncCallback = null;

/**
 * Initialize the sync client. Attempts to connect to the local sync server.
 * Silently fails if no server is running (normal for standalone browser play).
 * @param {function} [onSync] - Callback when CLI state is received
 */
export function initSyncClient(onSync) {
  onSyncCallback = onSync || null;
  attemptConnection();
}

/**
 * Get current sync status.
 */
export function getSyncStatus() {
  return {
    connected,
    serverUrl: SYNC_URL,
    reconnectAttempts,
    hint: connected ? 'Synced with CLI' : 'Not connected. Run "bugmon sync" in your terminal.',
  };
}

/**
 * Push browser state to the CLI sync server.
 * @param {object} state - Browser game state to send
 */
export function pushToCLI(state) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  try {
    ws.send(JSON.stringify({ type: MSG_BROWSER_STATE, data: state }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Request the latest CLI state from the sync server.
 */
export function pullFromCLI() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  try {
    ws.send(JSON.stringify({ type: MSG_PULL_CLI_STATE }));
    return true;
  } catch {
    return false;
  }
}

function attemptConnection() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;

  try {
    ws = new WebSocket(SYNC_URL);
  } catch {
    // WebSocket constructor can throw if URL is invalid in some environments
    return;
  }

  ws.onopen = () => {
    connected = true;
    reconnectAttempts = 0;
    console.log('[BugMon Sync] Connected to CLI sync server');

    // Request initial CLI state on connect
    pullFromCLI();
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleMessage(msg);
    } catch {
      // Ignore malformed messages
    }
  };

  ws.onclose = () => {
    if (connected) {
      console.log('[BugMon Sync] Disconnected from CLI sync server');
    }
    connected = false;
    ws = null;
    scheduleReconnect();
  };

  ws.onerror = () => {
    // Silently handle — onclose will fire after this
  };
}

function handleMessage(msg) {
  switch (msg.type) {
    case MSG_CLI_STATE: {
      // CLI sent its state — import it
      console.log('[BugMon Sync] Received CLI state');
      if (onSyncCallback) {
        onSyncCallback(msg.data);
      } else {
        // Use the global bugmon API to import
        if (window.bugmon?.importFromCLI) {
          window.bugmon.importFromCLI(msg.data);
        }
      }
      break;
    }
    case MSG_CLI_EVENT: {
      // Real-time CLI event (e.g., new encounter, new cache)
      console.log(`[BugMon Sync] CLI event: ${msg.event}`);
      if (msg.event === 'bugmon_cached' && window.bugmon?.importFromCLI) {
        window.bugmon.importFromCLI(msg.data);
      }
      break;
    }
    case MSG_PING: {
      ws.send(JSON.stringify({ type: MSG_PONG }));
      break;
    }
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectAttempts++;

  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    // Stop trying — user probably isn't running the sync server
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    attemptConnection();
  }, RECONNECT_INTERVAL);
}

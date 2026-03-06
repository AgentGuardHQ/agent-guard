// BugMon Sync Server — bridges CLI and browser game
// Uses Node.js built-in http + WebSocket (no external dependencies)
//
// Protocol:
//   Browser connects via WebSocket to ws://localhost:9876
//   Messages are JSON: { type: string, data?: any, event?: string }
//
// Message types:
//   browser → server:
//     { type: 'pull_cli_state' }           Request CLI BugDex state
//     { type: 'browser_state', data: {} }  Push browser state to CLI
//     { type: 'pong' }                     Keepalive response
//
//   server → browser:
//     { type: 'cli_state', data: {} }      CLI BugDex state
//     { type: 'cli_event', event, data }   Real-time CLI event notification
//     { type: 'ping' }                     Keepalive check

import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { loadBugDex, saveBugDex } from '../bugdex/bugdex.js';

const PORT = 9876;
const WS_MAGIC = '258EAFA5-E914-47DA-95CA-5AB9FE82957E';
const PING_INTERVAL = 15000;

/**
 * Start the sync server.
 * @returns {Promise<{server: import('http').Server, broadcast: function, stop: function}>}
 */
export function startSyncServer() {
  const clients = new Set();

  const server = createServer((req, res) => {
    // CORS headers for browser fetch (fallback HTTP API)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/api/state' && req.method === 'GET') {
      // HTTP fallback: get CLI state
      const state = getCLIState();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(state));
      return;
    }

    if (req.url === '/api/state' && req.method === 'POST') {
      // HTTP fallback: receive browser state
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const browserState = JSON.parse(body);
          mergeBrowserState(browserState);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch {
          res.writeHead(400);
          res.end('Invalid JSON');
        }
      });
      return;
    }

    if (req.url === '/api/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        server: 'bugmon-sync',
        version: 1,
        clients: clients.size,
        uptime: process.uptime(),
      }));
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  // WebSocket upgrade handler (raw implementation, no ws package)
  server.on('upgrade', (req, socket) => {
    if (req.headers.upgrade?.toLowerCase() !== 'websocket') {
      socket.destroy();
      return;
    }

    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }

    // Complete WebSocket handshake
    const accept = createHash('sha1')
      .update(key + WS_MAGIC)
      .digest('base64');

    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n` +
      '\r\n'
    );

    const client = { socket, alive: true };
    clients.add(client);

    process.stderr.write(`  \x1b[32m✓\x1b[0m Browser connected (${clients.size} client${clients.size > 1 ? 's' : ''})\n`);

    // Send initial CLI state
    sendToClient(client, { type: 'cli_state', data: getCLIState() });

    socket.on('data', (buffer) => {
      const frames = decodeFrames(buffer);
      for (const frame of frames) {
        if (frame.opcode === 0x8) {
          // Close frame
          clients.delete(client);
          socket.end();
          return;
        }
        if (frame.opcode === 0xA) {
          // Pong
          client.alive = true;
          continue;
        }
        if (frame.opcode === 0x1 && frame.payload) {
          // Text frame
          try {
            const msg = JSON.parse(frame.payload);
            handleClientMessage(client, msg, clients);
          } catch { /* ignore malformed */ }
        }
      }
    });

    socket.on('close', () => {
      clients.delete(client);
      process.stderr.write(`  \x1b[33m⚡\x1b[0m Browser disconnected (${clients.size} client${clients.size > 1 ? 's' : ''})\n`);
    });

    socket.on('error', () => {
      clients.delete(client);
    });
  });

  // Keepalive ping
  const pingTimer = setInterval(() => {
    for (const client of clients) {
      if (!client.alive) {
        clients.delete(client);
        client.socket.destroy();
        continue;
      }
      client.alive = false;
      sendToClient(client, { type: 'ping' });
    }
  }, PING_INTERVAL);

  return new Promise((resolve, reject) => {
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${PORT} already in use. Is another sync server running?`));
      } else {
        reject(err);
      }
    });

    server.listen(PORT, '127.0.0.1', () => {
      resolve({
        server,
        port: PORT,
        clients,
        broadcast: (msg) => {
          for (const client of clients) {
            sendToClient(client, msg);
          }
        },
        stop: () => {
          clearInterval(pingTimer);
          for (const client of clients) {
            client.socket.destroy();
          }
          clients.clear();
          server.close();
        },
      });
    });
  });
}

function handleClientMessage(client, msg, clients) {
  switch (msg.type) {
    case 'pull_cli_state': {
      sendToClient(client, { type: 'cli_state', data: getCLIState() });
      break;
    }
    case 'browser_state': {
      if (msg.data) {
        mergeBrowserState(msg.data);
        process.stderr.write('  \x1b[36m↓\x1b[0m Received browser state\n');
      }
      break;
    }
    case 'pong': {
      client.alive = true;
      break;
    }
  }
}

/**
 * Get CLI state (BugDex) for sending to browser.
 */
function getCLIState() {
  const dex = loadBugDex();
  return {
    party: dex.party || [],
    storage: dex.storage || [],
    seen: dex.seen || {},
    stats: dex.stats || {},
    encounters: (dex.encounters || []).slice(-20), // Last 20 encounters
  };
}

/**
 * Merge browser state into CLI BugDex.
 */
function mergeBrowserState(browserState) {
  if (!browserState) return;
  const dex = loadBugDex();

  // Merge seen — take higher counts
  if (browserState.bugdex?.seen) {
    for (const [id, count] of Object.entries(browserState.bugdex.seen)) {
      dex.seen[id] = Math.max(dex.seen[id] || 0, count);
    }
  }

  // Merge storage
  if (browserState.bugdex?.storage) {
    if (!dex.storage) dex.storage = [];
    const existingIds = new Set(dex.storage.map(m => `${m.id}`));
    for (const mon of browserState.bugdex.storage) {
      if (!existingIds.has(`${mon.id}`)) {
        dex.storage.push(mon);
      }
    }
  }

  // Merge stats — take higher values
  if (browserState.bugdex?.stats) {
    const bs = browserState.bugdex.stats;
    dex.stats.totalEncounters = Math.max(dex.stats.totalEncounters || 0, bs.totalEncounters || 0);
    dex.stats.totalCached = Math.max(dex.stats.totalCached || dex.stats.totalCaught || 0, bs.totalCached || 0);
    dex.stats.xp = Math.max(dex.stats.xp || 0, bs.xp || 0);
  }

  saveBugDex(dex);
}

// ── WebSocket frame encoding/decoding (RFC 6455) ──

function encodeFrame(data) {
  const payload = Buffer.from(data, 'utf8');
  const len = payload.length;

  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + text opcode
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }

  return Buffer.concat([header, payload]);
}

function decodeFrames(buffer) {
  const frames = [];
  let offset = 0;

  while (offset < buffer.length) {
    if (offset + 2 > buffer.length) break;

    const byte0 = buffer[offset];
    const byte1 = buffer[offset + 1];
    const opcode = byte0 & 0x0F;
    const masked = (byte1 & 0x80) !== 0;
    let payloadLen = byte1 & 0x7F;
    offset += 2;

    if (payloadLen === 126) {
      if (offset + 2 > buffer.length) break;
      payloadLen = buffer.readUInt16BE(offset);
      offset += 2;
    } else if (payloadLen === 127) {
      if (offset + 8 > buffer.length) break;
      payloadLen = Number(buffer.readBigUInt64BE(offset));
      offset += 8;
    }

    let maskKey = null;
    if (masked) {
      if (offset + 4 > buffer.length) break;
      maskKey = buffer.slice(offset, offset + 4);
      offset += 4;
    }

    if (offset + payloadLen > buffer.length) break;

    let payload = buffer.slice(offset, offset + payloadLen);
    if (masked && maskKey) {
      payload = Buffer.from(payload);
      for (let i = 0; i < payload.length; i++) {
        payload[i] ^= maskKey[i % 4];
      }
    }

    frames.push({
      opcode,
      payload: opcode === 0x1 ? payload.toString('utf8') : payload,
    });

    offset += payloadLen;
  }

  return frames;
}

function sendToClient(client, msg) {
  try {
    const frame = encodeFrame(JSON.stringify(msg));
    client.socket.write(frame);
  } catch { /* client may have disconnected */ }
}

/**
 * Notify all connected browsers about a CLI event.
 * Call this from the watch adapter when a BugMon is cached.
 * @param {Set} clients
 * @param {string} event
 * @param {object} data
 */
export function notifyBrowsers(broadcast, event, data) {
  broadcast({ type: 'cli_event', event, data: getCLIState() });
}

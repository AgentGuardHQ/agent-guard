// IP whitelisting middleware — restricts access by client IP.
// Supports exact IPs and IPv4 CIDR ranges via ALLOWED_IPS env var.

import type { Context, Next } from 'hono';
import type { ServerConfig } from '../config.js';

interface IpEntry {
  readonly type: 'exact' | 'cidr';
  readonly ip: string;
  readonly mask?: number; // network mask as uint32
  readonly network?: number; // network address as uint32
}

const ipToInt = (ip: string): number => {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
};

function parseEntry(raw: string): IpEntry {
  if (raw.includes('/')) {
    const [base, bits] = raw.split('/');
    const mask = (~0 << (32 - Number(bits))) >>> 0;
    return { type: 'cidr', ip: base, mask, network: ipToInt(base) & mask };
  }
  return { type: 'exact', ip: raw };
}

function matchesEntry(entry: IpEntry, clientIp: string): boolean {
  if (entry.type === 'exact') {
    return entry.ip === clientIp;
  }
  return (ipToInt(clientIp) & entry.mask!) === entry.network!;
}

function extractClientIp(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return c.req.header('x-real-ip') ?? '0.0.0.0';
}

export function ipWhitelist(config: ServerConfig) {
  const entries = config.allowedIps.map(parseEntry);
  const enabled = entries.length > 0;

  return async (c: Context, next: Next) => {
    if (!enabled) {
      return next();
    }

    const clientIp = extractClientIp(c);
    const allowed = entries.some((entry) => matchesEntry(entry, clientIp));

    if (!allowed) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    return next();
  };
}

// Server configuration — parsed from environment variables.

export interface ServerConfig {
  readonly port: number;
  readonly allowedIps: string[];
  readonly apiKey: string | undefined;
  readonly isDev: boolean;
}

export function loadConfig(): ServerConfig {
  const env = process.env;

  return {
    port: env.PORT ? Number(env.PORT) : 3001,
    allowedIps: env.ALLOWED_IPS
      ? env.ALLOWED_IPS.split(',')
          .map((ip) => ip.trim())
          .filter(Boolean)
      : [],
    apiKey: env.API_KEY || undefined,
    isDev: env.NODE_ENV === 'development',
  };
}

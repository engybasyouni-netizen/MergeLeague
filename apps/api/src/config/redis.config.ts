/**
 * Parses REDIS_URL (e.g. redis://:pass@host:6379/0) for BullMQ / ioredis-style options.
 */
export function parseRedisUrl(url?: string): { host: string; port: number; password?: string; username?: string } {
  if (!url) {
    return { host: "127.0.0.1", port: 6379 };
  }
  try {
    const u = new URL(url);
    return {
      host: u.hostname || "127.0.0.1",
      port: u.port ? Number(u.port) : 6379,
      password: u.password ? decodeURIComponent(u.password) : undefined,
      username: u.username ? decodeURIComponent(u.username) : undefined,
    };
  } catch {
    return { host: "127.0.0.1", port: 6379 };
  }
}

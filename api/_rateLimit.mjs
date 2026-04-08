const hits = new Map();

  const CLEANUP_INTERVAL = 5 * 60 * 1000;
  let lastCleanup = Date.now();

  function cleanup(windowMs) {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;
    for (const [key, record] of hits) {
      if (now - record.start > windowMs * 2) hits.delete(key);
    }
  }

  export function rateLimit(req, { windowMs = 60000, max = 60 } = {}) {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "unknown";
    const now = Date.now();

    cleanup(windowMs);

    const record = hits.get(ip);
    if (!record || now - record.start > windowMs) {
      hits.set(ip, { start: now, count: 1 });
      return { limited: false };
    }

    record.count++;
    if (record.count > max) {
      return { limited: true };
    }
    return { limited: false };
  }
  
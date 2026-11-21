// 20 messages per visitor per rolling hour, keyed by a hash of their IP address (the raw IP is never stored).
//
// BEST-EFFORT ONLY: this lives in the function's memory, so it resets on cold starts and isn't shared between
// instances. The browser keeps a matching counter, and the real backstop is the spending cap on Google AI billing.
//
// SWITCHING TO UPSTASH LATER (reliable, shared across instances):
//   1. npm install @upstash/redis   2. add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel
//   3. replace the body of check() with an INCR + EXPIRE on `rl:${key}` (or use @upstash/ratelimit's slidingWindow)
//      and keep the same return shape { ok, remaining, retryAfter }.
import { createHash } from 'node:crypto';

export const LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map(); // key -> array of timestamps

export function visitorKey(request) {
  const ip = request.headers.get('x-real-ip') || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  return createHash('sha256').update('tj-portfolio:' + ip).digest('hex').slice(0, 24);
}

export function check(key, now = Date.now()) {
  const recent = (hits.get(key) || []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) {
    hits.set(key, recent);
    return { ok: false, remaining: 0, retryAfter: Math.ceil((recent[0] + WINDOW_MS - now) / 1000) };
  }
  recent.push(now); hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > WINDOW_MS) hits.delete(k); // tidy up
  return { ok: true, remaining: LIMIT - recent.length, retryAfter: 0 };
}

// Per-visitor limits over a rolling hour, keyed by a hash of their IP address (the raw IP is never stored).
//   chat:    20 questions per hour (check / LIMIT, used by api/chat.js)
//   contact:  3 messages per hour (contactLimit / CONTACT_LIMIT, used by api/contact.js)
//
// BEST-EFFORT ONLY: this lives in the function's memory, so it resets on cold starts and isn't shared between
// instances. The browser keeps a matching counter for chat, Turnstile guards the contact form, and the real backstop
// is the spending cap on Google AI billing (plus Gmail's own daily sending cap).
//
// SWITCHING TO UPSTASH LATER (reliable, shared across instances):
//   1. npm install @upstash/redis   2. add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel
//   3. replace the body of limiter()'s returned function with an INCR + EXPIRE on `rl:${name}:${key}` (or use
//      @upstash/ratelimit's slidingWindow) and keep the same return shape { ok, remaining, retryAfter }.
import { createHash } from 'node:crypto';

const WINDOW_MS = 60 * 60 * 1000;

export function visitorKey(request) {
  const ip = request.headers.get('x-real-ip') || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  return createHash('sha256').update('tj-portfolio:' + ip).digest('hex').slice(0, 24);
}

// a named counter: separate limits never share timestamps
export function limiter(limit, windowMs = WINDOW_MS) {
  const hits = new Map(); // key -> array of timestamps
  const fn = (key, now = Date.now()) => {
    const recent = (hits.get(key) || []).filter(t => now - t < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return { ok: false, remaining: 0, retryAfter: Math.ceil((recent[0] + windowMs - now) / 1000) };
    }
    recent.push(now); hits.set(key, recent);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > windowMs) hits.delete(k); // tidy up
    return { ok: true, remaining: limit - recent.length, retryAfter: 0 };
  };
  fn.reset = () => hits.clear(); // for tests
  return fn;
}

export const LIMIT = 20;
export const check = limiter(LIMIT);

export const CONTACT_LIMIT = 3;
export const contactLimit = limiter(CONTACT_LIMIT);

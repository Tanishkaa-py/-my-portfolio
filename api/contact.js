// /api/contact: the contact workflow (Vercel serverless function, Node runtime). Used by the contact form
// (js/contact.js) and by the assistant's "send this message" card (js/assistant.js).
//
// GET  -> { ready, turnstileSiteKey }   whether the form can send, and the PUBLIC Turnstile site key (or null)
// POST { name, email, topic?, message, website (honeypot), token? (Turnstile), source? }
//   -> 200 { ok, steps: [{ id, label }], failed?, spam?, category?, summary }   the workflow ran (see _lib/workflow.js)
//   -> 400 { ok:false, error:'invalid', fields }      a field needs fixing
//   -> 400 { ok:false, error:'captcha', message }     the Turnstile check didn't pass
//   -> 429 { ok:false, error:'rate', message }        more than 3 messages from this visitor in an hour
//   -> 503 { ok:false, error:'offline', message }     email (or, in production, Turnstile) isn't configured
//
// Environment (server only): GMAIL_USER, GMAIL_APP_PASSWORD, GEMINI_API_KEY (GEMINI_MODEL optional),
// TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY (required in production, optional elsewhere). Nothing is stored.
import { validate, runWorkflow, gmailMailer, BUDGET_MS, TO } from './_lib/workflow.js';
import { contactLimit, visitorKey, CONTACT_LIMIT } from './_lib/ratelimit.js';
import { makeModel, providerOptions, hasKey } from './_lib/gemini.js';

const MESSAGES = {
  offline: `The form is offline right now. Please email Tanishka at ${TO}.`,
  rate: `You've sent ${CONTACT_LIMIT} messages in the last hour, which is the limit. Please try again later, or email ${TO}.`,
  captcha: "We couldn't confirm you're not a bot. Please try again.",
  bad: "Sorry, we couldn't read that message. Please try again."
};

const json = (status, body, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...extra } });

// Turnstile is on when both keys are set. In production it's required: without it the form stays offline.
const turnstile = () => {
  const site = process.env.TURNSTILE_SITE_KEY, secret = process.env.TURNSTILE_SECRET_KEY;
  return { on: !!(site && secret), site, secret, required: process.env.VERCEL_ENV === 'production' };
};
const mailReady = () => !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

export function GET() { return handleConfig(); }
export function POST(request) { return handleContact(request); }

// handleConfig / handleContact take optional fakes so the endpoint can be tested without keys, Gemini or Gmail
export function handleConfig({ mailer } = {}) {
  const ts = turnstile();
  const ready = (!!mailer || mailReady()) && (ts.on || !ts.required);
  return json(200, { ready, turnstileSiteKey: ready && ts.on ? ts.site : null });
}

export async function verifyTurnstile(token, ip, secret) {
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip && ip !== 'unknown') body.set('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body, signal: AbortSignal.timeout(5000) });
    const d = await res.json();
    return d.success === true;
  } catch (err) { console.error('[contact] turnstile check failed:', err?.message || err); return false; }
}

export async function handleContact(request, { model: injectedModel, mailer: injectedMailer, verify = verifyTurnstile } = {}) {
  const startedAt = Date.now();
  const ts = turnstile();
  if (!injectedMailer && !mailReady()) { console.error('[contact] GMAIL_USER / GMAIL_APP_PASSWORD missing'); return json(503, { ok: false, error: 'offline', message: MESSAGES.offline }); }
  if (ts.required && !ts.on) { console.error('[contact] Turnstile keys missing in production'); return json(503, { ok: false, error: 'offline', message: MESSAGES.offline }); }

  let body;
  try {
    const raw = await request.text();
    if (raw.length > 20000) return json(400, { ok: false, error: 'bad', message: MESSAGES.bad });
    body = JSON.parse(raw);
  } catch { return json(400, { ok: false, error: 'bad', message: MESSAGES.bad }); }
  if (!body || typeof body !== 'object') return json(400, { ok: false, error: 'bad', message: MESSAGES.bad });

  const v = validate(body);
  if (v.fields) return json(400, { ok: false, error: 'invalid', fields: v.fields });

  // only valid submissions count towards the limit, so a typo doesn't use one up
  const limit = contactLimit(visitorKey(request));
  if (!limit.ok) return json(429, { ok: false, error: 'rate', message: MESSAGES.rate, retryAfter: limit.retryAfter }, { 'retry-after': String(limit.retryAfter) });

  // honeypot: a hidden field people never see. Bots that fill it get a quiet "spam" answer and nothing is sent.
  if (typeof body.website === 'string' && body.website.trim()) {
    return json(200, { ok: true, spam: true, steps: [{ id: 'received', label: 'Checks passed' }], summary: `This looked like spam, so it wasn't forwarded. If that's a mistake, email ${TO}.` });
  }

  if (ts.on) {
    const ip = request.headers.get('x-real-ip') || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
    if (!(await verify(body.token, ip, ts.secret))) return json(400, { ok: false, error: 'captcha', message: MESSAGES.captcha });
  }

  const model = injectedModel || (hasKey() ? makeModel() : null); // no Gemini key: the message is sent unsorted
  const mailer = injectedMailer || gmailMailer();
  const from = process.env.GMAIL_USER || TO;
  try {
    const result = await runWorkflow(v.data, { model, providerOptions, mailer, from, startedAt });
    console.log('[contact]', JSON.stringify({ via: v.data.source, ok: result.ok, steps: result.steps.map(s => s.id), failed: result.failed || null, spam: !!result.spam, ms: Date.now() - startedAt, budget: BUDGET_MS }));
    return json(200, result);
  } catch (err) {
    console.error('[contact] workflow error:', err?.message || err);
    return json(200, { ok: false, steps: [{ id: 'received', label: 'Checks passed' }], failed: 'notified', summary: `Your message couldn't be delivered just now. Please email Tanishka at ${TO}.` });
  }
}

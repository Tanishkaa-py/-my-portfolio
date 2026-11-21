// POST /api/chat: the "Ask Tanishka's AI" endpoint (Vercel serverless function, Node runtime).
// Request:  { messages: [{ role: 'user' | 'assistant', content: string }], jd?: boolean }
// Response: a stream of JSON lines (NDJSON) the page reads as they arrive:
//   {"t":"step","id","tool","label","detail"}  a tool step started / ran ("How I answered")
//   {"t":"step-done","id","detail"}            that step finished
//   {"t":"text","v":"…"}                       part of the answer
//   {"t":"open","id":"rings"}                  open this project's door and card
//   {"t":"jobfit","requirements":[…],"summary"} job-fit breakdown for the page to show
//   {"t":"error","code","message"}             friendly error
//   {"t":"done","remaining":17}
// GEMINI_API_KEY is read here only and never sent to the browser.
import { streamText, isStepCount } from 'ai';
import { createGoogle } from '@ai-sdk/google';
import { search, loadProfile } from './_lib/profile.js';
import { instructions } from './_lib/prompt.js';
import { makeTools } from './_lib/tools.js';
import { check, visitorKey, LIMIT } from './_lib/ratelimit.js';

// gemini-3.5-flash-lite: answers in ~1-2 s. (In testing, gemini-3.8-flash was overloaded (503) and gemini-3.5-flash
// took over 15 s, so both hit the timeout.) Override with the GEMINI_MODEL environment variable.
const MODEL_ID = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const TIMEOUT_MS = 15000;
const MAX_TURNS = 10, MAX_CHARS = 1500, MAX_JD_CHARS = 6000;

const MESSAGES = {
  offline: "The assistant is offline right now. You can still reach Tanishka at work.tanishkajain@gmail.com.",
  rate: `You've reached the limit of ${LIMIT} questions per hour. Please try again later, or email Tanishka at work.tanishkajain@gmail.com.`,
  timeout: 'That took too long to answer. Please try again, maybe with a shorter question.',
  busy: "The assistant couldn't answer just now. Please try again in a moment.",
  bad: "Sorry, I couldn't read that message. Please try again."
};

const json = (status, body, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra } });

export function POST(request) { return handleChat(request); }

// handleChat takes an optional model so the endpoint can be tested with a mock (no key, no cost); production passes none
export async function handleChat(request, { model: injected } = {}) {
  if (!injected && !process.env.GEMINI_API_KEY) return json(503, { error: 'offline', message: MESSAGES.offline });

  const limit = check(visitorKey(request));
  if (!limit.ok) return json(429, { error: 'rate', message: MESSAGES.rate, retryAfter: limit.retryAfter }, { 'retry-after': String(limit.retryAfter) });

  // validate and trim the conversation: only user/assistant turns, capped in number and length (system turns are dropped)
  let body; try { body = await request.json(); } catch { return json(400, { error: 'bad', message: MESSAGES.bad }); }
  const turns = (Array.isArray(body?.messages) ? body.messages : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_TURNS);
  if (!turns.length || turns[turns.length - 1].role !== 'user') return json(400, { error: 'bad', message: MESSAGES.bad });
  const messages = turns.map((m, i) => ({ role: m.role, content: m.content.slice(0, i === turns.length - 1 && body.jd ? MAX_JD_CHARS : MAX_CHARS) }));
  const question = messages[messages.length - 1].content;

  const model = injected || createGoogle({ apiKey: process.env.GEMINI_API_KEY })(MODEL_ID);
  // keep the model's hidden "thinking" minimal: faster replies, and it doesn't eat the answer's token budget
  // ('low', not 'minimal': gemini-3.8-flash rejects 'minimal' with "Thinking level MINIMAL is not supported")
  const providerOptions = { google: { thinkingConfig: /^gemini-2\./.test(MODEL_ID) ? { thinkingBudget: 0 } : { thinkingLevel: process.env.GEMINI_THINKING || 'low' } } };
  const retrieved = search(question.slice(0, 1500), 3);

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = obj => { try { controller.enqueue(enc.encode(JSON.stringify(obj) + '\n')); } catch {} };
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(new Error('timeout')), TIMEOUT_MS);
      let failed = false;
      const fail = (code, err) => { if (failed) return; failed = true; if (err) console.error('[chat]', code, err?.message || err); send({ t: 'error', code, message: MESSAGES[code] || MESSAGES.busy }); };

      // step 0: the automatic profile search that grounds every answer
      send({ t: 'step', id: 'pre', tool: 'searchProfile', label: 'Searched her profile', detail: retrieved.length ? retrieved.map(s => s.name).join(' · ') : 'No matching section' });

      try {
        const result = streamText({
          model, providerOptions, messages, abortSignal: abort.signal,
          instructions: instructions(retrieved),
          tools: makeTools(model, providerOptions),
          stopWhen: isStepCount(4),
          maxOutputTokens: 600,
          temperature: 0.3,
          onError: () => {} // errors are handled (and logged once) below
        });
        for await (const part of result.stream) {
          switch (part.type) {
            case 'text-delta': if (part.text) send({ t: 'text', v: part.text }); break;
            case 'tool-call': send({ t: 'step', id: part.toolCallId, tool: part.toolName, label: LABELS[part.toolName] || part.toolName, detail: callDetail(part.toolName, part.input) }); break;
            case 'tool-result': {
              const out = part.output || {};
              send({ t: 'step-done', id: part.toolCallId, detail: resultDetail(part.toolName, out) });
              if (part.toolName === 'openProject' && out.opened) send({ t: 'open', id: out.projectId });
              if (part.toolName === 'analyzeJobFit') send({ t: 'jobfit', requirements: out.requirements || [], summary: out.summary || '' });
              break;
            }
            case 'tool-error': send({ t: 'step-done', id: part.toolCallId, detail: "This step didn't work" }); console.error('[chat] tool error', part.toolName, part.error?.message || part.error); break;
            case 'error': fail(abort.signal.aborted ? 'timeout' : 'busy', part.error); break;
            case 'abort': fail('timeout'); break;
          }
        }
        if (abort.signal.aborted) fail('timeout'); // the SDK can end quietly on abort: still tell the visitor
      } catch (err) {
        fail(abort.signal.aborted ? 'timeout' : 'busy', err);
      } finally {
        clearTimeout(timer);
        send({ t: 'done', remaining: limit.remaining });
        controller.close();
      }
    }
  });
  return new Response(stream, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}

const LABELS = { searchProfile: 'Searched her profile again', analyzeJobFit: 'Checked the job description against her profile', openProject: 'Opened a project on the page', leaveMessage: 'Sent your message to Tanishka' };
const callDetail = (tool, input = {}) => tool === 'searchProfile' ? `“${String(input.query || '').slice(0, 60)}”`
  : tool === 'openProject' ? (loadProfile().projects.find(p => p.id === input.projectId)?.title || input.projectId)
  : tool === 'analyzeJobFit' ? `${String(input.jobDescription || '').split(/\s+/).length} words` : '';
const resultDetail = (tool, out) => tool === 'searchProfile' ? (out.sections?.map(s => s.name).join(' · ') || 'Nothing found')
  : tool === 'analyzeJobFit' ? ['strong', 'partial', 'gap'].map(r => `${(out.requirements || []).filter(x => x.rating === r).length} ${r}`).join(' · ')
  : tool === 'openProject' ? (out.opened ? `Showing ${out.title}` : 'Not found')
  : tool === 'leaveMessage' ? (out.sent ? 'Delivered' : `Still needed: ${(out.needs || []).join(', ')}`) : 'Done';

export function GET() { return json(405, { error: 'method', message: 'Use POST.' }, { allow: 'POST' }); }

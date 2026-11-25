// The one Gemini setup shared by the assistant (api/chat.js) and the contact workflow (api/_lib/workflow.js).
// GEMINI_API_KEY is read only here, on the server.
import { createGoogle } from '@ai-sdk/google';

// gemini-3.5-flash-lite: answers in ~1-2 s. (In testing, gemini-3.8-flash was overloaded (503) and gemini-3.5-flash
// took over 15 s, so both hit the timeout.) Override with the GEMINI_MODEL environment variable.
export const MODEL_ID = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

export const hasKey = () => !!process.env.GEMINI_API_KEY;
export const makeModel = () => createGoogle({ apiKey: process.env.GEMINI_API_KEY })(MODEL_ID);

// keep the model's hidden "thinking" minimal: faster replies, and it doesn't eat the answer's token budget
// ('low', not 'minimal': gemini-3.8-flash rejects 'minimal' with "Thinking level MINIMAL is not supported")
export const providerOptions = { google: { thinkingConfig: /^gemini-2\./.test(MODEL_ID) ? { thinkingBudget: 0 } : { thinkingLevel: process.env.GEMINI_THINKING || 'low' } } };

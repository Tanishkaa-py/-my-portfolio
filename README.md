# Tanishka Jain Portfolio

Personal portfolio of Tanishka Jain: data scientist, AI engineer and full-stack developer from Jaipur, India.

Plain HTML, CSS and JavaScript. No build step and no framework. Smooth scrolling comes from [Lenis](https://github.com/darkroomengineering/lenis) loaded from a CDN. Two Vercel serverless functions: `api/chat.js` powers the "Ask Tanishka's AI" assistant, and `api/contact.js` runs the contact form's AI workflow.

## Run locally

```bash
# any static server works
npx serve .
# or
python3 -m http.server 8080
```

Then open http://localhost:8080 (or the port `serve` prints).

## Deploy (free)

**Vercel:** push this folder to a GitHub repo, then import it at vercel.com/new. Framework preset: "Other". No build command. Output directory: `.`

**Netlify:** drag the folder onto app.netlify.com/drop, or connect the repo with no build command.

Then add a custom domain (for example `tanishkajain.dev`) in the host's domain settings.

## Structure

```
index.html               all page content and section markup
css/style.css            design tokens at the top, then one block per section
js/main.js               every interaction, one block per feature, plus the
                         project, area and certification data
js/tour.js               the optional voice-guided tour
data/tour-lines.json     the tour's clips: captions, targets, waits, actions
scripts/                 generate-tour-audio.mjs (ElevenLabs voice for the tour)
js/assistant.js          the "Ask Tanishka's AI" chat panel
js/contact.js            the contact form and its live workflow diagram
api/chat.js              serverless function: Gemini + tools, streamed answers
api/contact.js           serverless function: the contact workflow
api/_lib/                Gemini setup, profile retrieval, tools, rules, rate
                         limits, the contact workflow (workflow.js)
data/profile.md          the assistant's knowledge, built only from this site
assets/                  tanishka.webp (the only photo), og.jpg (link preview),
                         projects/ (screenshots), tour/ (tour audio), the CV PDF
```

## Editing content

- **Projects:** the `P` array in `js/main.js`. Each project has a plain-English `line` for the card, full details for the pop-up, one `area` (which door it sits behind), and optional `live`, `code` and `img` (a screenshot in `assets/projects/`).
- **Areas (the doors):** the `AREAS` array in the doors block of `js/main.js`.
- **Certifications:** the `C` array. Set `f: true` to make one a dark "featured" card, and `verify` to a credential URL to show a "Verify ↗" link.
- **Timeline:** the `<ol id="storyList">` in `index.html`. Each `<li>` needs `data-year` and `data-range`.
- **Flip-calendar roles:** the `words` array in the flip calendar block.

## Guided tour

"Take the tour" in the hero opens a small floating card where visitors pick a full tour (about 2 minutes) or highlights (under a minute); it never autoplays. The card shows the guide's orb and waveform, a two-line caption that lights up word by word, a progress line and icon controls; paused, it shrinks to the orb. It works without any audio files: each caption then stays on screen for a reading time based on its length.

- **Edit the lines:** `data/tour-lines.json` is the single source of truth. Each clip has an `id`, a `target` to scroll to, the `caption`, and optionally a `ring` (what stays bright while the rest of the page gently dims; `false` for none, as in the hero clips), a `wait` (hover/click with a timeout), `playIf`, `action` (`openDoor`, `expandCard`, `highlight`, `closeDoors`, `develop`), `slowScroll`, and `speech` (different text for the voice than the caption). `highlights` lists the clips in the short tour.
- **Audio files:** `assets/tour/{id}.mp3`, one per clip. Missing files are fine; the tour falls back to captions.
- **Hooks** (in `js/main.js` / `js/tour.js`): `openDoor(area)`, `closeDoors()`, `expandCard(id)`, and `openAssistant()` (opens the assistant) and `focusContactForm()` (the last stop's "Get in touch": scrolls to the form and puts the cursor in Name).

### Generate the voice with ElevenLabs

1. Put your keys in `.env.local` (or `.env`; `.env.local` wins if both exist). Both files are git-ignored:

   ```
   ELEVENLABS_API_KEY=your-key
   ELEVENLABS_VOICE_ID=your-voice-id
   # optional, defaults to eleven_multilingual_v2
   ELEVENLABS_MODEL_ID=eleven_multilingual_v2
   ```

2. Run (Node 18 or newer, nothing to install):

   ```bash
   npm run tour:audio -- --dry-run     # check the keys are found and list the clips, no API calls
   npm run tour:audio                  # generate every clip into assets/tour/
   npm run tour:audio -- --only=04     # regenerate one clip (or --only=04,05)
   ```

   The script never prints your key. Re-run it for a clip whenever you change its caption (or `speech`).

## "Ask Tanishka's AI" (recruiter assistant)

A chat panel (bottom-left "Ask my AI" button, the menu, or the end of the tour) that answers questions about Tanishka **only from `data/profile.md`**, which is built from this site's content. It streams answers, shows each step under "How I answered", can check a pasted job description (strong / partial / gap with evidence), open a project's door and card, and prepare a message for Tanishka, which the visitor checks and sends through the same workflow as the contact form.

- **Backend:** `api/chat.js` (Vercel serverless function, Node 22+) using the Vercel AI SDK (`ai`) and Google Gemini (`@ai-sdk/google`). The API key stays on the server.
- **Knowledge:** `data/profile.md`, one `## ` section per topic. **Update it whenever the site's content changes**, or the assistant will give outdated answers.
- **Tools:** `searchProfile`, `analyzeJobFit`, `openProject`, `leaveMessage` (prepares the message; the visitor presses Send in the chat, which posts to `api/contact.js`).
- **Safeguards:** 20 messages per visitor per hour (in-memory, best-effort, plus a matching browser limit; see `api/_lib/ratelimit.js` for switching to Upstash), capped answer and message length, a 15-second timeout, friendly errors.
- **Model:** `gemini-3.5-flash-lite` by default (shared with the contact workflow, in `api/_lib/gemini.js`) (fast enough for the 15-second timeout); set `GEMINI_MODEL` to change it. Avoid `gemini-2.5-flash`: it's no longer available to new API keys.

### Run it locally

```bash
npm install                 # once
# add your key to .env (git-ignored):  GEMINI_API_KEY=your-key
vercel dev                  # don't add a "dev" script that calls vercel dev: it would call itself
```

Open the URL it prints (usually http://localhost:3000). A plain static server can't run `/api/chat`, so the panel will say the assistant isn't available there.

### Make it work on the live site

Vercel → your project → **Settings → Environment Variables** → add `GEMINI_API_KEY` (optionally `GEMINI_MODEL`) for Production (and Preview if you like) → **redeploy**. Set a spending cap or budget alert on your Google AI billing.

## Contact form and AI workflow

The form in Contact posts to `api/contact.js`, which runs one workflow (`api/_lib/workflow.js`) and returns the steps it completed. The page then replaces the form with a live diagram (Received → AI sorted it → Tanishka notified → Reply sent) that lights up only the steps the server reports.

1. **Received:** checks length and email format, a hidden honeypot field, Cloudflare Turnstile, and a limit of 3 messages per visitor per hour.
2. **AI sorted it:** Gemini returns `{ category, company, role, urgency, summary, isSpam }`. The prompt treats the message as data, never as instructions.
3. **Spam:** the workflow stops; nothing is sent.
4. **Tanishka notified:** Nodemailer sends an email through Gmail with the category, summary, details and the original message. Reply-To is the visitor, so replying in Gmail answers them. If the AI step fails, the email is still sent, marked "Unsorted (AI step failed)".
5. **Reply sent:** only when the AI says the message isn't spam. Gemini writes 2 to 4 warm sentences in Tanishka's voice, signed "– Tanishka", about the topic in general terms (thanks for the kind words about a project, enthusiasm about a collaboration, thanks for thinking of her for a role). The code then checks it (`checkReply` in `workflow.js`): no links, "@", numbers (except "3Rings"), prices, dates, days, availability or promise words, no unusual characters, 2 to 4 sentences, first person, never their name and never 5 words in a row from their message. If it fails any check, or Gemini takes more than 5 seconds or fails, the safe template reply for the category is sent instead. The email to Tanishka shows exactly which reply went out.

No database: nothing is stored. The whole run has a 20-second limit. The assistant's `leaveMessage` uses the same endpoint and shows the same diagram, smaller.

### Environment variables

Put these in `.env` for `vercel dev`, and in Vercel → Settings → Environment Variables for the live site (then redeploy):

```
GEMINI_API_KEY=...            # already set for the assistant
GEMINI_MODEL=...              # optional
GMAIL_USER=work.tanishkajain@gmail.com
GMAIL_APP_PASSWORD=...        # a 16-character Google app password, not your Google password
TURNSTILE_SITE_KEY=...        # public; required in production
TURNSTILE_SECRET_KEY=...      # secret; required in production
```

In production (`VERCEL_ENV=production`) the form stays offline until both Turnstile keys are set. Elsewhere Turnstile is skipped if the keys are missing.

### Turnstile: test keys locally, real keys on Vercel

The page gets the **public** site key from `GET /api/contact` (it returns only `{ ready, turnstileSiteKey }`); the secret key never leaves the server, which checks each token with Cloudflare's `siteverify`. The widget appears just above the Send button, in the dark theme.

- **Local development (`.env`, used by `vercel dev`):** use Cloudflare's test keys, which always pass and work on any hostname:

  ```
  TURNSTILE_SITE_KEY=1x00000000000000000000AA
  TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
  ```

  The widget then shows "For testing only", which is expected.
- **Vercel (Production):** use your real keys from the Cloudflare dashboard (Turnstile → your widget → Settings). Don't put the real keys in `.env`.
- **Allowed hostnames:** on the real widget, add **`tanishkajain.vercel.app`** and **`localhost`** under Hostname Management. If the hostname isn't listed, the widget fails (error 110200 in the browser console) and the form says "The security check couldn't load. Refresh the page or email me directly."

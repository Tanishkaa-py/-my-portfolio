# CLAUDE.md

Guidance for Claude Code when working on this portfolio.

## What this is

A single-page personal portfolio for Tanishka Jain (data scientist, AI engineer, full-stack developer). Audience: recruiters and hiring managers, many of them non-technical. It must stay simple to understand and use, feel premium, and show only real work.

## Hard rules

- **Never invent content.** Every project, metric, date, award and certification must come from Tanishka's CV, LinkedIn, GitHub, or her direct instruction. If something is missing, ask; don't fill it in.
- **Plain English first.** Each project card leads with one sentence a non-technical person can follow. Technical detail lives in the pop-up.
- **No framework or build step** unless Tanishka asks to migrate. Keep it deployable as static files.
- **Performance and accessibility:** respect `prefers-reduced-motion`, keep keyboard focus visible, keep the hero canvas paused when off-screen, test at 390px wide.

## Design system

- Concept: "Darkroom". The one photo starts black and white and develops into colour under the cursor (tap on touch screens).
- Dark sections: hero, marquee, GitHub, contact. Warm paper sections: about, work, skills, story, recognition.
- Tokens are at the top of `css/style.css`. Fonts: Bricolage Grotesque (display), Geist (body), Geist Mono (labels).
- Accent: `--accent` (blue, on paper) and `--glow` (periwinkle, on dark). Gold `--gold` is only for awards.

## Where things live

- Content data: `js/main.js` arrays `P` (projects), `C` (certifications), `R` (repos), and `S` inside the skills block.
- Timeline: `#storyList` in `index.html`.
- Each interaction is a self-contained IIFE block in `main.js` with a comment header.

## Ideas for later (only if Tanishka asks)

1. Download CV button (add `assets/Tanishka_Jain_CV.pdf` and link it in the hero and contact sections).
2. Credential links on each certification card (Credly, Coursera or AWS verification URLs).
3. "Ask about me" AI assistant (text, optionally voice) grounded only in her CV, using a serverless function (Vercel/Cloudflare) with Gemini or Claude. Needs rate limiting and a spend cap, and the API key must stay server-side.
4. Analytics with a consent banner (Plausible or Vercel Analytics).
5. Per-project pages for SEO if the projects grow.

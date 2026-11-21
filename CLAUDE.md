# CLAUDE.md

Guidance for Claude Code when working on this portfolio.

## What this is

A single-page personal portfolio for Tanishka Jain (data scientist, AI engineer, full-stack developer). Audience: recruiters and hiring managers, many of them non-technical. It must stay simple to understand and use, feel premium, and show only real work.

## Hard rules

- **Never invent content.** Every project, metric, date, award and certification must come from Tanishka's CV, LinkedIn, GitHub, or her direct instruction. If something is missing, ask; don't fill it in.
- **Plain English first.** Each project card leads with one sentence a non-technical person can follow. Technical detail lives in the pop-up.
- **No framework or build step** unless Tanishka asks to migrate. Keep it deployable as static files.
- **Performance and accessibility:** respect `prefers-reduced-motion`, keep keyboard focus visible, keep the particle canvas paused when the tab is hidden, test at 390px wide.

## Design system

- Concept: "Darkroom". The one photo starts black and white and develops into colour under the cursor (tap on touch screens).
- One continuous space: each section has `data-theme="dark|light|accent"` and `main.js` sets the same attribute on `<html>` when that section crosses the middle of the screen. Dark: hero, tools strip, Behind the doors (#work). Light: about, story, recognition. Accent (deep blue): contact only.
- Sections have no backgrounds of their own. Components use the theme tokens (`--bg`, `--fg`, `--fg-2`, `--surface`, `--border`, `--link`…), which take their values from the raw palette under each `html[data-theme]` and fade over 0.8s.
- The particle sphere is one fixed canvas behind the whole page; its position per section is the `SCENES` table in `main.js`, its colours are the `--dot*` tokens.
- Tokens are at the top of `css/style.css`. Fonts: Bricolage Grotesque (display), Geist (body), Geist Mono (labels).
- Accent: `--accent` (blue, on paper) and `--glow` (periwinkle, on dark). Gold `--gold` is only for awards. `--safe-red` / `--safe-green` are only for the door safelights.

## Where things live

- Content data: `js/main.js` arrays `P` (projects: `area` is the one door it sits behind, `img` is a real screenshot in `assets/projects/` shown in a browser frame (falls back to the `art` illustration), `live` shows "Visit site" only when it's a real URL, `code` is `[label, url]` pairs, no `overview` means no pop-up), `AREAS` inside the doors block (door name, description, tool chips), and `C` (certifications: optional `verify` URL shows a "Verify ↗" link).
- Behind the doors (#work): four door buttons, all closed on load; each opens one room of expanding project cards, and clicking the open door closes it. Built from `AREAS` + `P` in main.js. `window.openDoor(area)` opens a room for a guided tour.
- Timeline: `#storyList` in `index.html`.
- Deployment: the domain is the placeholder `YOUR_DOMAIN` in `index.html` (canonical, og:url, og:image, twitter:image), `sitemap.xml` and `robots.txt`. Favicon: `assets/favicon.svg` and `assets/apple-touch-icon.png`.
- Each interaction is a self-contained IIFE block in `main.js` with a comment header.

## Ideas for later (only if Tanishka asks)

1. Download CV button (add `assets/Tanishka_Jain_CV.pdf` and link it in the hero and contact sections).
2. Credential links: the `verify` field and link are built; only the URLs are missing.
3. "Ask about me" AI assistant (text, optionally voice) grounded only in her CV, using a serverless function (Vercel/Cloudflare) with Gemini or Claude. Needs rate limiting and a spend cap, and the API key must stay server-side.
4. Analytics with a consent banner (Plausible or Vercel Analytics).
5. Per-project pages for SEO if the projects grow.

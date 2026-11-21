# Tanishka Jain Portfolio

Personal portfolio of Tanishka Jain: data scientist, AI engineer and full-stack developer from Jaipur, India.

Plain HTML, CSS and JavaScript. No build step and no framework. Smooth scrolling comes from [Lenis](https://github.com/darkroomengineering/lenis) loaded from a CDN.

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
- **Hooks** (in `js/main.js` / `js/tour.js`): `openDoor(area)`, `closeDoors()`, `expandCard(id)`, and `openAssistant()` (a placeholder for a future AI assistant).

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

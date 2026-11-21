#!/usr/bin/env node
/* Generates the guided tour's voice clips with ElevenLabs text-to-speech.

   Reads data/tour-lines.json and saves assets/tour/{id}.mp3 for every clip.
   Keys come from .env.local if it exists, otherwise .env (both are git-ignored):
     ELEVENLABS_API_KEY=...
     ELEVENLABS_VOICE_ID=...
     ELEVENLABS_MODEL_ID=eleven_multilingual_v2   (optional)

   Usage:
     npm run tour:audio                   all clips
     npm run tour:audio -- --only=04      one clip (comma-separate for several: --only=04,05)
     npm run tour:audio -- --dry-run      check the setup and list what would be generated, no API calls

   No dependencies: Node 18+ (built-in fetch). The API key is never printed. */
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = p => path.relative(root, p);
const exists = p => access(p).then(() => true, () => false);

// ---- arguments
const args = process.argv.slice(2);
const onlyArg = args.find(a => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice(7).split(',').map(s => s.trim()).filter(Boolean) : null;
const dryRun = args.includes('--dry-run');

// ---- env: .env.local wins, otherwise .env. Parsed by hand (KEY=value, optional quotes, # comments, optional "export ").
async function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const file = path.join(root, name);
    if (!(await exists(file))) continue;
    const vars = {};
    for (const raw of (await readFile(file, 'utf8')).split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      else v = v.replace(/\s+#.*$/, ''); // trailing comment on an unquoted value
      vars[m[1]] = v;
    }
    return { file: name, vars };
  }
  return { file: null, vars: {} };
}

const fail = msg => { console.error(`\n✗ ${msg}\n`); process.exit(1); };

const env = await loadEnv();
const KEY = process.env.ELEVENLABS_API_KEY || env.vars.ELEVENLABS_API_KEY;
const VOICE = process.env.ELEVENLABS_VOICE_ID || env.vars.ELEVENLABS_VOICE_ID;
const MODEL = process.env.ELEVENLABS_MODEL_ID || env.vars.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
const hide = s => (KEY ? String(s).split(KEY).join('[hidden]') : String(s)); // belt and braces: never echo the key

// ---- clips
const data = JSON.parse(await readFile(path.join(root, 'data/tour-lines.json'), 'utf8'));
let clips = data.clips;
if (only) {
  const unknown = only.filter(id => !clips.some(c => c.id === id));
  if (unknown.length) fail(`Unknown clip id(s): ${unknown.join(', ')}. Valid ids: ${clips.map(c => c.id).join(', ')}`);
  clips = clips.filter(c => only.includes(c.id));
}

console.log(`Tour audio · ${clips.length} clip${clips.length === 1 ? '' : 's'} · model ${MODEL}`);
console.log(`Keys from: ${env.file || '(no .env.local or .env found)'} · API key ${KEY ? 'found' : 'MISSING'} · voice id ${VOICE ? 'found' : 'MISSING'}`);

if (dryRun) {
  for (const c of clips) console.log(`  ${c.id.padEnd(4)} → assets/tour/${c.id}.mp3  "${(c.speech || c.caption).slice(0, 60)}…"`);
  console.log('\nDry run: nothing was generated.');
  process.exit(KEY && VOICE ? 0 : 1);
}
if (!KEY) fail('ELEVENLABS_API_KEY is missing. Add it to .env.local or .env in the project root.');
if (!VOICE) fail('ELEVENLABS_VOICE_ID is missing. Add it to .env.local or .env in the project root.');

// ---- generate, one clip at a time (gentle on rate limits)
const outDir = path.join(root, 'assets/tour');
await mkdir(outDir, { recursive: true });
const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(VOICE)}?output_format=mp3_44100_128`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok = 0;

for (const c of clips) {
  const text = c.speech || c.caption;
  let res, attempt = 0;
  while (true) {
    attempt++;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true } })
      });
    } catch (e) { res = null; if (attempt < 3) { await sleep(1500 * attempt); continue; } fail(`${c.id}: network error (${hide(e.message)})`); }
    if ((res.status === 429 || res.status >= 500) && attempt < 3) { await sleep(2000 * attempt); continue; }
    break;
  }
  if (!res.ok) {
    let detail = ''; try { detail = await res.text(); } catch {}
    fail(`${c.id}: ElevenLabs returned ${res.status} ${res.statusText}. ${hide(detail).slice(0, 300)}`);
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  const file = path.join(outDir, `${c.id}.mp3`);
  await writeFile(file, bytes);
  ok++;
  console.log(`  ✓ ${c.id.padEnd(4)} → ${rel(file)}  (${Math.round(bytes.length / 1024)} KB)`);
}
console.log(`\nDone: ${ok} file${ok === 1 ? '' : 's'} in assets/tour/. Reload the page and take the tour.`);

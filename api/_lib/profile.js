// Loads data/profile.md, splits it into "## " sections and finds the sections that match a question.
// Simple keyword retrieval on purpose: the profile is small, and this keeps answers traceable to named sections.
// (Files in api/_lib are helpers; Vercel doesn't turn underscore-prefixed paths into endpoints.)
import { readFileSync } from 'node:fs';
import path from 'node:path';

let cache = null;

export function loadProfile() {
  if (cache) return cache;
  const raw = readFileSync(path.join(process.cwd(), 'data', 'profile.md'), 'utf8')
    .replace(/<!--[\s\S]*?-->/g, ''); // drop editor comments
  const sections = raw.split(/^## /m).slice(1).map(block => {
    const nl = block.indexOf('\n');
    const name = block.slice(0, nl).trim();
    const text = block.slice(nl + 1).trim();
    const id = (name.match(/\(id: ([a-z-]+)\)/) || [])[1] || null;
    return { name: name.replace(/\s*\(id: [a-z-]+\)/, ''), id, text, words: tokens(name + ' ' + text) };
  });
  const projects = sections.filter(s => s.id).map(s => ({ id: s.id, title: s.name.replace(/^Project: /, '') }));
  cache = { sections, projects, full: sections.map(s => `## ${s.name}\n${s.text}`).join('\n\n') };
  return cache;
}

const STOP = new Set('a an and are as at be but by can could did do does for from had has have her hers him his how i in is it its me my of on or our she so than that the their them then there these they this to was we were what when where which who whom why will with would you your about tell show give any some does did please much many more most also into just like get got'.split(' '));
// a few everyday words recruiters use, mapped to the words the profile uses
const SYN = {
  contact: ['email', 'linkedin', 'reach', 'message'], reach: ['contact', 'email'], hire: ['contact', 'open', 'roles', 'available'], email: ['contact'],
  ai: ['gemini', 'llm', 'generative', 'agentic', 'machine', 'learning'], genai: ['generative', 'llm', 'gemini'], llm: ['gemini', 'generative', 'rag'],
  agent: ['agentic', 'skyvern', 'n8n', 'automation'], agents: ['agentic', 'skyvern', 'n8n'], build: ['project', 'built'], built: ['project', 'build'], project: ['built'],
  ml: ['machine', 'learning', 'model'], model: ['machine', 'learning', 'accuracy'], data: ['analytics', 'sql', 'dashboard'], analyst: ['analytics', 'data'],
  frontend: ['react', 'next.js', 'full', 'stack'], backend: ['node.js', 'api', 'full', 'stack'], fullstack: ['full', 'stack'], web: ['full', 'stack', 'next.js', 'react'],
  cloud: ['aws', 'vercel', 'deployed'], degree: ['education', 'b.sc', 'm.sc', 'university'], study: ['education', 'university'], school: ['education', 'university'], university: ['education'],
  award: ['prize', 'awards'], prize: ['awards'], win: ['prize'], won: ['prize'], certificate: ['certifications'], certified: ['certifications'],
  experience: ['intern', 'experience', 'lead'], job: ['experience', 'role'], work: ['experience', 'project'], cv: ['contact', 'readme', 'resume'], resume: ['cv', 'readme'],
  location: ['jaipur', 'india', 'remote'], based: ['jaipur', 'india']
};

export function tokens(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9.+#\s-]/g, ' ').split(/\s+/)
    .map(w => w.replace(/^[.\-]+|[.\-]+$/g, ''))
    .filter(w => w.length > 1 && !STOP.has(w))
    .map(w => (w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '') : w));
}

// score = how often the question's words (and their synonyms) appear, with matches in the section name counting more
export function search(query, k = 3) {
  const { sections } = loadProfile();
  const q = tokens(query); if (!q.length) return [];
  const terms = new Map();
  q.forEach(w => { terms.set(w, 1); (SYN[w] || []).forEach(x => tokens(x).forEach(t => terms.has(t) || terms.set(t, .6))); });
  return sections.map(s => {
    const name = tokens(s.name); let score = 0;
    for (const [t, wt] of terms) {
      const inName = name.includes(t) ? 3 : 0;
      const inText = Math.min(3, s.words.filter(w => w === t).length);
      score += wt * (inName + inText);
    }
    return { s, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score)
    .filter((x, i, all) => x.score >= all[0].score * 0.4) // drop weak matches far below the best one
    .slice(0, k).map(x => ({ name: x.s.name, id: x.s.id, text: x.s.text }));
}

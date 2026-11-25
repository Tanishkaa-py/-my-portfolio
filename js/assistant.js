/* "Ask Tanishka's AI": the recruiter assistant panel.
   Talks to the serverless function at /api/chat (api/chat.js), which streams back JSON lines: tool steps, answer text,
   "open this project", job-fit results and friendly errors. The Gemini key lives only on the server.
   Opened from the bottom-left "Ask my AI" button, the menu, or the tour (window.openAssistant). */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = matchMedia('(max-width:620px)');
  const root = document.documentElement;
  const LIMIT = 20, HOUR = 3600e3, CLIENT_TIMEOUT = 25000;
  const STARTERS = ['What has she built with AI?', 'Check my job description', 'How do I contact her?'];
  const JD_PREFIX = "Here's the job description:\n\n";
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

  /* ---------- markup ---------- */
  const launch = document.createElement('button');
  launch.className = 'ai-launch'; launch.type = 'button'; launch.setAttribute('aria-controls', 'ai'); launch.setAttribute('aria-expanded', 'false'); launch.dataset.hover = '';
  launch.innerHTML = '<span class="ai-dot" aria-hidden="true"></span>Ask my AI';

  const panel = document.createElement('section');
  panel.className = 'ai'; panel.id = 'ai'; panel.hidden = true;
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'false'); panel.setAttribute('aria-labelledby', 'aiTitle');
  panel.setAttribute('data-lenis-prevent', ''); // let the panel scroll on its own (Lenis would swallow wheel events)
  panel.innerHTML = `
    <header class="ai-head">
      <span class="ai-orb" aria-hidden="true"></span>
      <div class="ai-head-text">
        <h2 id="aiTitle">Ask Tanishka's AI</h2>
        <p class="ai-note">This assistant only answers from Tanishka's real CV and projects.</p>
      </div>
      <button class="ai-close" type="button" aria-label="Close the assistant" data-hover><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
    </header>
    <details class="ai-built">
      <summary data-hover>How it's built</summary>
      <ul>
        <li><b>Google Gemini</b> (a Flash model) writes the answers</li>
        <li><b>Vercel AI SDK</b> with tool calling: profile search, job-fit check, open a project, prepare a message</li>
        <li><b>Messages</b> you send go through the same AI workflow as the contact form (Gemini sorts them, Gmail delivers them)</li>
        <li><b>Retrieval</b> from one profile file built only from this site's content</li>
        <li><b>A Vercel serverless function</b> keeps the API key private, with rate limits and a timeout</li>
      </ul>
    </details>
    <div class="ai-log" aria-label="Conversation">
      <div class="ai-starters" role="group" aria-label="Suggested questions">
        ${STARTERS.map(s => `<button class="ai-chip" type="button" data-hover>${esc(s)}</button>`).join('')}
      </div>
    </div>
    <p class="sr-only" aria-live="polite" id="aiAnnounce"></p>
    <form class="ai-form">
      <label class="sr-only" for="aiInput">Your question about Tanishka</label>
      <textarea id="aiInput" rows="1" maxlength="6000" placeholder="Ask about Tanishka…"></textarea>
      <button class="ai-send" type="submit" aria-label="Send" data-hover><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 8h10M8.5 3.5L13 8l-4.5 4.5" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <p class="ai-fine"><span>Don't share sensitive information.</span><span class="ai-left" aria-live="polite"></span></p>
    </form>`;
  document.body.append(launch, panel);

  const log = $('.ai-log', panel), input = $('#aiInput', panel), form = $('.ai-form', panel), sendBtn = $('.ai-send', panel);
  const announce = $('#aiAnnounce', panel), leftEl = $('.ai-left', panel), starters = $('.ai-starters', panel);
  let history = [], busy = false, jdMode = false, opener = null;

  /* ---------- open / close ---------- */
  function open(from) {
    opener = from || document.activeElement;
    panel.hidden = false; root.classList.add('ai-open'); launch.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => input.focus({ preventScroll: true }));
  }
  function close(returnFocus = true) {
    if (panel.hidden) return;
    panel.hidden = true; root.classList.remove('ai-open'); launch.setAttribute('aria-expanded', 'false');
    if (returnFocus) (opener && document.contains(opener) && opener.offsetParent !== null ? opener : launch).focus({ preventScroll: true });
  }
  window.openAssistant = () => { open(launch); return true; }; // used by the tour's last clip
  launch.addEventListener('click', () => (panel.hidden ? open(launch) : close()));
  $('.ai-close', panel).addEventListener('click', () => close());
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-ai-open]'); if (!b) return;
    e.preventDefault();
    if (document.body.classList.contains('menu-open')) $('#menuBtn').click(); // close the menu first
    setTimeout(() => open(launch), 60);
  });
  // on phones the panel covers the page, so Tab stays inside it (on desktop it's a side panel and Tab may leave)
  panel.addEventListener('keydown', e => {
    if (e.key !== 'Tab' || !phone.matches) return;
    const f = $$('button, [href], textarea, summary', panel).filter(el => !el.disabled && el.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
  addEventListener('keydown', e => {
    if (e.key !== 'Escape' || panel.hidden) return;
    if ($('#modal')?.open || document.body.classList.contains('menu-open')) return; // let those close first
    close();
  });

  /* ---------- input: auto-growing box; the job-description starter turns it into a big paste area ---------- */
  const grow = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, jdMode ? 260 : 120) + 'px'; };
  const setJd = on => { jdMode = on; form.classList.toggle('jd', on); input.placeholder = on ? 'Paste the job description here…' : 'Ask about Tanishka…'; grow(); };
  input.addEventListener('input', () => { if (jdMode && !input.value.trim()) setJd(false); grow(); });
  input.addEventListener('paste', () => setTimeout(() => { if (input.value.length > 400 && !jdMode) setJd(true); }, 0)); // a long paste is probably a job description
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !jdMode) { e.preventDefault(); form.requestSubmit(); } }); // Enter sends (Shift+Enter: new line); in the paste area Enter adds lines
  starters.addEventListener('click', e => {
    const b = e.target.closest('.ai-chip'); if (!b) return;
    if (b.textContent === 'Check my job description') { input.value = JD_PREFIX; setJd(true); input.focus(); input.setSelectionRange(input.value.length, input.value.length); return; }
    ask(b.textContent);
  });
  form.addEventListener('submit', e => { e.preventDefault(); const q = input.value.trim(); if (q && q !== JD_PREFIX.trim()) ask(q); });

  /* ---------- browser-side limit, matching the server's 20 per hour ---------- */
  const recent = () => (store.get('ai-sent') || []).filter(t => Date.now() - t < HOUR);
  const showLeft = n => { leftEl.textContent = n <= 5 ? `${n} question${n === 1 ? '' : 's'} left this hour` : ''; };
  showLeft(LIMIT - recent().length);

  /* ---------- rendering ---------- */
  const scrollDown = () => { log.scrollTo({ top: log.scrollHeight, behavior: reduce ? 'auto' : 'smooth' }); };
  // light formatting for the model's replies: paragraphs, bullets, **bold**, links
  const format = txt => {
    const linkify = s => s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, t, u) => `\u0000${t}\u0001${u}\u0002`) // markdown links first
      .replace(/(?<!\u0001)(https?:\/\/[^\s)\u0001\u0002]+[^\s).,\u0001\u0002])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/\u0000([^\u0001]*)\u0001([^\u0002]*)\u0002/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/([\w.+-]+@[\w-]+\.[\w.]+[a-z])/gi, '<a href="mailto:$1">$1</a>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    return esc(txt).split(/\n{2,}/).map(block => {
      const lines = block.split('\n');
      if (lines.every(l => /^\s*([-*•]|\d+\.)\s+/.test(l))) return `<ul>${lines.map(l => `<li>${linkify(l.replace(/^\s*([-*•]|\d+\.)\s+/, ''))}</li>`).join('')}</ul>`;
      return `<p>${linkify(lines.join('<br>'))}</p>`;
    }).join('');
  };
  const addUser = text => {
    const el = document.createElement('div'); el.className = 'ai-msg user';
    el.innerHTML = `<p>${esc(text.length > 600 ? text.slice(0, 600) + '…' : text)}</p>`;
    log.append(el); scrollDown();
  };
  const addBot = () => {
    const el = document.createElement('div'); el.className = 'ai-msg bot thinking';
    el.innerHTML = `
      <div class="ai-text"><span class="ai-typing" aria-label="Thinking"><i></i><i></i><i></i></span></div>
      <details class="ai-steps"><summary data-hover><span class="ai-steps-label">How I answered</span> <span class="ai-steps-count"></span></summary><ol></ol></details>`;
    log.append(el); scrollDown();
    return el;
  };
  const RATING = { strong: 'Strong', partial: 'Partial', gap: 'Gap' };
  const renderJobFit = (el, d) => {
    const box = document.createElement('div'); box.className = 'ai-fit';
    box.innerHTML = `<p class="ai-fit-title">Job fit, requirement by requirement</p><ul>${(d.requirements || []).map(r => `
      <li><span class="ai-rate ${esc(r.rating)}">${RATING[r.rating] || esc(r.rating)}</span><div><b>${esc(r.requirement)}</b><span>${esc(r.evidence)}${r.section ? ` <em>(${esc(r.section)})</em>` : ''}</span></div></li>`).join('')}</ul>
      ${d.summary ? `<p class="ai-fit-sum">${esc(d.summary)}</p>` : ''}`;
    el.insertBefore(box, $('.ai-steps', el));
  };

  /* ---------- a message to Tanishka: the visitor checks it and presses Send, which runs the contact workflow
     (/api/contact, the same as the form: bot check, limit, AI sorting, emails) and shows the same diagram, smaller ---------- */
  const renderMessage = (bot, d) => {
    const cf = window.contactFlow; if (!cf) return;
    const card = document.createElement('div'); card.className = 'ai-mail';
    card.innerHTML = `<p class="ai-fit-title">Message to Tanishka</p>
      <dl>
        <div><dt>From</dt><dd>${esc(d.name)} · ${esc(d.email)}</dd></div>
        ${d.topic ? `<div><dt>About</dt><dd>${esc(d.topic)}</dd></div>` : ''}
        <div><dt>Message</dt><dd class="ai-mail-msg">${esc(d.message)}</dd></div>
      </dl>
      <div class="ai-mail-ts" hidden></div>
      <div class="ai-mail-acts"><button class="ai-mail-send" type="button" data-hover>Send to Tanishka</button><button class="ai-mail-no" type="button" data-hover>Don't send</button></div>
      <p class="ai-mail-err" role="alert"></p>`;
    bot.insertBefore(card, $('.ai-steps', bot));
    const acts = $('.ai-mail-acts', card), err = $('.ai-mail-err', card), sendB = $('.ai-mail-send', card);
    const guard = cf.makeGuard($('.ai-mail-ts', card)); guard.init();
    $('.ai-mail-no', card).addEventListener('click', () => { acts.remove(); $('.ai-mail-ts', card).remove(); err.textContent = ''; card.insertAdjacentHTML('beforeend', '<p class="ai-mail-note">Not sent.</p>'); });
    sendB.addEventListener('click', async () => {
      err.textContent = ''; sendB.disabled = true; sendB.textContent = 'Checking…';
      const chk = await guard.check(10000);
      sendB.disabled = false; sendB.textContent = 'Send to Tanishka';
      if (chk.status === 'pending' || chk.status === 'error') { err.innerHTML = cf.withMail(cf.CHECK_MSG[chk.status].replace('email me directly', 'email Tanishka directly')); return; }
      const token = chk.token;
      acts.hidden = true;
      const box = document.createElement('div'); card.append(box);
      const flow = cf.renderFlow(box, { mini: true }); scrollDown();
      const r = await cf.submit({ name: d.name, email: d.email, topic: d.topic || '', message: d.message, website: '', source: 'assistant', ...(token ? { token } : {}) });
      if (r.kind === 'invalid') { box.remove(); acts.hidden = false; guard.reset(); err.textContent = Object.values(r.fields).join(' '); return; }
      await cf.playFlow(flow, r, cf.succeeded(r) ? [] : [{ label: 'Try again', run: () => { box.remove(); acts.hidden = false; guard.reset(); sendB.focus(); } }]);
      if (cf.succeeded(r)) $('.ai-mail-ts', card)?.remove();
      scrollDown();
    });
    scrollDown();
  };

  /* ---------- opening a project on the page (desktop: beside the panel; phone: collapse the panel first) ---------- */
  function showProject(id) {
    if (!window.expandCard || !window.expandCard(id)) return;
    const card = $(`.pcard[data-id="${id}"]`); if (!card) return;
    if (phone.matches) close(false);
    setTimeout(() => {
      const y = card.getBoundingClientRect().top + scrollY - (phone.matches ? 76 : 96);
      if (window.siteLenis && !reduce) window.siteLenis.scrollTo(y, { duration: 1.2, force: true }); else window.scrollTo(0, y);
      if (phone.matches) toast(`Showing ${$('.pc-title', card)?.textContent || 'the project'}. Tap "Ask my AI" to keep chatting.`);
    }, reduce ? 0 : 750); // let the card finish widening
  }
  let toastT = 0;
  function toast(msg) {
    let t = $('.ai-toast'); if (!t) { t = document.createElement('p'); t.className = 'ai-toast'; t.setAttribute('role', 'status'); document.body.append(t); }
    t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 4500);
  }

  /* ---------- asking ---------- */
  async function ask(question) {
    if (busy) return;
    const sent = recent();
    if (sent.length >= LIMIT) { addUser(question); const b = addBot(); finishBot(b, '', `You've reached the limit of ${LIMIT} questions per hour. Please try again later, or email Tanishka at work.tanishkajain@gmail.com.`); return; }
    store.set('ai-sent', [...sent, Date.now()]); showLeft(LIMIT - sent.length - 1);
    const isJd = jdMode || question.length > 400;
    starters.hidden = true; input.value = ''; setJd(false);
    addUser(question); history.push({ role: 'user', content: question });
    busy = true; sendBtn.disabled = true; panel.setAttribute('aria-busy', 'true');
    const bot = addBot(), textEl = $('.ai-text', bot), stepsEl = $('.ai-steps ol', bot), countEl = $('.ai-steps-count', bot), labelEl = $('.ai-steps-label', bot);
    let answer = '', error = '', steps = 0;
    const step = (id, label, detail) => {
      steps++; countEl.textContent = `(${steps} step${steps === 1 ? '' : 's'})`; labelEl.textContent = label + '…';
      const li = document.createElement('li'); li.dataset.id = id; li.className = 'running';
      li.innerHTML = `<b>${esc(label)}</b>${detail ? `<span>${esc(detail)}</span>` : ''}`; stepsEl.append(li);
    };
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: history.slice(-10), jd: isJd }), signal: AbortSignal.timeout(CLIENT_TIMEOUT) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // a plain static server (python http.server, npx serve…) has no /api/chat: it answers 404, 405 or 501 without our JSON
        const noBackend = !data.message && [404, 405, 501].includes(res.status);
        error = data.message || (noBackend
          ? (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'The assistant needs its server to answer. Run the site with "vercel dev" (not a static server) to try it locally.' : "The assistant isn't available right now. You can still reach Tanishka at work.tanishkajain@gmail.com.")
          : "The assistant couldn't answer just now. Please try again in a moment.");
      } else {
        const reader = res.body.getReader(), dec = new TextDecoder(); let buf = '';
        for (;;) {
          const { value, done } = await reader.read(); if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl; while ((nl = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1); if (!line) continue;
            let m; try { m = JSON.parse(line); } catch { continue; }
            if (m.t === 'text') { answer += m.v; bot.classList.remove('thinking'); textEl.innerHTML = format(answer); scrollDown(); }
            else if (m.t === 'step') step(m.id, m.label, m.detail);
            else if (m.t === 'step-done') { const li = $(`li[data-id="${CSS.escape(m.id)}"]`, stepsEl); if (li) { li.className = 'done'; if (m.detail) { const s = $('span', li) || li.appendChild(document.createElement('span')); s.textContent = m.detail; } } }
            else if (m.t === 'open') showProject(m.id);
            else if (m.t === 'jobfit') renderJobFit(bot, m);
            else if (m.t === 'message') renderMessage(bot, m);
            else if (m.t === 'error') error = m.message;
            else if (m.t === 'done' && typeof m.remaining === 'number') showLeft(m.remaining);
          }
        }
      }
    } catch (e) {
      error = e && e.name === 'TimeoutError' ? 'That took too long to answer. Please try again, maybe with a shorter question.' : "Couldn't reach the assistant. Check your connection and try again.";
    }
    finishBot(bot, answer, error);
    if (answer) history.push({ role: 'assistant', content: answer });
    else history.pop(); // don't keep an unanswered question in the context
    busy = false; sendBtn.disabled = false; panel.removeAttribute('aria-busy');
    if (!phone.matches || !panel.hidden) input.focus({ preventScroll: true });
  }
  function finishBot(bot, answer, error) {
    bot.classList.remove('thinking');
    $$('.ai-steps li.running', bot).forEach(li => (li.className = 'done'));
    const label = $('.ai-steps-label', bot); if (label) label.textContent = 'How I answered';
    if (!$$('.ai-steps li', bot).length) $('.ai-steps', bot)?.remove();
    const textEl = $('.ai-text', bot);
    if (error && !answer) { bot.classList.add('err'); textEl.innerHTML = `<p>${esc(error)}</p>`; }
    else if (error) textEl.insertAdjacentHTML('beforeend', `<p class="ai-err">${esc(error)}</p>`);
    else if (!answer && !$('.ai-fit, .ai-mail', bot)) textEl.innerHTML = `<p>${esc("I don't have that information, but I can pass your question to Tanishka.")}</p>`;
    announce.textContent = (textEl.textContent || '').trim().slice(0, 400);
    scrollDown();
  }
})();

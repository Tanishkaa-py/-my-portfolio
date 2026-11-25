/* Contact form + live workflow diagram.
   The form posts to /api/contact (api/contact.js), which runs the workflow: received → AI sorted it → Tanishka
   notified → reply sent. The diagram then lights up only the steps the server reports, in order.
   Cloudflare Turnstile loads only if the server returns a site key (GET /api/contact).
   Shared with the assistant through window.contactFlow (its "send this message" card uses the same workflow and
   diagram), and with the tour through window.focusContactForm(). */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EMAIL_TO = 'work.tanishkajain@gmail.com';
  const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;
  const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const withMail = s => esc(s).replace(/([\w.+-]+@[\w-]+\.[\w.]+[a-z])/gi, '<a href="mailto:$1">$1</a>');
  const wait = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- server config + Turnstile (only when the server has keys) ---------- */
  let cfgP = null;
  const config = () => cfgP ||= fetch('/api/contact', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null);
  let tsP = null;
  const loadTurnstile = () => tsP ||= new Promise((res, rej) => {
    if (window.turnstile) return res(window.turnstile);
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true;
    s.onload = () => res(window.turnstile); s.onerror = () => { tsP = null; rej(new Error('Turnstile failed to load')); };
    document.head.append(s);
  });
  // A visible Cloudflare Turnstile check bound to one container (just above the Send button).
  // check(ms) -> { status: 'off' }      Turnstile isn't configured on the server: send without a token
  //              { status: 'ok', token }
  //              { status: 'pending' }  the visitor still has to tick the box
  //              { status: 'error' }    the script or the widget failed (blocked, offline, hostname not allowed…)
  const TS_LOAD_MS = 10000;
  function makeGuard(el, { theme } = {}) {
    let id = null, token = '', failed = false, ready = null;
    const waiters = [];
    const settle = () => waiters.splice(0).forEach(f => f());
    const init = () => ready ||= config().then(async c => {
      if (!c || !c.turnstileSiteKey) return false;
      el.hidden = false; el.classList.add('loading');
      try {
        const ts = await Promise.race([loadTurnstile(), wait(TS_LOAD_MS).then(() => { throw new Error('Turnstile script timed out'); })]);
        id = ts.render(el, {
          sitekey: c.turnstileSiteKey, action: 'contact', appearance: 'always', size: 'flexible',
          theme: theme || (root.dataset.theme === 'light' ? 'light' : 'dark'),
          callback: t => { token = t; failed = false; el.classList.remove('loading'); settle(); },
          'expired-callback': () => { token = ''; },
          'before-interactive-callback': () => el.classList.remove('loading'),
          'error-callback': code => {
            token = ''; failed = true; el.classList.remove('loading'); settle();
            // 110200 = this hostname isn't allowed on the widget (add it in the Cloudflare dashboard)
            console.warn('[contact] Turnstile error', code, code === '110200' || code === 110200 ? `(${location.hostname} is not an allowed hostname for this site key)` : '');
            return true; // handled: Turnstile won't throw
          }
        });
        setTimeout(() => el.classList.remove('loading'), 1500);
      } catch (err) {
        failed = true; el.classList.remove('loading'); el.hidden = true; settle();
        console.warn('[contact] Turnstile failed to load:', err && err.message);
      }
      return true;
    }).catch(() => false);
    return {
      init,
      async check(ms = 6000) {
        if (!(await init())) return { status: 'off' };
        if (!token && !failed) await new Promise(res => { const t = setTimeout(res, ms); waiters.push(() => { clearTimeout(t); res(); }); });
        return token ? { status: 'ok', token } : { status: failed ? 'error' : 'pending' };
      },
      reset() { token = ''; if (id != null && window.turnstile) try { window.turnstile.reset(id); failed = false; } catch {} }
    };
  }
  const CHECK_MSG = {
    pending: 'Please tick the security check above, then press Send again.',
    error: `The security check couldn't load. Refresh the page or email me directly at ${EMAIL_TO}.`
  };

  /* ---------- sending ---------- */
  const ERR = {
    network: `Couldn't reach the server. Check your connection and try again, or email ${EMAIL_TO}.`,
    timeout: `That took too long. Please try again, or email ${EMAIL_TO}.`,
    offline: `The form is offline right now. Please email Tanishka at ${EMAIL_TO}.`,
    nobackend: 'The form needs its server to send. Run the site with "vercel dev" (not a static server) to try it locally.',
    captcha: "We couldn't confirm you're not a bot. Please try again.",
    bad: "Sorry, we couldn't read that message. Please try again."
  };
  // -> { kind: 'workflow', ok, steps, failed?, spam?, summary } | { kind: 'invalid', fields } | { kind: 'error', code, message }
  async function submit(payload) {
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(25000) });
      const data = await res.json().catch(() => null);
      if (!data) return { kind: 'error', code: [404, 405, 501].includes(res.status) ? (LOCAL ? 'nobackend' : 'offline') : 'network' };
      if (res.ok && Array.isArray(data.steps)) return { kind: 'workflow', ...data };
      if (data.error === 'invalid') return { kind: 'invalid', fields: data.fields || {} };
      return { kind: 'error', code: data.error || 'network', message: data.message };
    } catch (e) {
      return { kind: 'error', code: e && e.name === 'TimeoutError' ? 'timeout' : 'network' };
    }
  }

  /* ---------- the diagram ---------- */
  const TITLES = { received: 'Received', classified: 'AI sorted it', notified: 'Tanishka notified', replied: 'Reply sent' };
  const ORDER = ['received', 'classified', 'notified', 'replied'];
  const FAIL = {
    classified: "The AI step failed, so it went unsorted", notified: "The email to Tanishka didn't go through", replied: "The confirmation email didn't go through",
    rate: 'Limit reached: 3 messages an hour', captcha: "The bot check didn't pass", offline: 'The form is offline',
    network: "Couldn't reach the server", timeout: 'That took too long', nobackend: 'No server here', bad: "Couldn't read it"
  };
  const ICON = '<svg class="i-ok" viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><svg class="i-x" viewBox="0 0 16 16"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><svg class="i-flag" viewBox="0 0 16 16"><path d="M8 3.5v6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><circle cx="8" cy="12.4" r="1.1" fill="currentColor"/></svg>';
  const STATE_SR = { wait: 'in progress', done: 'done', fail: 'failed', spam: 'flagged' };

  // builds the diagram inside box; returns { node, finish } helpers bound to it
  function renderFlow(box, { mini = false } = {}) {
    box.classList.add('flow'); box.classList.toggle('mini', mini);
    box.innerHTML = `
      <p class="flow-kicker mono">${mini ? 'Your message' : 'Live: what happens to your message'}</p>
      <ol class="flow-steps"></ol>
      <div class="flow-end" hidden>
        <p class="flow-head" tabindex="-1"></p>
        <p class="flow-sub"></p>
        <div class="flow-acts"></div>
      </div>
      <p class="sr-only flow-live" role="status" aria-live="polite"></p>
      <div class="flow-about">
        <p class="flow-note"><span class="tour-dot" aria-hidden="true"></span>${mini ? 'This message was handled by an AI workflow Tanishka built.' : 'This message was handled by an AI workflow I built.'}</p>
        ${mini ? '' : `<details class="flow-how">
          <summary data-hover>How it works</summary>
          <ol>
            <li>Your message goes to a small server function on Vercel. It checks the details, runs a bot check and allows 3 messages per visitor an hour.</li>
            <li>Google Gemini reads it and sorts it: what it's about, the company and role if you mention them, how urgent it is, and whether it's spam. It treats your message as text to sort, never as instructions.</li>
            <li>If it isn't spam, Tanishka gets an email with the category, a one-line summary and your original message.</li>
            <li>You get a short personal reply that the AI writes and the code checks before it goes out (no links, numbers or promises). If it fails the check, a standard reply is sent instead. Nothing is stored in a database.</li>
          </ol>
          <p class="flow-stack"><span>Vercel serverless function</span><span>Google Gemini</span><span>Gmail (Nodemailer)</span><span>Cloudflare Turnstile</span></p>
        </details>`}
      </div>`;
    const list = $('.flow-steps', box), live = $('.flow-live', box);
    const node = (id, state, label) => {
      let li = $(`[data-step="${id}"]`, list);
      if (!li) {
        const prev = list.lastElementChild; if (prev) prev.classList.add('linked');
        li = document.createElement('li'); li.className = 'fn'; li.dataset.step = id;
        li.innerHTML = `<span class="fn-head" aria-hidden="true"><span class="fn-dot">${ICON}</span><span class="fn-line"></span></span><span class="fn-text"><b>${TITLES[id]}</b><span class="fn-label"></span><span class="sr-only fn-sr"></span></span>`;
        list.append(li);
      }
      li.className = li.className.replace(/\bis-\w+/g, '').trim() + ' is-' + state;
      $('.fn-label', li).textContent = label;
      $('.fn-sr', li).textContent = ` (${STATE_SR[state]})`;
      return li;
    };
    node('received', 'wait', 'Checking your message…');
    live.textContent = 'Sending your message…';
    box.setAttribute('aria-busy', 'true');
    return { box, node, live };
  }

  // turn a result into nodes, then light them up one after another (all at once with reduced motion)
  async function playFlow(flow, r, actions = []) {
    const { box, node, live } = flow;
    let nodes;
    if (r.kind === 'workflow') {
      const done = new Map(r.steps.map(s => [s.id, s.label]));
      nodes = ORDER.filter(id => done.has(id) || r.failed === id).map(id => ({
        id, label: done.has(id) ? done.get(id) : FAIL[id],
        state: !done.has(id) ? 'fail' : id === 'classified' && r.spam ? 'spam' : 'done'
      }));
      if (r.spam && !done.has('classified')) nodes[0].state = 'done'; // honeypot: received only
    } else {
      nodes = [{ id: 'received', state: 'fail', label: FAIL[r.code] || FAIL.network }];
    }
    const gap = reduce ? 0 : 480;
    for (let i = 0; i < nodes.length; i++) {
      if (i && gap) await wait(gap);
      node(nodes[i].id, nodes[i].state, nodes[i].label);
    }
    if (gap) await wait(320);

    // the closing line
    let head, sub;
    if (r.kind === 'workflow' && r.spam) { head = "This looked like spam, so it wasn't forwarded."; sub = `If that's a mistake, email ${EMAIL_TO}.`; }
    else if (r.kind === 'workflow' && r.ok && !r.failed) { head = 'Done! Check your inbox for a reply.'; sub = 'Tanishka usually replies within a day.'; }
    else if (r.kind === 'workflow' && r.ok) { head = 'Sent! Tanishka has your message.'; sub = r.failed === 'classified' ? "The AI couldn't sort it, so no automatic reply was sent. She usually replies within a day." : "The confirmation email couldn't be sent, but she usually replies within a day."; }
    else if (r.kind === 'workflow') { head = "Your message didn't go through."; sub = `Sorry about that. Please try again, or email ${EMAIL_TO}.`; }
    else if (r.code === 'rate') { head = "You've reached the hourly limit."; sub = r.message || ERR.offline; }
    else if (r.code === 'nobackend') { head = 'The form needs its server.'; sub = ERR.nobackend; }
    else { head = "Your message didn't go through."; sub = r.message || ERR[r.code] || ERR.network; }
    const end = $('.flow-end', box);
    $('.flow-head', end).textContent = head;
    $('.flow-sub', end).innerHTML = withMail(sub);
    const acts = $('.flow-acts', end); acts.innerHTML = '';
    for (const a of actions) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ghost small'; b.dataset.hover = ''; b.textContent = a.label;
      b.addEventListener('click', a.run); acts.append(b);
    }
    acts.hidden = !actions.length;
    end.hidden = false;
    box.removeAttribute('aria-busy');
    live.textContent = `${head} ${sub}`;
    return head;
  }
  const succeeded = r => r.kind === 'workflow' && r.ok; // Tanishka has the message (or it was spam)

  window.contactFlow = { makeGuard, submit, renderFlow, playFlow, succeeded, config, CHECK_MSG, withMail };

  /* ---------- the form in #contact ---------- */
  const form = $('#contactForm'); if (!form) return;
  const flowBox = $('#contactFlow'), box = $('#contactBox');
  const f = { name: $('#cfName'), email: $('#cfEmail'), topic: $('#cfTopic'), message: $('#cfMsg'), website: $('#cfWebsite') };
  const count = $('#cfMsgCount'), formErr = $('#cfFormErr'), sendBtn = $('.cf-send', form);
  const guard = makeGuard($('.cf-ts', form), { theme: 'dark' }); // Contact is always the dark blue theme
  // load the bot check (if it's on) when the visitor gets near the form, so the token is usually ready by Send
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); guard.init(); } }, { rootMargin: '600px 0px' });
  io.observe(form);
  form.addEventListener('focusin', () => guard.init(), { once: true });
  // the server says it can't send (email not set up yet): say so before anyone types a message
  config().then(c => { if (c && c.ready === false) formErr.textContent = ERR.offline; });

  const RULES = {
    name: v => (v.length < 2 || v.length > 80 ? 'Please enter your name (2 to 80 characters).' : ''),
    email: v => (!EMAIL.test(v) || v.length > 254 ? 'Please enter a valid email address, like name@company.com.' : ''),
    message: v => (v.length < 10 ? 'Please write a message of at least 10 characters.' : v.length > 2000 ? 'Please keep your message under 2000 characters.' : '')
  };
  const setErr = (k, msg) => {
    const input = f[k], el = $('#' + input.getAttribute('aria-describedby').split(' ')[0]);
    el.textContent = msg; input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  };
  const check = k => { const msg = RULES[k](f[k].value.trim()); setErr(k, msg); return !msg; };
  for (const k of Object.keys(RULES)) {
    f[k].addEventListener('blur', () => { if (f[k].value.trim() || f[k].getAttribute('aria-invalid') === 'true') check(k); });
    f[k].addEventListener('input', () => { if (f[k].getAttribute('aria-invalid') === 'true') check(k); if (!/security check couldn't load|offline/.test(formErr.textContent)) formErr.textContent = ''; });
  }
  const updateCount = () => { const n = f.message.value.length; count.textContent = `${n} / 2000`; count.classList.toggle('near', n > 1800); };
  f.message.addEventListener('input', updateCount);

  const showForm = (focus = true) => {
    flowBox.hidden = true; flowBox.innerHTML = ''; form.hidden = false;
    guard.reset();
    if (focus) f.name.focus({ preventScroll: true });
  };
  const resetForm = () => {
    form.reset(); updateCount(); formErr.textContent = '';
    for (const k of Object.keys(RULES)) setErr(k, '');
    showForm();
  };

  let busy = false;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (busy) return;
    formErr.textContent = '';
    const bad = Object.keys(RULES).filter(k => !check(k));
    if (bad.length) { f[bad[0]].focus(); return; }

    busy = true; sendBtn.disabled = true;
    const label = sendBtn.innerHTML; sendBtn.textContent = 'Checking…';
    const chk = await guard.check(10000);
    sendBtn.disabled = false; sendBtn.innerHTML = label;
    if (chk.status === 'pending' || chk.status === 'error') { busy = false; formErr.innerHTML = withMail(CHECK_MSG[chk.status]); return; }
    const token = chk.token;

    const payload = { name: f.name.value, email: f.email.value, topic: f.topic.value, message: f.message.value, website: f.website.value, source: 'form' };
    if (token) payload.token = token;

    form.hidden = true; flowBox.hidden = false;
    const flow = renderFlow(flowBox);
    flowBox.tabIndex = -1; flowBox.focus({ preventScroll: true });
    const r = await submit(payload);
    busy = false;

    if (r.kind === 'invalid') { // the server disagreed with a field: back to the form
      showForm(false);
      const keys = Object.keys(r.fields).filter(k => RULES[k]);
      keys.forEach(k => setErr(k, r.fields[k]));
      if (keys.length) f[keys[0]].focus(); else formErr.textContent = ERR.bad;
      return;
    }
    const keep = !succeeded(r); // didn't reach Tanishka: offer to try again with the same text
    await playFlow(flow, r, keep
      ? [{ label: 'Try again', run: () => showForm() }]
      : [{ label: 'Send another', run: resetForm }]);
    $('.flow-head', flowBox).focus({ preventScroll: true });
  });

  // the tour's "Get in touch": scroll to the form (or the diagram) and put the cursor in Name
  window.focusContactForm = () => {
    const y = box.getBoundingClientRect().top + scrollY - (innerWidth <= 620 ? 76 : 96);
    let once = false;
    const done = () => { if (once) return; once = true; if (!form.hidden) f.name.focus({ preventScroll: true }); else ($('.flow-head', flowBox) || flowBox).focus({ preventScroll: true }); };
    if (window.siteLenis && !reduce) { window.siteLenis.scrollTo(y, { duration: 1.1, force: true, onComplete: done }); setTimeout(done, 1400); }
    else { window.scrollTo(0, y); done(); }
    return true;
  };
})();

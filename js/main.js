/* Tanishka Jain portfolio: all interactions, no framework.
   Sections: smooth scroll, clock, cursor, menu, particle field, scroll themes, flip calendar, darkroom portrait,
   magnetic buttons, statement reveal, counters, projects + modal, skills tabs, story timeline,
   certifications, GitHub repos, copy email. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;

  /* ---------- smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  // while an in-page link is scrolling, the theme waits and takes the destination's colours at the end
  let jumping = false, afterJump = () => {};
  const goTo = hash => {
    const el = $(hash);
    if (!el) return;
    const top = hash === '#top';
    jumping = true;
    const done = () => { if (!jumping) return; jumping = false; afterJump(); };
    setTimeout(done, 1600); // fallback if no scroll end event arrives (e.g. already there)
    if (lenis) lenis.scrollTo(top ? 0 : el, { offset: top ? 0 : -10, onComplete: done });
    else {
      addEventListener('scrollend', done, { once: true });
      top ? scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }) : el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    }
    // move keyboard focus too, so the next Tab continues from the section, not the link
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault(); closeMenu(); goTo(a.getAttribute('href'));
  });

  /* ---------- Jaipur clock ---------- */
  const tick = () => {
    try {
      const now = new Date();
      $('#clock').textContent = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }).format(now).toLowerCase();
      $('#today').textContent = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }).format(now);
    } catch {}
  };
  tick(); setInterval(tick, 20000);

  /* ---------- custom cursor ---------- */
  if (fine && !reduce) {
    const cur = $('.cursor'), dot = $('.c-dot'), ring = $('.c-ring');
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
    addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; dot.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`; });
    const loop = () => { rx += (x - rx) * .18; ry += (y - ry) * .18; ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`; requestAnimationFrame(loop); };
    loop();
    document.addEventListener('pointerover', e => cur.classList.toggle('big', !!e.target.closest('[data-hover],a,button')));
    document.addEventListener('pointerleave', () => cur.classList.add('hide'));
    document.addEventListener('pointerenter', () => cur.classList.remove('hide'));
  }

  /* ---------- menu ---------- */
  const menu = $('#menu'), menuBtn = $('#menuBtn'), menuLabel = $('#menuLabel'), main = $('main');
  function openMenu() {
    menu.hidden = false; requestAnimationFrame(() => menu.classList.add('open'));
    menuBtn.setAttribute('aria-expanded', 'true'); menuLabel.textContent = 'Close';
    document.body.classList.add('menu-open'); main.inert = true; lenis && lenis.stop();
    $('a', menu).focus();
  }
  function closeMenu() {
    if (!menu.classList.contains('open')) return;
    menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); menuLabel.textContent = 'Menu';
    document.body.classList.remove('menu-open'); main.inert = false; lenis && lenis.start();
    setTimeout(() => { if (!menu.classList.contains('open')) menu.hidden = true; }, 700);
  }
  menuBtn.addEventListener('click', () => menu.classList.contains('open') ? closeMenu() : openMenu());
  addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) { closeMenu(); menuBtn.focus(); } });

  /* ---------- particle field: a slowly turning sphere of data points behind the whole page ---------- */
  const field = (() => {
    const cv = $('#dust'), ctx = cv.getContext('2d'), root = document.documentElement;
    const pts = [], N = innerWidth < 700 ? 1000 : 2400;
    for (let i = 0; i < N; i++) {
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      pts.push({ x: s * Math.cos(th), y: u, z: s * Math.sin(th) });
    }
    // Where the sphere sits while each section is in the middle of the screen:
    // [centre x, centre y] as a share of the screen, radius as a share of its longer side, strength (dot opacity).
    // Keys are the section's id, or its first class name. Strength stays low behind reading sections.
    const SCENES = {
      hero:        [.62, 1.02, .62, 1],
      marquee:     [.62, 1.02, .62, 1],
      about:       [.88, .52, .30, .5],
      work:        [.94, .18, .22, .4],
      skills:      [.14, .78, .34, .65],
      story:       [.92, .80, .28, .45],
      recognition: [.06, .24, .24, .4],
      github:      [.82, .95, .42, .6],
      contact:     [.50, 1.10, .56, .7]
    };
    let W = 0, H = 0, mx = -9999, my = -9999, rot = 0, raf = 0;
    const rgb = v => {
      v = v.trim();
      if (v[0] === '#') { if (v.length === 4) v = '#' + [...v.slice(1)].map(c => c + c).join(''); return [1, 3, 5].map(i => parseInt(v.slice(i, i + 2), 16)); }
      const m = v.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : [128, 128, 128];
    };
    // colours come from the theme tokens --dot, --dot-near and --dot-alpha in style.css
    const goal = { s: SCENES.hero, dot: [0, 0, 0], near: [0, 0, 0], a: 1 };
    const readTheme = () => { const cs = getComputedStyle(root); goal.dot = rgb(cs.getPropertyValue('--dot')); goal.near = rgb(cs.getPropertyValue('--dot-near')); goal.a = parseFloat(cs.getPropertyValue('--dot-alpha')) || 1; };
    readTheme();
    const now = { s: [...goal.s], dot: [...goal.dot], near: [...goal.near], a: goal.a };
    const ease = (a, b, k) => a + (b - a) * k;
    const size = () => { const d = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    const step = () => {
      const kp = reduce ? 1 : .025, kc = reduce ? 1 : .06; // position drifts over ~2s, colour fades over ~0.8s
      now.s = now.s.map((v, i) => ease(v, goal.s[i], kp));
      now.dot = now.dot.map((v, i) => ease(v, goal.dot[i], kc));
      now.near = now.near.map((v, i) => ease(v, goal.near[i], kc));
      now.a = ease(now.a, goal.a, kc);
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const [fx, fy, fr, strength] = now.s;
      const R = Math.max(W, H) * fr, cx = W * fx, cy = H * fy, k = strength * now.a * (W < 700 ? .8 : 1);
      const c = Math.cos(rot), s = Math.sin(rot), tilt = .32, ct = Math.cos(tilt), st = Math.sin(tilt);
      const dot = 'rgb(' + now.dot.map(Math.round) + ')', near = 'rgb(' + now.near.map(Math.round) + ')';
      for (const p of pts) {
        let x = p.x * c - p.z * s, z = p.x * s + p.z * c, y = p.y;
        const y2 = y * ct - z * st; z = y * st + z * ct; y = y2;
        const depth = (z + 1) / 2;
        let sx = cx + x * R, sy = cy + y * R;
        const dx = sx - mx, dy = sy - my, d = Math.hypot(dx, dy);
        if (d < 140) { const f = (1 - d / 140) * 26; sx += dx / d * f; sy += dy / d * f; }
        if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) continue;
        const close = d < 160 ? 1 - d / 160 : 0;
        ctx.globalAlpha = (.18 + depth * .62 + close * .2) * k;
        ctx.fillStyle = close > .1 ? near : dot;
        ctx.fillRect(sx, sy, .7 + depth * 1.7, .7 + depth * 1.7);
      }
      ctx.globalAlpha = 1;
    };
    // reduced motion: one still frame, redrawn only when the theme or screen size changes
    const still = () => { step(); draw(); };
    const loop = () => { raf = 0; if (document.hidden) return; rot += .0016; step(); draw(); raf = requestAnimationFrame(loop); };
    const start = () => { if (!raf && !reduce && !document.hidden) raf = requestAnimationFrame(loop); };
    size();
    addEventListener('resize', () => { size(); if (reduce) still(); });
    if (!reduce) {
      addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
      document.addEventListener('pointerout', e => { if (!e.relatedTarget) mx = my = -9999; });
      document.addEventListener('visibilitychange', start); // the loop stops itself while the tab is hidden
    }
    reduce ? still() : start();
    return { scene(key) { goal.s = SCENES[key] || goal.s; readTheme(); if (reduce) still(); } };
  })();

  /* ---------- theme: the page takes the colours of the section crossing the middle of the screen ---------- */
  (() => {
    const root = document.documentElement;
    let timer = 0, last = null;
    const apply = el => { if (root.dataset.theme !== el.dataset.theme) root.dataset.theme = el.dataset.theme; field.scene(el.id || el.classList[0]); };
    // a section must hold the middle for a moment, and nothing changes during an in-page jump
    // (Back to top, menu links), so fast scrolling doesn't flash through every theme on the way
    const settle = el => { last = el; clearTimeout(timer); if (!jumping) timer = setTimeout(() => apply(el), 120); };
    afterJump = () => last && apply(last);
    const io = new IntersectionObserver(ens => ens.forEach(en => { if (en.isIntersecting) settle(en.target); }), { rootMargin: '-50% 0px -50% 0px' });
    $$('main [data-theme]').forEach(el => io.observe(el));
  })();

  /* ---------- flip calendar ---------- */
  (() => {
    const words = ['Data Scientist', 'AI Engineer', 'Data Analyst', 'Full Stack Developer'];
    const page = $('#flipPage'), next = $('#flipNext');
    $('#flipAll').textContent = words.slice(0, -1).join(', ') + ' and ' + words[words.length - 1];
    let i = 0, onScreen = true;
    new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; }).observe($('#flip'));
    const label = n => `${String(n + 1).padStart(2, '0')} / ${String(words.length).padStart(2, '0')}`;
    const step = () => {
      const n = (i + 1) % words.length;
      next.querySelector('.flip-word').textContent = words[n];
      next.querySelector('.flip-count').textContent = label(n);
      page.classList.add('turn');
      page.addEventListener('animationend', () => {
        page.querySelector('.flip-word').textContent = words[n];
        page.querySelector('.flip-count').textContent = label(n);
        page.classList.remove('turn'); i = n;
      }, { once: true });
    };
    if (!reduce) setInterval(() => { if (onScreen && !document.hidden) step(); }, 2800);
  })();

  /* ---------- darkroom portrait: colour develops under the cursor ---------- */
  (() => {
    const me = $('#me');
    let r = 0, target = 0, x = 50, y = 40, tx = 50, ty = 40, raf = 0;
    const ease = reduce ? 1 : null; // reduced motion: follow the cursor with no easing
    const paint = () => { me.style.setProperty('--r', r.toFixed(1) + 'px'); me.style.setProperty('--x', x + '%'); me.style.setProperty('--y', y + '%'); };
    const loop = () => {
      r += (target - r) * (ease || .12); x += (tx - x) * (ease || .2); y += (ty - y) * (ease || .2);
      const settled = Math.abs(target - r) < .3 && Math.abs(tx - x) < .05 && Math.abs(ty - y) < .05;
      if (settled) { r = target; x = tx; y = ty; }
      paint(); raf = settled ? 0 : requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    me.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const b = me.getBoundingClientRect(); tx = (e.clientX - b.left) / b.width * 100; ty = (e.clientY - b.top) / b.height * 100; target = 110;
      me.classList.add('touched'); kick();
    });
    me.addEventListener('pointerleave', () => { target = 0; kick(); });
    me.addEventListener('click', e => { if (e.pointerType === 'mouse') return; me.classList.toggle('full'); me.classList.add('touched'); });
  })();

  /* ---------- magnetic buttons ---------- */
  if (fine && !reduce) $$('.magnetic').forEach(b => {
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px,${(e.clientY - r.top - r.height / 2) * .35}px)`; });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; b.style.transition = 'transform .5s cubic-bezier(.2,.75,.2,1)'; setTimeout(() => b.style.transition = '', 500); });
  });

  /* ---------- statement: words light up as you scroll ---------- */
  (() => {
    const st = $('#statement');
    const wrap = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(t => { if (!t) return; if (/^\s+$/.test(t)) frag.append(t); else { const s = document.createElement('span'); s.className = 'w'; s.textContent = t; frag.append(s); } });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) wrap(n);
      });
    };
    wrap(st);
    const ws = $$('.w', st);
    if (reduce) return;
    const update = () => {
      const r = st.getBoundingClientRect(), vh = innerHeight;
      const p = Math.min(1, Math.max(0, (vh * .85 - r.top) / (vh * .5 + r.height * .5)));
      const k = Math.round(p * ws.length);
      ws.forEach((w, i) => { w.style.opacity = i < k ? 1 : .16; });
    };
    update(); addEventListener('scroll', update, { passive: true });
  })();

  /* ---------- counters ---------- */
  (() => {
    const nums = $$('.num[data-count]');
    const io = new IntersectionObserver(ens => ens.forEach(en => {
      if (!en.isIntersecting) return; io.unobserve(en.target);
      const el = en.target, to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), t0 = performance.now(), dur = 1500;
      const f = t => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = (to * e).toFixed(dec); if (p < 1) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    }), { threshold: .6 });
    if (!reduce) nums.forEach(n => { if (n.getBoundingClientRect().top > innerHeight) { n.textContent = (0).toFixed(+(n.dataset.dec || 0)); io.observe(n); } });
  })();

  /* ---------- project illustrations ---------- */
  const ART = {
    rings: `<svg viewBox="0 0 300 180"><circle cx="112" cy="90" r="54" class="s-on" stroke-width="2.5"/><circle cx="150" cy="90" r="54" class="s-glow" stroke-width="2.5"/><circle cx="188" cy="90" r="54" class="s-on" stroke-width="2.5" opacity=".35"/><g class="f-glow"><rect x="240" y="108" width="9" height="32" rx="3"/><rect x="255" y="90" width="9" height="50" rx="3" opacity=".55"/><rect x="270" y="70" width="9" height="70" rx="3"/></g></svg>`,
    vital: `<svg viewBox="0 0 300 180"><rect x="18" y="30" width="264" height="120" rx="16" class="f-dim"/><path d="M34 100h52l12-32 18 62 16-48 10 18h42" class="s-glow" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="204" y="56" width="62" height="22" rx="11" class="f-mid"/><rect x="216" y="88" width="50" height="22" rx="11" class="f-glow"/></svg>`,
    chat: `<svg viewBox="0 0 300 180"><rect x="26" y="26" width="150" height="40" rx="20" class="f-dim"/><rect x="44" y="42" width="92" height="8" rx="4" class="f-mid"/><rect x="124" y="80" width="150" height="40" rx="20" class="f-glow"/><rect x="142" y="96" width="100" height="8" rx="4" fill="#0D0E10" opacity=".35"/><rect x="26" y="134" width="64" height="24" rx="12" class="f-dim"/><rect x="98" y="134" width="48" height="24" rx="12" class="f-dim"/><circle cx="250" cy="146" r="13" class="f-on"/><path d="M243 144q7 9 14 0" stroke="#0D0E10" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`,
    braille: (() => { const cells = [[1,0,0,0,0,0],[0,1,1,0,0,0],[1,1,0,0,0,0],[1,0,1,1,0,0]]; let s = '<svg viewBox="0 0 300 180">'; cells.forEach((c, i) => { const x = 52 + i * 58; c.forEach((on, j) => { s += `<circle cx="${x + (j % 2) * 24}" cy="${54 + Math.floor(j / 2) * 32}" r="10" class="${on ? 'f-glow' : 'f-dim'}"/>`; }); }); return s + '</svg>'; })(),
    flow: `<svg viewBox="0 0 300 180"><path d="M62 90h44M150 90c20 0 20-40 44-40M150 90c20 0 20 40 44 40M238 50h20M238 130h20" class="s-on" stroke-width="2" opacity=".35"/><circle cx="44" cy="90" r="18" class="f-dim"/><rect x="106" y="68" width="44" height="44" rx="12" class="f-glow"/><path d="M120 90l6 6 12-12" stroke="#0D0E10" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="194" y="34" width="44" height="32" rx="10" class="f-dim"/><rect x="194" y="114" width="44" height="32" rx="10" class="f-dim"/><circle cx="266" cy="50" r="6" class="f-glow"/><circle cx="266" cy="130" r="6" class="f-glow"/><circle cx="44" cy="90" r="6" class="f-on"/></svg>`,
    bi: `<svg viewBox="0 0 300 180"><rect x="18" y="20" width="124" height="60" rx="12" class="f-dim"/><rect x="32" y="34" width="40" height="7" rx="3.5" class="f-mid"/><text x="32" y="68" font-family="Bricolage Grotesque, sans-serif" font-size="22" font-weight="700" class="f-glow">+30%</text><rect x="158" y="20" width="124" height="140" rx="12" class="f-dim"/><path d="M174 132l22-24 18 12 22-34 26-20" class="s-glow" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><rect x="18" y="96" width="124" height="64" rx="12" class="f-dim"/><g class="f-glow"><rect x="34" y="128" width="12" height="20" rx="3" opacity=".45"/><rect x="54" y="116" width="12" height="32" rx="3"/><rect x="74" y="122" width="12" height="26" rx="3" opacity=".45"/><rect x="94" y="106" width="12" height="42" rx="3"/></g></svg>`,
    nodes: `<svg viewBox="0 0 300 180"><g class="s-on" stroke-width="1.5" opacity=".3"><path d="M60 40L150 90M60 90L150 90M60 140L150 90M150 90L240 60M150 90L240 120M60 40L150 40M150 40L240 60M60 140L150 140M150 140L240 120"/></g><g class="f-on"><circle cx="60" cy="40" r="9"/><circle cx="60" cy="90" r="9"/><circle cx="60" cy="140" r="9"/></g><g class="f-mid"><circle cx="150" cy="40" r="9"/><circle cx="150" cy="140" r="9"/></g><circle cx="150" cy="90" r="13" class="f-glow"/><g class="f-glow"><circle cx="240" cy="60" r="9"/><circle cx="240" cy="120" r="9" opacity=".5"/></g></svg>`,
    code: `<svg viewBox="0 0 300 180"><rect x="20" y="20" width="260" height="140" rx="14" class="f-dim"/><g class="f-mid"><circle cx="40" cy="38" r="5"/><circle cx="56" cy="38" r="5"/><circle cx="72" cy="38" r="5"/></g><rect x="40" y="64" width="80" height="9" rx="4.5" class="f-glow"/><rect x="128" y="64" width="60" height="9" rx="4.5" class="f-mid"/><rect x="60" y="86" width="120" height="9" rx="4.5" class="f-mid"/><rect x="60" y="108" width="90" height="9" rx="4.5" class="f-on" opacity=".7"/><rect x="40" y="130" width="40" height="9" rx="4.5" class="f-glow"/><rect x="200" y="96" width="60" height="44" rx="10" class="f-glow" opacity=".2"/></svg>`
  };

  /* ---------- projects (only what's on the CV) ---------- */
  const P = [
    { id: 'rings', cat: ['ai', 'web', 'data'], art: 'rings', title: '3Rings', kicker: 'AI product · 2026', badge: 'Leading now',
      line: 'One place for creators to see how their YouTube, Instagram and TikTok are growing, with AI advice based on real numbers.',
      meta: [['Role', 'Project Lead and AI full-stack developer'], ['Company', 'Persist Ventures (US)'], ['Status', 'In active development'], ['Stack', 'Next.js, TypeScript, PostgreSQL, Redis, Gemini, AWS']],
      overview: '3Rings is an AI-driven analytics and growth platform for content creators. It brings data from YouTube, Instagram and TikTok together and uses an LLM to turn performance signals into insights and recommendations.',
      did: ['Lead end-to-end delivery: architecture, product decisions and timelines, working with design, API-integration, product and management stakeholders', 'Designed the AI pipeline: platform data ingestion, signal extraction, Gemini inference and Redis-cached serving, on a 16-table PostgreSQL schema', 'Audited AI outputs, traced made-up metrics and ungrounded advice to their root cause, and re-scoped features around verified data', 'Deployed on AWS with CI/CD, leading the move to AWS RDS, and secured Google, Meta and TikTok platform approvals'], links: [] },
    { id: 'chat', cat: ['ai'], art: 'chat', title: 'Emotion-Aware Chatbot', kicker: 'AI research · 2025', badge: '1st prize ×2', win: true,
      line: 'A supportive chatbot that recognises how someone feels and responds with care, built for people facing cyberbullying.',
      meta: [['Role', 'Developer and researcher'], ['Recognition', '1st prize, IIIM Hackathon 3.0 and IISU-ASSET 2025'], ['Accuracy', '95% emotion classification'], ['Stack', 'Python, Flan-T5, DistilBERT, LSTM, Hugging Face, Flask']],
      overview: 'A generative AI chatbot that first detects the emotion behind a message, then replies in a way that fits. It runs as a web app with real-time, multi-turn conversation.',
      did: ['Trained emotion classifiers (LSTM, Random Forest, Logistic Regression) reaching 95% accuracy with cross-validation, tuning and feature engineering', 'Built response generation with Flan-T5 and DistilBERT using RAG-style context injection', 'Deployed it as a Flask web app with real-time conversation', 'Won 1st prize at IIIM Hackathon 3.0 and at the IISU-ASSET 2025 poster presentation'], links: [] },
    { id: 'vital', cat: ['ai', 'web'], art: 'vital', title: 'VitalSync', kicker: 'Healthcare web app · 2026', badge: 'Production',
      line: 'A healthcare dashboard where doctors and patients manage appointments, with an AI health assistant built in.',
      meta: [['Role', 'Full-stack developer'], ['Where', 'Prodesk internship'], ['Status', 'Built and deployed'], ['Stack', 'Next.js 14, TypeScript, MongoDB, Gemini API, JWT']],
      overview: 'VitalSync is a production-grade healthcare dashboard with separate experiences for doctors and patients, and a Gemini-powered assistant that answers health questions using the patient\'s context.',
      did: ['Built the AI Health Assistant with RAG-style context injection and careful prompt design', 'Implemented role-based access so doctors and patients each see only what they should', 'Designed the full REST API: JWT sign-in, CRUD routes, appointment scheduling and data validation', 'Deployed on Vercel and Render with CI/CD workflows'],
      links: [['Frontend code', 'https://github.com/Tanishkaa-py/vitalsync-frontend'], ['Backend code', 'https://github.com/Tanishkaa-py/Vital-sync-backend']] },
    { id: 'braille', cat: ['ai'], art: 'braille', title: 'Text-to-Braille Converter', kicker: 'Accessibility · AI + hardware', badge: 'Assistive tech',
      line: 'Turns typed English into Braille, on screen and as raised physical dots through an Arduino, for visually impaired readers.',
      meta: [['Role', 'Developer'], ['Type', 'Computer vision and hardware'], ['Stack', 'Python, Flask, CNN, OpenCV, Arduino']],
      overview: 'A web app that converts English text into Braille and drives Arduino servo motors to produce tactile output, with a CNN that recognises Braille characters.',
      did: ['Built a CNN for multi-class Braille character recognition', 'Prepared images with OpenCV preprocessing and data augmentation, validated with cross-validation', 'Connected the app to Arduino servo motors over serial for real-time physical Braille output', 'Packaged the whole app to run on Windows'],
      links: [['View code', 'https://github.com/Tanishkaa-py/text-to-braille-project']] },
    { id: 'flow', cat: ['ai'], art: 'flow', title: 'AI Automation Workflows', kicker: 'Agentic automation · 2025', badge: 'Client work',
      line: 'Automated workflows that read, sort and summarise business information on their own, so teams do less manual work.',
      meta: [['Role', 'AI automation intern'], ['Where', 'KodeCrave, for international clients'], ['Stack', 'N8N, LLM nodes, REST APIs, webhooks, ETL']],
      overview: 'Multi-step agentic workflows built in N8N that use LLMs to classify, summarise and route information between business tools.',
      did: ['Designed N8N workflows combining LLM nodes, REST APIs and ETL pipelines', 'Built AI-driven classification, summarisation and process intelligence steps', 'Added error handling, data validation and JSON transformations so pipelines run reliably', 'Tracked pipeline performance with MLOps-style monitoring'], links: [] },
    { id: 'bi', cat: ['data'], art: 'bi', title: 'Executive Reporting Dashboards', kicker: 'Data analytics · 2024', badge: '30% faster',
      line: 'Power BI dashboards and automated reports that helped senior leaders make faster, data-backed decisions.',
      meta: [['Role', 'Data analyst intern'], ['Where', 'Celebal Technologies'], ['Stack', 'SQL, Python, Power Query, Power BI']],
      overview: 'Analysis and reporting work on large datasets, turned into executive dashboards and automated reporting pipelines.',
      did: ['Queried large datasets with complex SQL joins and aggregations for statistical analysis, A/B testing and predictive analytics', 'Automated reporting workflows with Python and Power Query, making reporting 30% faster', 'Built executive Power BI dashboards focused on clear data storytelling'], links: [] }
  ];
  const grid = $('#workGrid');
  grid.innerHTML = P.map(p => `
    <article class="card" data-id="${p.id}" data-cat="${p.cat.join(' ')}" data-hover>
      <div class="art" aria-hidden="true">${ART[p.art]}</div>
      <div class="card-body">
        <div class="card-top"><span class="mono">${p.kicker}</span><span class="badge${p.win ? ' win' : ''}">${p.badge}</span></div>
        <h3><button class="card-open" type="button" aria-haspopup="dialog">${p.title}</button></h3><p>${p.line}</p>
        <span class="more" aria-hidden="true">Read the story <i>→</i></span>
      </div>
    </article>`).join('');

  // Layout: desktop is a 6-column grid. Pick spans so no row is left half empty:
  // a final row of three, rows of two above it, and one wide card first if the count needs it.
  const mqTab = matchMedia('(max-width:1000px)'), mqPhone = matchMedia('(max-width:620px)');
  const layoutCards = () => {
    const vis = $$('.card', grid).filter(c => !c.hidden), n = vis.length;
    let spans, wideSpan = 6;
    if (mqPhone.matches) { spans = vis.map(() => 1); wideSpan = 0; }
    else if (mqTab.matches) { spans = vis.map((_, i) => n % 2 && i === 0 ? 2 : 1); wideSpan = 2; }
    else if (n < 3) spans = n === 1 ? [6] : [3, 3];
    else { const rest = n - 3; spans = [...(rest % 2 ? [6] : []), ...Array(rest - rest % 2).fill(3), 2, 2, 2]; }
    vis.forEach((c, i) => { c.style.gridColumn = `span ${spans[i]}`; c.classList.toggle('wide', spans[i] === wideSpan); });
  };
  layoutCards();
  [mqTab, mqPhone].forEach(m => m.addEventListener('change', layoutCards));

  $$('.filter').forEach(b => b.addEventListener('click', () => {
    $$('.filter').forEach(x => x.setAttribute('aria-pressed', x === b));
    const f = b.dataset.f;
    $$('.card', grid).forEach(c => { c.hidden = f !== 'all' && !c.dataset.cat.split(' ').includes(f); });
    layoutCards();
  }));

  if (fine && !reduce) $$('.card', grid).forEach(c => {
    c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5; c.style.transform = `perspective(900px) rotateY(${px * 6}deg) rotateX(${-py * 6}deg) translateY(-4px)`; });
    c.addEventListener('pointerleave', () => { c.style.transform = ''; });
  });

  const modal = $('#modal');
  const openP = id => {
    const p = P.find(x => x.id === id); if (!p) return;
    $('#mKicker').textContent = p.kicker; $('#mTitle').textContent = p.title; $('#mLead').textContent = p.line;
    $('#mMeta').innerHTML = p.meta.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
    $('#mLinks').innerHTML = p.links.map(([t, u]) => `<a href="${u}" target="_blank" rel="noopener" data-hover>${t} ↗</a>`).join('');
    $('#mArt').innerHTML = ART[p.art]; $('#mOverview').textContent = p.overview;
    $('#mDid').innerHTML = p.did.map(d => `<li>${d}</li>`).join('');
    modal.showModal ? modal.showModal() : modal.setAttribute('open', '');
    lenis && lenis.stop();
  };
  grid.addEventListener('click', e => { const c = e.target.closest('.card'); if (c) openP(c.dataset.id); });
  $('#mClose').addEventListener('click', () => modal.close());
  modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });
  modal.addEventListener('close', () => lenis && lenis.start());

  /* ---------- skills tabs ---------- */
  (() => {
    const S = [
      { t: 'Data & Analytics', k: 'Find the story in the numbers', d: 'I query large datasets, test ideas with statistics and A/B tests, and build dashboards that leaders actually use to decide.', c: ['SQL', 'Power BI', 'Advanced Excel', 'Pandas', 'A/B testing', 'Statistics'], a: 'bi' },
      { t: 'Machine Learning', k: 'Teach computers to spot patterns', d: 'I train and tune models that recognise patterns, from emotions in text to characters in images, and validate them properly.', c: ['Python', 'PyTorch', 'TensorFlow', 'Scikit-learn', 'NLP', 'OpenCV'], a: 'nodes' },
      { t: 'Generative & Agentic AI', k: 'AI that gives grounded answers', d: 'I build LLM apps and automated agent workflows, and I audit their outputs so the answers stay tied to real data.', c: ['Gemini', 'Claude', 'RAG', 'LangChain', 'N8N', 'Prompt engineering'], a: 'flow' },
      { t: 'Full Stack Products', k: 'From idea to live product', d: 'I take an idea from database design to a deployed web app, with secure sign-in, APIs and the AI built in.', c: ['Next.js', 'React', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS'], a: 'code' }
    ];
    const tabs = $('#tabs'); let cur = 0;
    tabs.innerHTML = S.map((s, i) => `<button class="tab" role="tab" id="tab${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" aria-controls="skillStage" data-i="${i}" data-hover><span class="bar"></span><span class="n">0${i + 1}</span>${s.t}</button>`).join('');
    const show = i => {
      cur = i; const s = S[i];
      $$('.tab', tabs).forEach((t, j) => { t.setAttribute('aria-selected', j === i); t.tabIndex = j === i ? 0 : -1; });
      $('#skillStage').setAttribute('aria-labelledby', `tab${i}`);
      $('#skKicker').textContent = s.k; $('#skTitle').textContent = s.t; $('#skDesc').textContent = s.d;
      $('#skChips').innerHTML = s.c.map(c => `<span class="chip">${c}</span>`).join('');
      $('#skArt').innerHTML = ART[s.a];
      $$('.skill-text > *').forEach(el => { el.style.animation = 'none'; el.offsetHeight; el.style.animation = ''; });
    };
    const manual = () => tabs.classList.add('manual'); // visitor picked a tab: stop auto-advancing
    tabs.addEventListener('click', e => { const t = e.target.closest('.tab'); if (t) { manual(); show(+t.dataset.i); } });
    tabs.addEventListener('keydown', e => {
      const to = { ArrowRight: (cur + 1) % S.length, ArrowLeft: (cur + S.length - 1) % S.length, Home: 0, End: S.length - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault(); manual(); show(to); $(`#tab${cur}`).focus();
    });
    if (!reduce) tabs.addEventListener('animationend', e => { if (e.target.classList.contains('bar')) show((cur + 1) % S.length); });
    show(0);
  })();

  /* ---------- story: rolling year as you scroll ---------- */
  (() => {
    const yearEl = $('#year'), items = $$('#storyList > li');
    $('#storyTotal').textContent = String(items.length).padStart(2, '0');
    yearEl.innerHTML = [0, 1, 2, 3].map(() => `<span class="col">${[...Array(10).keys()].map(n => `<span>${n}</span>`).join('')}</span>`).join('');
    const cols = $$('.col', yearEl);
    const setYear = y => String(y).split('').forEach((d, i) => { cols[i].style.transform = `translateY(-${d}em)`; });
    let active = -1;
    const setActive = i => {
      if (i === active) return; active = i;
      items.forEach((li, j) => li.classList.toggle('on', j === i));
      setYear(items[i].dataset.year);
      $('#storyRange').textContent = items[i].dataset.range;
      $('#storyIdx').textContent = String(i + 1).padStart(2, '0');
      $('#storyBar').style.width = ((i + 1) / items.length * 100) + '%';
    };
    const update = () => {
      const mid = innerHeight * .5; let best = 0, bd = Infinity;
      items.forEach((li, i) => { const r = li.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - mid); if (d < bd) { bd = d; best = i; } });
      setActive(best);
    };
    setActive(0); addEventListener('scroll', update, { passive: true }); update();
  })();

  /* ---------- certifications ---------- */
  const C = [
    { n: 'Google Data Analytics', i: 'Google', m: 'G', bg: '#4285F4', f: true },
    { n: 'TensorFlow Developer Certificate', i: 'TensorFlow', m: 'TF', bg: '#FF6F00', f: true },
    { n: 'AWS Certified Machine Learning', i: 'Amazon Web Services', m: 'aws', bg: '#232F3E', f: true },
    { n: 'Claude AI Workshop: Task Automation & Building with Claude', i: 'Anthropic · 2025', m: 'A', bg: '#C96442' },
    { n: 'Power BI for Data Analysts', i: 'LinkedIn Learning · 2024', m: 'in', bg: '#0A66C2' },
    { n: 'Intermediate SQL for Data Scientists', i: 'LinkedIn Learning · 2024', m: 'in', bg: '#0A66C2' },
    { n: 'Mastering Data with Machine Learning', i: 'IBM SkillsBuild · 2024', m: 'IBM', bg: '#0F62FE' }
  ];
  const certList = [...C.filter(c => c.f), ...C.filter(c => !c.f)];
  $('#certs').innerHTML = certList.map(c => `<article class="cert${c.f ? ' featured' : ''}" data-hover><div class="issuer"><span class="logo-dot" style="background:${c.bg}">${c.m}</span>${c.i}</div><h4>${c.n}</h4></article>`).join('');
  // split n cards into the fewest rows of at most `max`, as evenly as possible; each card spans 12 / row length
  const rowSpans = (n, max) => { const out = []; let left = n; for (let r = Math.ceil(n / max); r > 0; r--) { const len = Math.ceil(left / r); out.push(...Array(len).fill(12 / len)); left -= len; } return out; };
  const layoutCerts = () => {
    const [fMax, oMax] = mqPhone.matches ? [1, 1] : mqTab.matches ? [2, 2] : [3, 4];
    const cards = $$('#certs .cert'), nF = certList.filter(c => c.f).length;
    const spans = [...rowSpans(nF, fMax), ...rowSpans(cards.length - nF, oMax)];
    cards.forEach((el, i) => { el.style.gridColumn = `span ${spans[i]}`; });
  };
  layoutCerts();
  [mqTab, mqPhone].forEach(m => m.addEventListener('change', layoutCerts));

  /* ---------- GitHub repos ---------- */
  const R = [
    { n: 'CineStream', d: 'Netflix-style movie discovery with infinite scroll, favourites and AI mood-based recommendations.', l: 'React', c: '#61DAFB', code: 'https://github.com/Tanishkaa-py/Cine-Stream', live: 'https://cine-stream-6nno.vercel.app/' },
    { n: 'RapidDispatch Helpdesk', d: 'Real-time ticket desk for 50 agents with live locking, so two people never overwrite the same ticket.', l: 'WebSockets', c: '#8E9BFF', code: 'https://github.com/Tanishkaa-py/live-ops-helpdesk' },
    { n: 'Aura Engine', d: 'Inventory dashboard designed for 50,000+ products, with fast paginated queries and analytics.', l: 'Node.js · MongoDB', c: '#3DD68C', code: 'https://github.com/Tanishkaa-py/AuraEngine' },
    { n: 'Live Chat Room', d: 'Messages appear instantly across every open browser, built to learn real-time communication.', l: 'Socket.io · React', c: '#EDEBE6', code: 'https://github.com/Tanishkaa-py/live-chat-room', live: 'https://live-chat-room-psi.vercel.app/' },
    { n: 'AI Cover Letter Generator', d: 'Upload a resume and get a personalised cover letter written with the Gemini API.', l: 'Node.js · Gemini', c: '#C99A2E', code: 'https://github.com/Tanishkaa-py/AI-Cover-Letter-Generator' },
    { n: 'Kanban Task Board', d: 'Drag-and-drop task board with priorities, editing, search and saved progress.', l: 'React · dnd-kit', c: '#61DAFB', code: 'https://github.com/Tanishkaa-py/kanban-task-board' }
  ];
  $('#repos').innerHTML = R.map(r => `<article class="repo"><div class="repo-top"><span class="lang"><i style="background:${r.c}"></i>${r.l}</span><span>Public</span></div><h3>${r.n}</h3><p>${r.d}</p><div class="repo-links"><a href="${r.code}" target="_blank" rel="noopener" data-hover>Code ↗</a>${r.live ? `<a href="${r.live}" target="_blank" rel="noopener" data-hover>Live demo ↗</a>` : ''}</div></article>`).join('');

  /* ---------- copy email ---------- */
  $('#copyEmail').addEventListener('click', async () => {
    const l = $('#copyLabel');
    try { await navigator.clipboard.writeText('work.tanishkajain@gmail.com'); l.textContent = 'Copied'; } catch { l.textContent = 'Select to copy'; }
    setTimeout(() => l.textContent = 'Copy', 2200);
  });
})();

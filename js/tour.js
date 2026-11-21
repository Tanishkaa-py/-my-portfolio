/* Guided tour: optional, never autoplays, started from "Take the tour" in the hero.
   Clips (captions, targets, waits, actions) live in data/tour-lines.json. Audio for each clip is assets/tour/{id}.mp3.
   The tour works fully without audio: each caption then plays out over a reading time based on its length.
   UI: one floating "now playing" card (orb + waveform, a 2-line caption that lights up word by word, a tour progress
   line, icon controls). While a clip plays, everything except its target gently dims.
   Uses hooks from main.js: window.siteLenis, openDoor(area), closeDoors(), expandCard(id). */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(pointer: coarse)').matches;
  const startBtn = $('#tourBtn');
  if (!startBtn) return;
  const root = document.documentElement;
  const pad = n => String(n).padStart(2, '0');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const readTime = text => Math.max(5000, text.trim().split(/\s+/).length * 250); // at least 5s, ~¼s per word
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };

  /* ===== FUTURE: AI assistant hook =====
     openAssistant() is where the "Ask about me" agent (CLAUDE.md, ideas for later #3) will open from,
     for example from a button on the tour's last clip. Deliberately does nothing yet. */
  window.openAssistant = () => false;

  /* ---------- data ---------- */
  let DATA = null;
  const load = () => DATA ? Promise.resolve(DATA)
    : fetch('data/tour-lines.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(d => (DATA = d));

  /* ---------- the card ---------- */
  const I = {
    pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="3" width="2.6" height="10" rx="1" fill="currentColor"/><rect x="9.4" y="3" width="2.6" height="10" rx="1" fill="currentColor"/></svg>',
    play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2v9.6a.6.6 0 0 0 .9.5l7.3-4.8a.6.6 0 0 0 0-1L5.9 2.7a.6.6 0 0 0-.9.5z" fill="currentColor"/></svg>',
    next: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.2v9.6a.6.6 0 0 0 .9.5l6.6-4.8a.6.6 0 0 0 0-1L4.4 2.7a.6.6 0 0 0-.9.5z" fill="currentColor"/><rect x="11.4" y="3" width="1.9" height="10" rx=".9" fill="currentColor"/></svg>',
    sound: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 6.2v3.6h2.6L8.6 13V3L5.1 6.2z" fill="currentColor"/><path d="M10.8 5.6a3.3 3.3 0 0 1 0 4.8M12.6 4a5.6 5.6 0 0 1 0 8" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>',
    muted: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 6.2v3.6h2.6L8.6 13V3L5.1 6.2z" fill="currentColor"/><path d="M11 6.2l3.6 3.6M14.6 6.2L11 9.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    close: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  };
  const ui = document.createElement('div');
  ui.className = 'tour'; ui.id = 'tour'; ui.hidden = true;
  ui.setAttribute('role', 'region'); ui.setAttribute('aria-label', 'Guided tour');
  ui.innerHTML = `
    <div class="tc">
      <div class="tc-left">
        <div class="tc-orbrow">
          <button class="tc-orb" type="button" data-act="orb" aria-label="Pause tour" data-hover><span class="tc-orb-ball" aria-hidden="true"></span><span class="tc-orb-play" aria-hidden="true">${I.play}</span></button>
          <span class="tc-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
        </div>
        <span class="tc-count mono" aria-hidden="true"></span>
      </div>
      <div class="tc-main">
        <div class="tc-choices" role="group" aria-label="Choose a tour">
          <button class="tc-choice" type="button" data-mode="full" data-hover><b>Full tour · 2 min</b></button>
          <button class="tc-choice" type="button" data-mode="highlights" data-hover><small>Recruiter in a hurry?</small><b>Highlights · 1 min</b></button>
        </div>
        <div class="tc-cap"><p class="tc-text" aria-live="polite"></p></div>
        <p class="tc-hint" hidden><i></i><span></span></p>
        <div class="tc-end" hidden>
          <a class="tc-pill primary" href="mailto:work.tanishkajain@gmail.com" data-hover>Get in touch</a>
          <button class="tc-pill" type="button" data-act="replay" data-hover>Replay tour</button>
        </div>
      </div>
      <div class="tc-ctl">
        <button class="tc-btn" type="button" data-act="play" aria-label="Pause tour" data-hover>${I.pause}</button>
        <button class="tc-btn" type="button" data-act="next" aria-label="Next" data-hover>${I.next}</button>
        <button class="tc-btn" type="button" data-act="mute" aria-pressed="false" aria-label="Mute voice (captions only)" data-hover>${I.sound}</button>
        <button class="tc-btn" type="button" data-act="close" aria-label="Close tour" data-hover>${I.close}</button>
      </div>
      <span class="tc-progress" aria-hidden="true"><i></i></span>
    </div>`;
  document.body.append(ui);
  // the spotlight: a layer that gently dims the page, with a soft-edged clear window over the clip's target
  const dim = document.createElement('div'); dim.className = 'tour-dim'; dim.setAttribute('aria-hidden', 'true');
  document.body.append(dim);
  const card = $('.tc', ui), orbBtn = $('.tc-orb', ui), text = $('.tc-text', ui), hint = $('.tc-hint', ui);
  const count = $('.tc-count', ui), barEl = $('.tc-progress i', ui), waveBars = $$('.tc-wave i', ui), endBox = $('.tc-end', ui);
  const btn = a => $(`[data-act="${a}"]`, ui);
  const setState = s => { ui.dataset.state = s; };
  new ResizeObserver(() => root.style.setProperty('--tour-h', card.offsetHeight + 'px')).observe(card);

  /* ---------- audio: one <audio> element through an AnalyserNode (orb glow + waveform follow the voice) ---------- */
  const audio = new Audio(); audio.preload = 'auto';
  let actx = null, analyser = null, tbuf = null, fbuf = null;
  // inside the click that starts the tour: create/resume the AudioContext and "unlock" the audio element with a
  // silent sound, so later clips may play even though they start after async work (Safari is strict about this)
  const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
  const unlockAudio = () => {
    try {
      if (!actx) {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = actx.createAnalyser(); analyser.fftSize = 256; tbuf = new Uint8Array(analyser.fftSize); fbuf = new Uint8Array(analyser.frequencyBinCount);
        actx.createMediaElementSource(audio).connect(analyser); analyser.connect(actx.destination);
      }
      if (actx.state === 'suspended') actx.resume();
    } catch { analyser = null; }
    try { audio.src = SILENT; const p = audio.play(); if (p) p.catch(() => {}); } catch {}
  };
  const isClipSrc = () => clip && audio.currentSrc.endsWith(`/assets/tour/${clip.id}.mp3`);
  audio.addEventListener('playing', () => { if (isClipSrc() && clip.slowScroll) slowScroll(); });
  audio.addEventListener('ended', () => { if (isClipSrc()) audioDone = true; });
  audio.addEventListener('error', () => { if (isClipSrc()) fallback(); });

  /* ---------- state ---------- */
  let list = [], idx = -1, mode = 'full', running = false, paused = false, live = false;
  let muted = store.get('tour-muted') === '1';
  let clip = null, t = 0, last = 0, readMs = 0, voice = false, audioDone = false, acted = false, interacted = false;
  let token = 0, ticker = 0, vraf = 0, offs = [], marked = [], slowOn = false, dimEl = null;
  let words = [], cum = [], shownK = -1, lineH = 0, bump = 0;
  const on = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); offs.push(() => el.removeEventListener(ev, fn, opt)); };
  const mark = (el, cls) => { if (el) { el.classList.add(cls); marked.push([el, cls]); } };

  /* ---------- scrolling (the site's Lenis instance; instant with reduced motion) ---------- */
  const headroom = () => (innerWidth <= 620 ? 76 : 96); // keep targets clear of the top bar
  const maxY = () => root.scrollHeight - innerHeight;
  const scrollY_ = (y, opt = {}) => new Promise(res => {
    y = Math.max(0, Math.min(y, maxY()));
    const L = window.siteLenis;
    if (!L || reduce) { window.scrollTo(0, y); return res(); }
    let done = false; const fin = () => { if (!done) { done = true; res(); } };
    const dur = opt.duration ?? Math.min(1.6, .6 + Math.abs(y - scrollY) / 2500);
    L.scrollTo(y, { duration: dur, easing: opt.easing, force: true, onComplete: fin });
    setTimeout(fin, dur * 1000 + 300);
  });
  const stopScroll = () => { const L = window.siteLenis; if (L) L.scrollTo(scrollY, { immediate: true, force: true }); slowOn = false; };
  const yOf = el => el.getBoundingClientRect().top + scrollY - headroom();
  // put the target under the top bar, then make sure what matters (the spotlit Visit site button, or the highlighted
  // block such as the doors) ends up above the card instead of under it
  const toTarget = c => {
    const el = $(c.target); if (!el) return Promise.resolve();
    let y = c.target === '.hero' ? 0 : yOf(el);
    const ringEl = c.ring === false ? null : $(c.ring || c.target);
    const spot = c.action && c.action.highlight && $(c.action.highlight);
    const keep = spot || ringEl;
    if (keep) {
      const limit = card.getBoundingClientRect().top - 20, r = keep.getBoundingClientRect();
      const need = r.bottom + scrollY - limit; // scroll position that puts keep's bottom edge just above the card
      if (need > y) y = spot ? need : Math.min(need, r.top + scrollY - headroom());
    }
    return scrollY_(y);
  };
  // clip 06: glide through the timeline for the rest of the clip, so the year visibly rolls back
  const slowScroll = () => {
    if (slowOn || !clip || !clip.slowScroll) return;
    const items = $$('#storyList > li'); if (!items.length) return;
    const lastLi = items[items.length - 1];
    const endY = lastLi.getBoundingClientRect().top + scrollY + lastLi.offsetHeight / 2 - innerHeight / 2;
    const total = voice && isFinite(audio.duration) ? audio.duration * 1000 : readMs;
    const left = Math.max(1200, total - t - 600);
    slowOn = true;
    if (reduce || !window.siteLenis) { const my = token; setTimeout(() => { if (my === token && !paused) window.scrollTo(0, endY); }, left / 2); return; }
    window.siteLenis.scrollTo(endY, { duration: left / 1000, easing: x => x, force: true, onComplete: () => { slowOn = false; } });
  };

  /* ---------- spotlight ---------- */
  const placeDim = () => {
    if (!dimEl) return;
    const r = dimEl.getBoundingClientRect(), p = 18, f = 90; // padding around the target, feather width
    const L = r.left - p, R = r.right + p, T = r.top - p, B = r.bottom + p;
    const m = `linear-gradient(to right,#000 ${L - f}px,transparent ${L}px,transparent ${R}px,#000 ${R + f}px),linear-gradient(to bottom,#000 ${T - f}px,transparent ${T}px,transparent ${B}px,#000 ${B + f}px)`;
    dim.style.webkitMaskImage = m; dim.style.maskImage = m;
  };
  const dimOn = el => { dimEl = el; placeDim(); dim.classList.add('on'); };
  const dimOff = () => { dimEl = null; dim.classList.remove('on'); };

  /* ---------- caption: words light up as they're spoken ---------- */
  const setCaption = str => {
    text.innerHTML = str.split(/(\s+)/).map(w => (/^\s+$/.test(w) ? w : `<span class="w">${w.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`)).join('');
    words = $$('.w', text);
    // timing weight per word: its length, plus a beat after punctuation
    const wts = words.map(w => w.textContent.length + 2 + (/[.!?]$/.test(w.textContent) ? 6 : /[,:;]$/.test(w.textContent) ? 3 : 0));
    const sum = wts.reduce((a, b) => a + b, 0); let acc = 0;
    cum = wts.map(x => (acc += x) / sum);
    shownK = -1; text.style.transform = ''; lineH = parseFloat(getComputedStyle(text).lineHeight) || 22;
  };
  const paintWords = k => {
    if (k === shownK) return;
    if (k > shownK) bump = 1;
    shownK = k;
    words.forEach((w, i) => { w.className = i < k ? 'w said' : i === k ? 'w now' : 'w'; });
    const cur = words[Math.min(k, words.length - 1)];
    if (cur) { const line = Math.round(cur.offsetTop / lineH); text.style.transform = `translateY(${-Math.max(0, line - 1) * lineH}px)`; } // keep the spoken line visible
  };
  const clipProgress = () => {
    if (!live || !clip) return 0;
    if (voice && isFinite(audio.duration) && audio.duration > 0) return Math.min(1, audio.currentTime / audio.duration);
    const tn = t + (paused ? 0 : performance.now() - last);
    return Math.min(1, tn / readMs);
  };

  /* ---------- per-frame visuals: words, progress line, orb glow, waveform, spotlight position ---------- */
  const visuals = () => {
    vraf = 0;
    if (!running || paused || ui.hidden) return;
    const p = ui.dataset.state === 'ended' ? 1 : clipProgress();
    if (words.length && live) { let k = cum.findIndex(c => c > p); if (k < 0) k = words.length; paintWords(k); }
    barEl.style.transform = `scaleX(${list.length ? Math.min(1, (idx + p) / list.length) : 0})`;
    if (!reduce) {
      let level = 0, bands = null;
      if (voice && analyser && !audio.paused) {
        analyser.getByteTimeDomainData(tbuf); let s = 0; for (const v of tbuf) { const x = (v - 128) / 128; s += x * x; }
        level = Math.min(1, Math.sqrt(s / tbuf.length) * 4);
        analyser.getByteFrequencyData(fbuf); bands = [2, 4, 7, 11, 16].map(i => fbuf[i] / 255);
      } else if (live && !audioDone) { // captions only: a gentle pulse on each new word
        bump *= .9; level = bump * .5; bands = [.5, .9, .7, 1, .6].map(x => x * bump);
      }
      card.style.setProperty('--level', level.toFixed(3));
      waveBars.forEach((b, i) => { b.style.transform = `scaleY(${(.18 + (bands ? bands[i] * .82 : 0)).toFixed(3)})`; });
    }
    placeDim();
    vraf = requestAnimationFrame(visuals);
  };
  const kick = () => { if (!vraf) vraf = requestAnimationFrame(visuals); };

  /* ---------- playing a clip ---------- */
  const cleanupClip = () => {
    offs.forEach(f => f()); offs = [];
    marked.forEach(([el, cls]) => el.classList.remove(cls)); marked = [];
    hint.hidden = true; live = false; slowOn = false; dimOff();
    if (!audio.paused) audio.pause();
  };
  const fallback = () => { if (!voice) return; voice = false; if (clip && clip.slowScroll && !slowOn) slowScroll(); };
  const startVoice = c => {
    voice = false; audioDone = false;
    if (muted) return;
    voice = true;
    audio.src = `assets/tour/${c.id}.mp3`;
    const my = token, p = audio.play();
    if (p) p.catch(() => { if (my === token) fallback(); });
  };
  const armWait = w => {
    acted = false; interacted = false;
    const done = () => { if (acted) return; acted = true; interacted = true; hint.hidden = true; marked.filter(([, c]) => c === 'tour-wait').forEach(([el]) => el.classList.remove('tour-wait')); };
    if (w.type === 'hover') { const el = $(w.selector); if (el) { on(el, 'pointerenter', done); on(el, 'click', done); } }
    else on(document, 'click', e => { if (e.target.closest(w.selector)) done(); }, true);
    if (w.pulse) mark($(w.pulse), 'tour-wait');
    $('span', hint).textContent = (touch && w.hintTouch) || w.hint || 'Your move';
    hint.hidden = false;
  };

  async function play(i) {
    const my = ++token;
    cleanupClip();
    idx = i; clip = list[i];
    if (!clip) return finish();
    if (clip.playIf === 'interacted' && !interacted) return play(i + 1);
    t = 0; audioDone = false; acted = false; readMs = readTime(clip.caption);
    setCaption(clip.caption);
    count.textContent = `${i + 1} / ${list.length}`;
    endBox.hidden = true; btn('next').disabled = false; setState('playing');
    // change the page first (doors, cards), then scroll to what the clip is about
    const a = clip.action || {};
    if (a.closeDoors && window.closeDoors) window.closeDoors();
    if (a.openDoor && window.openDoor) window.openDoor(a.openDoor);
    if (a.expandCard && window.expandCard) { window.expandCard(a.expandCard); await sleep(reduce ? 0 : 700); } // let the card finish widening
    if (a.develop) mark($(a.develop), 'full');
    if (my !== token) return;
    await toTarget(clip);
    if (my !== token) return;
    if (clip.ring !== false) { const el = $(clip.ring || clip.target); if (el) dimOn(el); }
    if (a.highlight) mark($(a.highlight), 'tour-spot');
    if (clip.wait) armWait(clip.wait);
    last = performance.now(); live = true; kick();
    if (paused) return; // paused while we were scrolling: resume() picks it up
    startVoice(clip);
    if (!voice && clip.slowScroll) slowScroll();
  }
  // a single clock moves the tour on: when the voice (or the reading time) is done and any wait is answered or timed out
  const tick = () => {
    const now = performance.now(), dt = now - last; last = now;
    if (!running || paused || !live) return;
    t += dt;
    if (!voice && t >= readMs) audioDone = true;
    const waited = !clip.wait || acted || t >= clip.wait.timeoutMs;
    if (!audioDone || !waited) return;
    if (clip.end) { live = false; paintWords(words.length); barEl.style.transform = 'scaleX(1)'; hint.hidden = true; endBox.hidden = false; btn('next').disabled = true; setState('ended'); return; }
    play(idx + 1);
  };

  /* ---------- controls ---------- */
  const syncButtons = () => {
    const label = paused ? 'Resume tour' : 'Pause tour';
    orbBtn.setAttribute('aria-label', label);
    const b = btn('play'); b.innerHTML = paused ? I.play : I.pause; b.setAttribute('aria-label', label);
    const m = btn('mute'); m.innerHTML = muted ? I.muted : I.sound; m.setAttribute('aria-pressed', muted); m.setAttribute('aria-label', muted ? 'Unmute voice' : 'Mute voice (captions only)');
  };
  function pause() {
    if (!running || paused) return;
    paused = true; audio.pause(); if (slowOn) stopScroll(); dim.classList.remove('on');
    const hadFocus = ui.contains(document.activeElement);
    setState('paused'); syncButtons();
    if (hadFocus) orbBtn.focus({ preventScroll: true });
  }
  async function resume() {
    if (!running || !paused) return;
    paused = false; setState(clip && clip.end && !live ? 'ended' : 'playing'); syncButtons();
    if (!clip || !live) { if (clip && !clip.end) play(idx); return; }
    const my = token;
    if (clip.slowScroll && t > 0) slowScroll();
    else { await toTarget(clip); if (my !== token || paused) return; }
    if (dimEl) dim.classList.add('on');
    last = performance.now(); kick();
    if (t === 0 && !voice && !audioDone) { startVoice(clip); if (!voice && clip.slowScroll) slowScroll(); }
    else if (voice && !audioDone) audio.play().catch(() => fallback());
  }
  const toggleMute = () => {
    muted = !muted; store.set('tour-muted', muted ? '1' : '0'); syncButtons();
    if (muted && voice) { audio.pause(); voice = false; readMs = Math.max(readMs, t + 2000); }
  };
  ui.addEventListener('click', e => {
    const choice = e.target.closest('[data-mode]');
    if (choice) { unlockAudio(); start(choice.dataset.mode); return; } // still inside the click: audio gets unlocked
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'orb' || act === 'play') return paused ? resume() : running ? pause() : null;
    if (act === 'next') { if (paused) { paused = false; syncButtons(); } return play(idx + 1); }
    if (act === 'mute') return toggleMute();
    if (act === 'close') return finish(true);
    if (act === 'replay') { unlockAudio(); return start(mode); }
  });

  /* ---------- opening the card from the hero button ---------- */
  function openChooser() {
    ui.hidden = false; setState('choosing'); root.classList.add('tour-on');
    startBtn.setAttribute('aria-expanded', 'true');
    load().catch(() => {});
    $('.tc-choice', ui).focus({ preventScroll: true });
  }
  startBtn.addEventListener('click', () => {
    if (ui.hidden) return openChooser();
    if (running) { if (paused) resume(); orbBtn.focus({ preventScroll: true }); return; }
    finish(true);
  });

  /* ---------- pause on manual scrolling, the project pop-up or the menu; Esc closes the tour ---------- */
  const SCROLL_KEYS = ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '];
  const userScroll = e => {
    if (!running || paused || !live) return;
    if (e.target.closest && e.target.closest('#tour')) return;
    if (e.type === 'keydown' && (!SCROLL_KEYS.includes(e.key) || e.target.closest('button, a, input, textarea, select, [contenteditable]'))) return;
    pause();
  };
  addEventListener('wheel', userScroll, { passive: true });
  addEventListener('touchmove', userScroll, { passive: true });
  addEventListener('keydown', userScroll);
  const modal = $('#modal');
  if (modal) new MutationObserver(() => { if (modal.open) pause(); }).observe(modal, { attributes: true, attributeFilter: ['open'] });
  new MutationObserver(() => { if (document.body.classList.contains('menu-open')) pause(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  addEventListener('keydown', e => {
    if (e.key !== 'Escape' || ui.hidden) return;
    if ((modal && modal.open) || document.body.classList.contains('menu-open')) return; // Esc closes those first
    finish(true);
  });
  addEventListener('resize', placeDim);

  /* ---------- start / finish ---------- */
  async function start(m) {
    mode = m;
    ui.hidden = false; root.classList.add('tour-on'); startBtn.setAttribute('aria-expanded', 'true');
    setState('playing'); setCaption('Loading the tour…'); count.textContent = ''; barEl.style.transform = 'scaleX(0)';
    let d;
    try { d = await load(); }
    catch { setCaption('Sorry, the tour couldn\'t load. Please try again in a moment.'); paintWords(99); setTimeout(() => finish(), 4000); return; }
    list = m === 'highlights' ? d.highlights.map(id => d.clips.find(c => c.id === id)).filter(Boolean) : d.clips.filter(c => c.only !== 'highlights');
    running = true; paused = false; interacted = false;
    syncButtons();
    if (!ticker) ticker = setInterval(tick, 50);
    orbBtn.focus({ preventScroll: true });
    play(0);
  }
  function finish(byUser) {
    token++; running = false; paused = false;
    cleanupClip(); clip = null; words = [];
    clearInterval(ticker); ticker = 0;
    ui.hidden = true; delete ui.dataset.state;
    root.classList.remove('tour-on'); startBtn.setAttribute('aria-expanded', 'false');
    if (byUser || ui.contains(document.activeElement)) startBtn.focus({ preventScroll: true });
  }
})();

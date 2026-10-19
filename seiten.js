// alatoo.dev: one section = one page. The snapping itself is CSS (stil.css); this file adds the motion between pages,
// the glide on the mouse wheel, the green pill in the header, the stages on the right, the hopping arrow,
// the relief model on the horizon page and the opening animation.

{
const html = document.documentElement;
const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
const seiten = [...document.querySelectorAll('main > section')];
const etappen = [...document.querySelectorAll('.etappen a')];
const pfeil = document.querySelector('.weiter');
const lage = seiten.map(() => 1); // per page, see messe()
let aktiv = -1, geplant = false;

document.querySelectorAll('[data-tiefe]').forEach(el => el.style.setProperty('--d', el.dataset.tiefe));

/* ---------- the green pill in the header slides to the page you are on ---------- */
const kopf = document.querySelector('.kopf'), schlitten = kopf.querySelector('.schlitten');
const reiter = [...kopf.querySelectorAll('.menue a')];
let schlittenX = 0;
function schiebe(sofort = false) {
  const a = reiter.find(r => r.hash === '#' + seiten[aktiv]?.id);
  reiter.forEach(r => r === a ? r.setAttribute('aria-current', 'true') : r.removeAttribute('aria-current'));
  if (!a?.offsetWidth) return schlitten.classList.add('weg'); // the start page has no tab (and phones have no menu)
  const k = kopf.getBoundingClientRect(), r = a.getBoundingClientRect();
  const links = r.left - k.left - kopf.clientLeft, oben = r.top - k.top - kopf.clientTop;
  const neu = sofort || schlitten.classList.contains('weg'); // appears in place instead of sliding in from where it last was
  schlitten.classList.toggle('vor', !neu && links > schlittenX);
  schlitten.classList.toggle('zurueck', !neu && links < schlittenX);
  if (neu) schlitten.style.transition = 'none';
  Object.assign(schlitten.style, { left: `${links}px`, right: `${kopf.clientWidth - links - r.width}px`, top: `${oben}px`, bottom: `${kopf.clientHeight - oben - r.height}px` });
  if (neu) { schlitten.offsetWidth; schlitten.style.transition = ''; }
  schlitten.classList.remove('weg');
  schlittenX = links;
}

// per page -1 … 0 … 1: left upward, in place, still below. A page taller than the screen counts as in place while it fills it.
// --ein/--aus drive the CSS motion; .wartet makes the page title rise again on every arrival.
function messe() {
  geplant = false;
  const h = innerHeight;
  let naechste = 0, abstand = Infinity;
  seiten.forEach((s, i) => {
    const r = s.getBoundingClientRect();
    const p = Math.max(-1, Math.min(1, r.top > 0 ? r.top / h : r.bottom < h ? (r.bottom - h) / h : 0)), q = Math.abs(p);
    lage[i] = p;
    if (!ruhig) { s.style.setProperty('--ein', Math.max(p, 0).toFixed(4)); s.style.setProperty('--aus', Math.max(-p, 0).toFixed(4)); }
    if (q > .98) s.classList.add('wartet'); else if (q < .35) s.classList.remove('wartet');
    if (q < abstand) { abstand = q; naechste = i; }
  });
  if (naechste !== aktiv) {
    aktiv = naechste;
    etappen.forEach((a, i) => i === aktiv ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'));
    schiebe();
  }
  pfeil.classList.toggle('weg', aktiv === seiten.length - 1);
  pfeil.classList.toggle('unterwegs', aktiv > 0);
  weckeRelief();
}
const plane = () => { if (!geplant) { geplant = true; requestAnimationFrame(messe); } };
addEventListener('scroll', plane, { passive: true });
addEventListener('resize', () => { plane(); schiebe(true); });
document.fonts?.ready.then(() => schiebe(true)); // link widths change once the fonts are in

/* ---------- phones: the menu folds out of the round button (stil.css), any choice or tap elsewhere folds it back ---------- */
const menueKnopf = kopf.querySelector('.menue-knopf');
const klappe = auf => { kopf.classList.toggle('offen', auf); menueKnopf.setAttribute('aria-expanded', auf); };
menueKnopf.addEventListener('click', () => klappe(!kopf.classList.contains('offen')));
reiter.forEach((a, i) => { a.style.setProperty('--i', i); a.addEventListener('click', () => klappe(false)); });
document.addEventListener('pointerdown', e => kopf.contains(e.target) || klappe(false));
addEventListener('keydown', e => { if (e.key === 'Escape' && kopf.classList.contains('offen')) { klappe(false); menueKnopf.focus(); } });

/* ---------- glide: one wheel gesture = one page, with our own easing ----------
   Chrome's own snap after a wheel notch was abrupt, and a fast spin skipped pages. Arrow keys stay native (they were fine). */
const fest = matchMedia('(min-width: 881px) and (min-height: 601px)'); // where stil.css snaps mandatory
let faehrt = false, fahrtNr = 0;
const halte = () => { // where a page starts, plus the very bottom (footer)
  const max = html.scrollHeight - innerHeight;
  return [...new Set([...seiten.map(s => Math.min(max, Math.round(s.getBoundingClientRect().top + scrollY))), max])];
};
function gleite(ziel) {
  const start = scrollY, weg = ziel - start, nr = ++fahrtNr;
  if (Math.abs(weg) < 2) return;
  if (ruhig) return scrollTo(0, ziel);
  const dauer = 750 + 250 * Math.sqrt(Math.abs(weg) / innerHeight), t0 = performance.now(); // one page ≈ 1 s
  faehrt = true;
  html.style.scrollSnapType = 'none'; html.style.scrollBehavior = 'auto'; // snapping would fight every step
  const schritt = jetzt => {
    if (nr !== fahrtNr) return;
    const t = Math.min(1, (jetzt - t0) / dauer), e = t < .5 ? 4 * t ** 3 : 1 - (2 - 2 * t) ** 3 / 2; // ease in and out
    scrollTo(0, start + weg * e);
    if (t < 1) return requestAnimationFrame(schritt);
    html.style.scrollSnapType = html.style.scrollBehavior = '';
    faehrt = false;
  };
  requestAnimationFrame(schritt);
}
const kannSelbst = (el, dy) => { // a list or text field under the pointer that can still scroll itself (guestbook)
  for (; el && el !== document.body; el = el.parentElement)
    if (el.scrollHeight > el.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(el).overflowY)
      && (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0)) return true;
  return false;
};
// a gesture ends after 200 ms without wheel events, or when a clearly stronger push starts a new one
// (a trackpad keeps sending weaker and weaker events after a flick, those must not move a second page)
let gesperrt = false, zuletzt = 0, impuls = 0, summe = 0;
addEventListener('wheel', e => {
  if (html.classList.contains('auftakt-laeuft')) return e.preventDefault();
  if (!fest.matches || ruhig || e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX) || kannSelbst(e.target, e.deltaY)) return;
  e.preventDefault();
  const d = Math.abs(e.deltaY) * (e.deltaMode ? 40 : 1), pause = e.timeStamp - zuletzt > 200, staerker = d > impuls * 1.6 + 6;
  zuletzt = e.timeStamp; impuls = d;
  if (faehrt || (gesperrt && !pause && !staerker)) return;
  gesperrt = false;
  summe = pause ? e.deltaY : summe + e.deltaY;
  if (Math.abs(summe) < 20) return;
  summe = 0; gesperrt = true;
  const h = halte(), hier = h.reduce((b, y, i) => Math.abs(y - scrollY) < Math.abs(h[b] - scrollY) ? i : b, 0);
  gleite(h[Math.max(0, Math.min(h.length - 1, hier + Math.sign(e.deltaY)))]);
}, { passive: false });

// links to a page (menu, stages, cards) and the arrow glide the same way
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]'), ziel = a && !a.classList.contains('sprung') && seiten.find(s => `#${s.id}` === a.hash);
  if (!ziel || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  gleite(Math.min(html.scrollHeight - innerHeight, ziel.getBoundingClientRect().top + scrollY));
  ziel.tabIndex = -1; ziel.focus({ preventScroll: true }); // keyboard users continue from there
});
pfeil.addEventListener('click', () => { const h = halte(); gleite(h.find(y => y > scrollY + 4) ?? h.at(-1)); });

/* ---------- 02 horizon: the range as a layered relief model, like a laser-cut contour model ----------
   The contour lines of the map rise layer by layer while the page snaps in, and lie flat again when it leaves.
   Drawn once into one canvas per layer (pixels from a height field, edges antialiased), moved in CSS 3D. */
const horizont = document.getElementById('horizont'), relief = horizont?.querySelector('.relief');
let weckeRelief = () => {};
if (relief) {
  const kamera = relief.querySelector('.relief-kamera'), modell = relief.querySelector('.relief-modell');
  const karten = [...horizont.querySelectorAll('.ziel[data-gipfel]')], iH = seiten.indexOf(horizont);
  // the three summits in parts of the model: x, y, height, width; the order is data-gipfel on the cards
  const GIPFEL = [{ x: .32, y: .6, h: .8, r: .2, art: 'erreicht', name: '01' }, { x: .6, y: .32, h: 1.02, r: .22, art: 'nebel', name: '02' }, { x: .76, y: .7, h: .62, r: .14, art: 'frei', name: '03' }];
  const N = 14; // layers
  let schichten = [], stifte = [], wolken = [], groesse = 0, dz = 0, bauNr = 0;

  const farbe = name => { const n = parseInt(getComputedStyle(html).getPropertyValue(name).trim().slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mische = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

  function baue() {
    const nr = ++bauNr;
    groesse = modell.clientWidth;
    if (!groesse) return;
    modell.querySelectorAll('.schicht, .stift, .wolke').forEach(el => el.remove());
    const R = Math.round(groesse * Math.min(devicePixelRatio || 1, 1.5)), px = 1 / R;
    // height field: three bells, the map's terrain noise for a natural edge (fbm from karte.js, on a coarse grid), fading out to the board's edge
    const G = 96, rau = new Float32Array((G + 1) ** 2);
    for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) rau[j * (G + 1) + i] = fbm(i / G * 4 + 3.1, j / G * 4 + 1.7) - .45;
    const feld = new Float32Array(R * R), wem = new Uint8Array(R * R);
    let hMax = 0;
    for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) {
      const u = x * px, v = y * px, gx = u * G, gy = v * G, i = Math.min(G - 1, gx | 0), j = Math.min(G - 1, gy | 0), fx = gx - i, fy = gy - j;
      const n = (rau[j * (G + 1) + i] * (1 - fx) + rau[j * (G + 1) + i + 1] * fx) * (1 - fy) + (rau[(j + 1) * (G + 1) + i] * (1 - fx) + rau[(j + 1) * (G + 1) + i + 1] * fx) * fy;
      let h = 0, best = 0, k = 0;
      for (let gi = 0; gi < 3; gi++) { const g = GIPFEL[gi], b = g.h * Math.exp(-((u - g.x) ** 2 + (v - g.y) ** 2) / (g.r * g.r)); h += b; if (b > best) { best = b; k = gi; } }
      const rand = Math.min(1, Math.max(0, (Math.hypot(u - .5, v - .5) / .5 - .6) / .38));
      h = (h + .16 * n + .05) * (1 - rand * rand * (3 - 2 * rand));
      feld[y * R + x] = h; wem[y * R + x] = k;
      if (h > hMax) hMax = h;
    }
    const steil = new Float32Array(R * R); // height change per pixel, for crisp antialiased edges
    for (let y = 1; y < R - 1; y++) for (let x = 1; x < R - 1; x++) {
      const o = y * R + x;
      steil[o] = Math.max(1e-5, Math.hypot(feld[o + 1] - feld[o - 1], feld[o + R] - feld[o - R]) / 2);
    }
    const stufen = [1, 2, 3, 4, 5].map(i => farbe(`--lage-${i}`));
    if (getComputedStyle(html).getPropertyValue('--karte-dunkel').trim() === '1') stufen.reverse(); // at night the summits glow brighter, like the map's lines
    const schnee = farbe('--schnee'), nebel = farbe('--nebel'), kante = farbe('--karte-linie'), pink = farbe('--wange-text');
    const ebene = k => k / (N + 1) * hMax;
    dz = groesse * .02;

    // pins and fog stand on the highest layer at each summit
    stifte = GIPFEL.map((g, gi) => {
      let top = 0, tx = 0, ty = 0;
      for (let y = 0; y < R; y += 2) for (let x = 0; x < R; x += 2) { const o = y * R + x; if (wem[o] === gi && feld[o] > top) { top = feld[o]; tx = x; ty = y; } }
      const el = document.createElement('div');
      el.className = `stift ${g.art}`;
      el.innerHTML = `<i>${g.name}</i>`;
      if (g.art === 'nebel') el.innerHTML += '<svg viewBox="0 0 46 46"><path d="M12 46 V6 M2 10 H44 M12 4 L2 10 M12 4 L44 10 M38 10 V24"/><rect x="34" y="24" width="8" height="6" rx="1"/></svg>'; // a crane: already under construction
      modell.append(el);
      return { el, x: tx / R * groesse, y: ty / R * groesse, k: Math.min(N, Math.floor(top / hMax * (N + 1))) };
    });
    wolken = [0, 1].map(() => { const el = document.createElement('div'); el.className = 'wolke'; modell.append(el); return el; });

    // one layer per frame, so building never stalls the page
    let k = 1;
    const schicht = () => {
      if (nr !== bauNr || k > N) return;
      const lv = ebene(k), lvOben = ebene(k + 1), schatten = Math.round(R * .012);
      let x0 = R, y0 = R, x1 = 0, y1 = 0;
      for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) if (feld[y * R + x] > lv - .02) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < x0) { k++; return requestAnimationFrame(schicht); }
      x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(R - 1, x1 + 2); y1 = Math.min(R - 1, y1 + 2);
      const w = x1 - x0 + 1, h = y1 - y0 + 1, c = document.createElement('canvas');
      c.width = w; c.height = h; c.className = 'schicht';
      const ctx = c.getContext('2d'), bild = ctx.createImageData(w, h), d = bild.data;
      const t = (k - 1) / (N - 1), s = Math.min(3.999, t * 4), grund = lv > .74 * hMax ? mische(stufen[4], schnee, .7) : mische(stufen[s | 0], stufen[(s | 0) + 1], s % 1);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const o = y * R + x, a = Math.min(1, Math.max(0, (feld[o] - lv) / steil[o] + .5)); // signed distance to the edge, in pixels
        const band = Math.max(0, 1 - Math.abs(feld[o] - lv) / steil[o] / 1.3);
        if (a <= 0 && band <= 0) continue;
        let rgb, alpha;
        const g = GIPFEL[wem[o]];
        if (g.art === 'frei' && lv > .24 * hMax) { // the free summit is only drawn up: dashed outlines, waiting for your idea
          const strich = Math.sin(Math.atan2(y * px - g.y, x * px - g.x) * 22) > -.2 ? 1 : 0;
          rgb = pink; alpha = band * strich;
        } else {
          const so = Math.min(R - 1, y + schatten) * R + Math.min(R - 1, x + schatten);
          const schatt = Math.min(1, Math.max(0, (feld[so] - lvOben) / steil[so] + .5)) * .2; // the layer above casts a little shadow
          rgb = mische(grund.map(v => v * (1 - schatt)), kante, Math.max(0, 1 - (feld[o] - lv) / steil[o] / 1.6) * .75); // the cut edge
          alpha = a;
          if (g.art === 'nebel' && lv > .5 * hMax) { const m = Math.min(1, (lv / hMax - .5) / .45); rgb = mische(rgb, nebel, m * .75); alpha *= 1 - m * .45; }
        }
        const i = ((y - y0) * w + x - x0) * 4;
        d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = alpha * 255;
      }
      ctx.putImageData(bild, 0, 0);
      Object.assign(c.style, { left: `${x0 / R * 100}%`, top: `${y0 / R * 100}%`, width: `${w / R * 100}%`, height: `${h / R * 100}%` });
      c.k = k;
      modell.insertBefore(c, stifte[0].el);
      schichten.push(c);
      k++;
      zeichne(); requestAnimationFrame(schicht);
    };
    schichten = [];
    requestAnimationFrame(schicht);
  }

  // camera and layers follow the page position, the mouse and a slow sway
  const ziel = { x: 0, y: 0 }, ist = { x: 0, y: 0 };
  let laeuft = false, nah = false;
  function zeichne(t = performance.now()) {
    const auf = ruhig ? 1 : Math.max(0, 1 - Math.abs(lage[iH])), weich = auf * auf * (3 - 2 * auf);
    ist.x += (ziel.x - ist.x) * .06; ist.y += (ziel.y - ist.y) * .06;
    const kipp = (54 + ist.y * 6) * weich, dreh = -26 + ist.x * 14 + (ruhig ? 0 : Math.sin(t / 2600) * 3);
    kamera.style.transform = `rotateX(${kipp.toFixed(2)}deg) rotateZ(${dreh.toFixed(2)}deg)`;
    // the layers rise one after the other: low ones first, each sitting on the one below
    const zBei = [0];
    for (let k = 1; k <= N; k++) { const a = Math.min(1, Math.max(0, auf * 1.7 - k / N * .7)); zBei[k] = zBei[k - 1] + dz * a * a * (3 - 2 * a); }
    schichten.forEach(c => { c.style.transform = `translateZ(${zBei[c.k].toFixed(1)}px)`; });
    const dreheZurueck = `rotateZ(${(-dreh).toFixed(2)}deg) rotateX(${(-kipp).toFixed(2)}deg)`;
    stifte.forEach(s => {
      s.el.style.transform = `translate3d(${s.x}px, ${s.y}px, ${zBei[s.k].toFixed(1)}px) ${dreheZurueck} translate(-50%, -100%)`;
      s.el.style.opacity = Math.min(1, Math.max(0, auf * 2 - 1)).toFixed(2);
    });
    const n = stifte[1];
    wolken.forEach((w, i) => { w.style.transform = `translate3d(${n.x}px, ${n.y}px, ${zBei[Math.max(0, n.k - 2 + i)].toFixed(1)}px) ${dreheZurueck} translateZ(${30 + i * 12}px) translate(${i ? -30 : -70}%, ${i ? -40 : -75}%)`; });
    return Math.abs(lage[iH]) < 1 && (Math.abs(ziel.x - ist.x) + Math.abs(ziel.y - ist.y) > .002 || !ruhig); // keeps running while the page is (partly) in view
  }
  const schleife = t => { laeuft = nah && zeichne(t); if (laeuft) requestAnimationFrame(schleife); };
  weckeRelief = () => { if (!laeuft && nah) { laeuft = true; requestAnimationFrame(schleife); } else if (ruhig) zeichne(); };
  new IntersectionObserver(([e]) => {
    nah = e.isIntersecting;
    if (nah && !schichten.length && !stifte.length) baue();
    weckeRelief();
  }, { rootMargin: '60% 0px' }).observe(horizont); // built while you are on the page before
  let bauT;
  new ResizeObserver(() => { if (stifte.length && Math.abs(modell.clientWidth - groesse) > 2) { clearTimeout(bauT); bauT = setTimeout(baue, 200); } }).observe(modell);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => stifte.length && baue());

  if (!ruhig) {
    horizont.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { ziel.x = e.clientX / innerWidth * 2 - 1; ziel.y = e.clientY / innerHeight * 2 - 1; weckeRelief(); } });
    horizont.addEventListener('pointerleave', () => { ziel.x = ziel.y = 0; });
  }
  // a card and its pin light up together; pointing at Gipfel 02 parts the fog a little (there is a crane underneath)
  karten.forEach(karte => {
    const i = +karte.dataset.gipfel, an = ja => { karte.classList.toggle('an', ja); stifte[i]?.el.classList.toggle('an', ja); if (i === 1) relief.classList.toggle('lichtet', ja); };
    karte.addEventListener('pointerenter', () => an(true));
    karte.addEventListener('pointerleave', () => an(false));
    karte.addEventListener('focusin', () => an(true));
    karte.addEventListener('focusout', () => an(false));
  });
}

messe();

/* ---------- opening: the contour lines of a summit are surveyed, Dev pops up on top and flies to his place ----------
   About 2.4 s, any click, key or scroll skips it. Only on a fresh visit (decided in the <head> of index.html). */
const auftakt = document.querySelector('.auftakt');
if (auftakt && html.classList.contains('auftakt-laeuft')) {
  const dev = document.querySelector('.dev'), grund = auftakt.querySelector('.auftakt-grund'), buehne = auftakt.querySelector('.auftakt-buehne');
  const ringe = auftakt.querySelector('.auftakt-ringe'), marke = auftakt.querySelector('.auftakt-marke'), hoehe = auftakt.querySelector('.auftakt-hoehe'), zahl = hoehe.querySelector('span');
  const SPITZE = { x: 16, y: -24 }; // the summit in ring coordinates (viewBox -200 … 200)
  dev.begruesst = true; // he says hello after landing, not behind the curtain

  // nine contour lines, outside in, drifting toward the summit; every fourth is an index contour (thicker, as on real maps)
  for (let i = 0; i < 9; i++) {
    const f = 1 - i / 9.4, punkte = [];
    for (let j = 0; j < 120; j++) {
      const w = j / 120 * Math.PI * 2, r = 190 * f * (1 + f * (.07 * Math.sin(2 * w + .4 + i * .3) + .05 * Math.sin(3 * w + 2.1 - i * .2) + .025 * Math.sin(5 * w + 4.4)));
      punkte.push(`${(SPITZE.x * (1 - f) + r * Math.cos(w)).toFixed(1)} ${(SPITZE.y * (1 - f) + r * Math.sin(w)).toFixed(1)}`);
    }
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', `M${punkte.join('L')}Z`); p.setAttribute('pathLength', '1');
    if (i % 4 === 0) p.classList.add('haupt');
    ringe.append(p);
  }
  marke.replaceChildren(...[...marke.childNodes].flatMap(n => n.nodeType === Node.TEXT_NODE ? [...n.textContent].map(z => Object.assign(document.createElement('span'), { textContent: z })) : [n]));

  // Dev on the summit: a copy of the picture inside the real Dev, which flies to the real Dev's place
  const r = ringe.getBoundingClientRect(), gross = r.width * .26;
  const figur = Object.assign(document.createElement('div'), { className: 'auftakt-dev' });
  figur.append(dev.querySelector(':scope > svg').cloneNode(true));
  Object.assign(figur.style, { width: `${gross}px`, height: `${gross}px`, left: `${r.left + (SPITZE.x + 200) / 400 * r.width - gross / 2}px`, top: `${r.top + (SPITZE.y + 200) / 400 * r.height - gross * .78}px` });
  auftakt.append(figur);

  const laeufe = [];
  const spiele = (el, bilder, o) => laeufe.push(el.animate(bilder, { fill: 'both', ...o }));
  [...ringe.children].forEach((p, i) => spiele(p, [{ strokeDashoffset: 1, opacity: 0 }, { strokeDashoffset: 0, opacity: 1 }], { duration: 850, delay: 60 + i * 80, easing: 'cubic-bezier(.3, .7, .2, 1)' }));
  spiele(hoehe, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: 150, easing: 'ease-out' });
  spiele(figur, [{ transform: 'translateY(40%) scale(0)' }, { transform: 'translateY(-10%) scale(1.12)', offset: .6 }, { transform: 'none' }], { duration: 650, delay: 820, easing: 'cubic-bezier(.2, .8, .3, 1)' });
  [...marke.children].forEach((z, i) => spiele(z, [{ opacity: 0, transform: 'translateY(60%) rotate(8deg)' }, { opacity: 1, transform: 'none' }], { duration: 650, delay: 980 + i * 40, easing: 'cubic-bezier(.2, .9, .3, 1.2)' }));
  // the dive: the summit comes at you, the lines rush past, the page shows through
  const s = buehne.getBoundingClientRect();
  buehne.style.transformOrigin = `${r.left - s.left + (SPITZE.x + 200) / 400 * r.width}px ${r.top - s.top + (SPITZE.y + 200) / 400 * r.height}px`;
  spiele(buehne, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(2.2)', opacity: 1, offset: .5 }, { transform: 'scale(9)', opacity: 0 }], { duration: 900, delay: 1580, easing: 'cubic-bezier(.55, 0, .8, .4)' });
  spiele(marke, [{ opacity: 1 }, { opacity: 0 }], { duration: 250, delay: 1580, easing: 'ease-in' });
  spiele(hoehe, [{ opacity: 1 }, { opacity: 0 }], { duration: 250, delay: 1580, easing: 'ease-in', fill: 'forwards' }); // forwards: must not hide the fade-in before it starts
  spiele(grund, [{ opacity: 1 }, { opacity: 0 }], { duration: 700, delay: 1720, easing: 'ease-in-out' });
  // Dev flies in an arc to his summit on the page
  const z = dev.getBoundingClientRect(), fx = parseFloat(figur.style.left) + gross / 2, fy = parseFloat(figur.style.top) + gross / 2; // not the measured box: it starts at size 0
  const dx = z.left + z.width / 2 - fx, dy = z.top + z.height / 2 - fy, k = z.width / gross;
  spiele(figur, [{ transform: 'none' }, { transform: `translate(${dx * .5}px, ${dy * .5 - 110}px) scale(${(1 + k) / 2}) rotate(-10deg)`, easing: 'cubic-bezier(.3, 0, .6, 1)' }, { transform: `translate(${dx}px, ${dy}px) scale(${k})` }], { duration: 900, delay: 1580, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' });

  // the altimeter climbs while the lines are drawn
  const t0 = performance.now();
  const zaehle = jetzt => { const t = Math.min(1, (jetzt - t0) / 1350); zahl.textContent = Math.round(3100 * (1 - (1 - t) ** 3)).toLocaleString('de-DE'); if (t < 1 && !fertig) requestAnimationFrame(zaehle); };
  requestAnimationFrame(zaehle);

  let fertig = false;
  const ende = () => {
    if (fertig) return;
    fertig = true;
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(n => removeEventListener(n, ueberspringe, true));
    html.classList.remove('auftakt-laeuft');
    figur.remove();
    dev.begruesse?.();
  };
  const ueberspringe = e => {
    if (e.type === 'wheel') { e.preventDefault(); e.stopPropagation(); } // this scroll only skips, it does not move a page yet
    html.classList.remove('auftakt-an'); // the hero shows up right away
    laeufe.forEach(a => a.finish());
    ende();
  };
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(n => addEventListener(n, ueberspringe, { capture: true, passive: n !== 'wheel' }));
  laeufe.at(-1).finished.then(ende, ende);
}
}

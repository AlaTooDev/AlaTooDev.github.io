// <dev-figur>: Dev, the AlaTooDev mascot, alive. One file, no libraries.
//
// Use:     <script src="dev.js" defer></script>
//          <dev-figur></dev-figur>                 size it with CSS (width; it stays square)
// Attributes:
//   gruss="…"   first sentence when Dev comes into view (default: by time of day / returning visitor)
//   stumm       no greeting
//   jubelt      jumps for joy the first time he comes into view
//   begleiter   small companion at the bottom right; peeks out while no other Dev is in view
// Hooks on any element of the page:
//   data-dev-aufregend="Ooh, Peaked!"   Dev gets excited and looks at it (pointer, focus, or when it scrolls into view)
//   data-dev-sagt="…"                   Dev says it and looks at it
// API:     dev.sag(text, ms) · dev.freu(text) · dev.hoppla(text) · dev.schau(x, y, ms) · dev.saetze = [...] (tap sentences)
// Style:   --dev-blase, --dev-blase-text, --dev-schrift (speech bubble), --dev-schatten (drop shadow), --dev-zzz
// Hidden:  tap 7× quickly (dizzy), tap the hat, 20 s without input (tired, then asleep), select text (reads along),
//          mouse leaves the window (says bye).

{ // own block scope: pages load this as a classic script, so its names must not clash with theirs

const NACHT = '#1A1A2E', BLAU = '#4C5FD5', SCHATTEN = '#3A4BBF', WANGE = '#FF8FB1', GOLD = '#FFC53D';
const SAETZE = ['Ich bin ein Berg. Ein kleiner.', 'Mein Hut heißt Kalpak. Tipp mal drauf!', 'Ich pass auf, dass Apps Freude machen.', 'Deine Daten? Bleiben bei dir.'];
const HOEHEN = { weg: '115%', spitze: '70%', lugt: '34%', da: '4%' }; // companion: how far he is tucked below the screen edge

let besuche = 1;
try { besuche = +(localStorage.getItem('dev-besuche') || 0) + 1; localStorage.setItem('dev-besuche', besuche); } catch {}
const stunde = new Date().getHours();
const GRUSS = stunde < 5 || stunde >= 22 ? 'Noch wach? Ich auch.' : besuche > 1 ? 'Da bist du ja wieder!'
  : stunde < 11 ? 'Guten Morgen! Ich bin Dev.' : stunde < 17 ? 'Hallo! Ich bin Dev.' : 'Guten Abend! Ich bin Dev.';

/* ---------- the drawing (same geometry as the logo, viewBox 100 × 100) ---------- */
const KOERPER = 'M46.5 14.5 Q50 8 53.5 14.5 L88 80 Q91 90 80 90 L20 90 Q9 90 12 80 Z';
const HUT = 'M33.8 31.8 Q41.5 34.6 48.4 33.4 L50 38.5 L51.6 33.4 Q58.5 34.6 66.2 31.8 Q67.2 31.6 67.8 32.8 L71.2 38.6 Q71.8 40.6 69.8 41.2 Q60 43.8 50 43.6 Q40 43.8 30.2 41.2 Q28.2 40.6 28.8 38.6 L32.2 32.8 Q32.8 31.6 33.8 31.8 Z';
const stern = (x, y, r) => { const c = r * .18; return `M${x} ${y - r} Q${x + c} ${y - c} ${x + r} ${y} Q${x + c} ${y + c} ${x} ${y + r} Q${x - c} ${y + c} ${x - r} ${y} Q${x - c} ${y - c} ${x} ${y - r} Z`; };
const strich = (cls, d, w = 2.4) => `<path class="strich ${cls}" d="${d}" stroke-width="${w}"/>`;
const auge = (cx, links) => `<g class="auge">
  <g class="a-rund"><ellipse cx="${cx}" cy="61" rx="5.2" ry="6.2" fill="${NACHT}"/>
    <g class="glanz"><circle cx="${cx + 1.66}" cy="58.77" r="1.77" fill="#fff"/><circle cx="${cx - 1.56}" cy="63.36" r=".83" fill="#fff"/></g>
    <g class="sternglanz"><path d="${stern(cx + 1.3, 59, 3)}" fill="#FFE27A"/><circle cx="${cx - 1.8}" cy="63.6" r=".9" fill="#fff"/></g></g>
  ${strich('a-freude', `M${cx - 3.6} 62.2 Q${cx} 56.5 ${cx + 3.6} 62.2`)}
  ${strich('a-zu', `M${cx - 3.8} 61 Q${cx} 64.6 ${cx + 3.8} 61`)}
  ${strich('a-hoppla', links ? `M${cx - 3} 57.6 L${cx + 2.6} 61 L${cx - 3} 64.4` : `M${cx + 3} 57.6 L${cx - 2.6} 61 L${cx + 3} 64.4`)}
  ${strich('a-spirale', `M${cx} 61 a1 1 0 0 1 2 0 a2 2 0 0 1 -4 0 a3 3 0 0 1 6 0 a4 4 0 0 1 -8 0`, 1.5)}
</g>`;
const SVG = `<svg viewBox="0 0 100 100" aria-hidden="true">
<g class="funken">${[[14, 30, 5.5], [86, 22, 5.5], [21, 39, 3]].map(([x, y, r], i) => `<path style="--i:${i}" d="${stern(x, y, r)}" fill="${GOLD}"/>`).join('')}</g>
<g class="figur">
  <path d="${KOERPER}" fill="${SCHATTEN}" stroke="${SCHATTEN}" stroke-width="3" stroke-linejoin="round"/>
  <g class="hut"><path d="${HUT}" fill="${SCHATTEN}" stroke="${SCHATTEN}" stroke-width="3" stroke-linejoin="round"/></g>
  <path d="${KOERPER}" fill="${BLAU}"/>
  <path d="M50 11.25 Q51.75 11.25 53.5 14.5 L88 80 Q91 90 80 90 L78.5 90 L75.5 72 L70 58 L64 47 L59.55 36.4 L55.5 28 Z" fill="${SCHATTEN}"/>
  <path d="M46.5 14.5 Q50 8 53.5 14.5 L66.9 40 Q50 44.5 33.1 40 Z" fill="#F6C9A4"/>
  <path d="M53.5 14.5 L66.9 40 L58.5 40 L52.6 18.5 Z" fill="#E3A781"/>
  <path d="M46.6 18.5 Q48 15.6 49.4 16.4 Q48.6 19 46.9 24.5 Q45.6 22 46.6 18.5 Z" fill="#FFE9D9"/>
  <g class="hut">
    <path class="hut-treffer" d="M46.5 14.5 Q50 8 53.5 14.5 L66.9 40 L33.1 40 Z" fill="#fff" stroke="${SCHATTEN}" stroke-width="3" stroke-linejoin="round" paint-order="stroke"/>
    <path d="M53.5 14.5 L66.9 40 L58.5 40 L52.6 18.5 Z" fill="#DCE1F7"/>
    <path d="M49.6 17 L50.4 17 L50.4 33 L49.6 33 Z" fill="${NACHT}"/>
    <path d="${HUT}" fill="${NACHT}"/><path class="hut-treffer" d="${HUT}" fill="none" stroke="transparent" stroke-width="8" pointer-events="all"/>
  </g>
  <g class="gesicht">
    <g class="augen">${auge(39.5, true)}${auge(60.5, false)}</g>
    ${strich('m-laecheln', 'M46 69.5 Q48 72.7 50 69.5 Q52 72.7 54 69.5', 1.8)}
    <g class="m-offen"><path d="M45 69 Q50 78.5 55 69 Z" fill="${NACHT}"/><ellipse cx="50" cy="72.9" rx="2" ry=".9" fill="${WANGE}"/></g>
    <ellipse class="m-o" cx="50" cy="71.2" rx="2" ry="2.4" fill="${NACHT}"/>
    ${strich('m-wellig', 'M45 71 Q46.25 69.4 47.5 71 T50 71 T52.5 71 T55 71', 1.8)}
    ${strich('m-klein', 'M47.6 70.4 Q50 71.6 52.4 70.4', 1.8)}
    <g class="wangen"><ellipse cx="31" cy="69" rx="5.4" ry="3.2"/><ellipse cx="69" cy="69" rx="5.4" ry="3.2"/></g>
  </g>
  <path class="tropfen" d="M73 42 Q77.5 48.5 73 51.5 Q68.5 48.5 73 42 Z" fill="#BFE3FF" stroke="${SCHATTEN}" stroke-width=".8"/>
  <g class="kreis">${`<path d="${stern(0, 0, 2.8)}" fill="${GOLD}"/>`.repeat(3)}</g>
  <g class="zzz"><text x="70" y="36" style="--i:0">z</text><text x="77" y="27" style="--i:1">z</text><text x="84" y="17" style="--i:2">Z</text></g>
</g></svg>`;

const STIL = `
:host { display: block; position: relative; aspect-ratio: 1; -webkit-tap-highlight-color: transparent; }
:host([begleiter]) {
  position: fixed; z-index: 40; right: max(10px, env(safe-area-inset-right)); bottom: 0; width: clamp(76px, 8vw, 100px);
  transform: translateY(var(--hoehe, 115%)); transition: transform .7s cubic-bezier(.3, 1.35, .5, 1);
}
button { all: unset; display: block; width: 100%; height: 100%; cursor: pointer; border-radius: 30%; }
button:focus-visible { outline: 3px solid var(--dev-fokus, ${WANGE}); outline-offset: 4px; }
svg { display: block; width: 100%; height: 100%; overflow: visible; filter: var(--dev-schatten, drop-shadow(0 12px 14px rgba(10, 11, 26, .3))); }
.strich { fill: none; stroke: ${NACHT}; stroke-linecap: round; stroke-linejoin: round; }
.wangen { fill: ${WANGE}; transition: fill .3s; }
.a-freude, .a-zu, .a-hoppla, .a-spirale, .sternglanz, .m-offen, .m-o, .m-wellig, .m-klein, .funken, .zzz, .tropfen, .kreis { display: none; }
:host([zustand=aufgeregt]) .glanz, :host([zustand=aufgeregt]) .m-laecheln { display: none; }
:host([zustand=aufgeregt]) :is(.sternglanz, .m-offen, .funken) { display: inline; }
:host([zustand=aufgeregt]) .wangen { fill: #FF6F9C; }
:host([zustand=freut]) :is(.a-rund, .m-laecheln) { display: none; }
:host([zustand=freut]) :is(.a-freude, .m-offen, .funken) { display: inline; }
:host([zustand=hoppla]) :is(.a-rund, .m-laecheln) { display: none; }
:host([zustand=hoppla]) :is(.a-hoppla, .m-wellig, .tropfen) { display: inline; }
:host([zustand=schwindelig]) :is(.a-rund, .m-laecheln) { display: none; }
:host([zustand=schwindelig]) :is(.a-spirale, .m-wellig, .kreis) { display: inline; }
:host([zustand=muede]) .m-laecheln { display: none; }
:host([zustand=muede]) .m-klein { display: inline; }
:host([zustand=schlaf]) :is(.a-rund, .m-laecheln) { display: none; }
:host([zustand=schlaf]) :is(.a-zu, .m-o, .zzz) { display: inline; }
:host([zustand=huch]) .m-laecheln { display: none; }
:host([zustand=huch]) :is(.m-o, .tropfen) { display: inline; }
.funken path { transform-box: fill-box; transform-origin: center; animation: funkeln 1.1s ease-in-out infinite; animation-delay: calc(var(--i) * -.37s); }
@keyframes funkeln { 50% { transform: scale(.4) rotate(25deg); opacity: .55; } }
.zzz text { font: 800 10px/1 var(--dev-rund, 'Baloo 2', ui-rounded, system-ui, sans-serif); fill: var(--dev-zzz, #8B97E4); animation: zzz 2.4s ease-in infinite both; animation-delay: calc(var(--i) * .5s); }
@keyframes zzz { 0% { opacity: 0; transform: translate(-3px, 5px); } 30% { opacity: 1; } 100% { opacity: 0; transform: translate(4px, -7px); } }
.blase {
  position: absolute; z-index: 3; left: 50%; bottom: calc(100% + 10px); width: max-content; max-width: min(250px, 78vw); margin: 0;
  padding: 10px 16px; border-radius: 16px; background: var(--dev-blase, ${NACHT}); color: var(--dev-blase-text, #fff);
  font: var(--dev-schrift, 700 .95rem/1.3 system-ui, -apple-system, sans-serif); text-align: center; pointer-events: none;
  opacity: 0; transform: translate(-50%, 8px) scale(.94); transform-origin: 50% 100%;
  transition: opacity .25s, transform .4s cubic-bezier(.3, 1.5, .5, 1);
}
.blase::after { content: ''; position: absolute; left: 50%; bottom: -6px; width: 14px; height: 14px; margin-left: -7px; border-radius: 3px; background: inherit; transform: rotate(45deg); }
.blase.zeigen { opacity: 1; transform: translate(-50%, 0); }
:host([begleiter]) .blase { left: auto; right: 0; transform: translateY(8px) scale(.94); transform-origin: 80% 100%; }
:host([begleiter]) .blase.zeigen { transform: none; }
:host([begleiter]) .blase::after { left: auto; right: 30px; }
@media (prefers-reduced-motion: reduce) { :host([begleiter]), .blase { transition: none; } .funken path, .zzz text { animation: none; } }
`;

/* ---------- what all Devs share: pointer, input, page hooks ---------- */
const alle = new Set();
const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
const feinZeiger = matchMedia('(pointer: fine)').matches;
const zeiger = { x: 0, y: 0, an: false, zeit: -1e9, tempo: 0, weg: 0 };
let letzteEingabe = performance.now(), scrollZeit = -1e9, scrollRichtung = 0, letztesY = scrollY, tschuessZeit = -1e9;
const imBild = new Set(), gesagt = new Map();
const HAKEN = '[data-dev-aufregend],[data-dev-sagt]';

// who speaks: the first Dev in view, else an active companion.
// Measured right now, because the IntersectionObserver reports a frame late after a jump scroll.
const zuSehen = d => { const r = d.getBoundingClientRect(); return Math.min(r.bottom, innerHeight) - Math.max(r.top, 0) > r.height * .35; };
const sprecher = () => [...alle].find(d => !d.begleiter && zuSehen(d)) || [...alle].find(d => d.begleiter && d.aktiv);
const mitte = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

function haken(el, jetzt, warten) {
  const d = sprecher();
  if (!d || d.zustand === 'schwindelig' || jetzt - (gesagt.get(el) ?? -1e9) < 12000 || (warten && jetzt < d.redetBis)) return;
  gesagt.set(el, jetzt);
  if (el.dataset.devAufregend != null) d.aufregen(el, el.dataset.devAufregend);
  else { d.sag(el.dataset.devSagt, 3000); d.ueber = { el, bis: jetzt + 3000 }; }
}

function eingabe() {
  const jetzt = performance.now();
  letzteEingabe = jetzt;
  for (const d of alle) if (d.zustand === 'schlaf' || d.zustand === 'muede') d.wecken();
}

addEventListener('pointermove', e => {
  const jetzt = performance.now();
  if (e.pointerType === 'mouse') {
    const dt = Math.max(1, jetzt - zeiger.zeit);
    zeiger.tempo = zeiger.tempo * .8 + Math.min(4, Math.hypot(e.clientX - zeiger.x, e.clientY - zeiger.y) / dt) * .2;
    Object.assign(zeiger, { x: e.clientX, y: e.clientY, an: true, zeit: jetzt });
    if (zeiger.weg && jetzt - zeiger.weg > 2500) { const d = sprecher(); d?.sag('Da bist du ja wieder!', 2200); d?.sprung(2.4); }
    zeiger.weg = 0;
  }
  eingabe();
}, { passive: true });
addEventListener('pointerdown', e => {
  // touch: Dev looks where you tap
  if (e.pointerType !== 'mouse') for (const d of alle) d.ueber = { x: e.clientX, y: e.clientY, bis: performance.now() + 1200 };
  eingabe();
}, { passive: true });
addEventListener('keydown', eingabe, { passive: true });
addEventListener('scroll', () => {
  scrollRichtung = Math.sign(scrollY - letztesY); letztesY = scrollY; scrollZeit = performance.now(); eingabe();
}, { passive: true });
document.addEventListener('pointerover', e => {
  const el = e.pointerType === 'mouse' && e.target.closest?.(HAKEN);
  if (el) haken(el, performance.now(), false);
});
document.addEventListener('focusin', e => { const el = e.target.closest?.(HAKEN); if (el) haken(el, performance.now(), false); });
document.addEventListener('mouseout', e => {
  if (e.relatedTarget || !feinZeiger) return;
  zeiger.an = false;
  const jetzt = performance.now(), d = sprecher();
  if (!d || jetzt - tschuessZeit < 30000) return;
  tschuessZeit = zeiger.weg = jetzt;
  d.schau(e.clientX, e.clientY < 20 ? -400 : e.clientY, 2000);
  d.sag('Bis bald!', 2000);
});
document.addEventListener('selectionchange', () => {
  if (String(getSelection() ?? '').trim().length < 3) return;
  const d = sprecher();
  if (d && ['normal', 'muede', 'liest'].includes(d.zustand)) d.setze('liest', 2200);
});
// a hook element in the middle of the screen counts as "seen" (works on phones without hover)
const mitteBeobachter = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? imBild.add(e.target) : imBild.delete(e.target)),
  { rootMargin: '-30% 0px -30% 0px' });
const beobachteHaken = () => document.querySelectorAll(HAKEN).forEach(el => mitteBeobachter.observe(el));
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', beobachteHaken) : beobachteHaken();

let pruefZeit = 0;
function schleife(jetzt) {
  requestAnimationFrame(schleife);
  zeiger.tempo *= .9;
  if (jetzt - pruefZeit > 400) { pruefZeit = jetzt; for (const el of imBild) haken(el, jetzt, true); }
  const hauptSichtbar = [...alle].some(d => !d.begleiter && zuSehen(d));
  for (const d of alle) {
    if (d.begleiter) d.platziere(jetzt, hauptSichtbar);
    if (d.begleiter ? d.aktiv : d.sichtbar) d.zeichne(jetzt);
  }
}

/* ---------- one Dev ---------- */
class DevFigur extends HTMLElement {
  saetze = SAETZE;

  connectedCallback() {
    alle.add(this);
    if (this.shadowRoot) return;
    if (alle.size === 1) requestAnimationFrame(schleife);
    this.begleiter = this.hasAttribute('begleiter');
    const w = this.attachShadow({ mode: 'open' });
    w.innerHTML = `<style>${STIL}</style><p class="blase" aria-live="polite"></p><button type="button" aria-label="${this.begleiter ? 'Dev, dein Begleiter' : 'Dev'} antippen">${SVG}</button>`;
    const q = s => w.querySelector(s), qa = s => [...w.querySelectorAll(s)];
    this.el = { blase: q('.blase'), figur: q('.figur'), huete: qa('.hut'), gesicht: q('.gesicht'), augen: qa('.auge'), spiralen: qa('.a-spirale'), kreis: qa('.kreis path') };
    const jetzt = performance.now();
    Object.assign(this, {
      zustand: 'normal', bis: 0, redetBis: 0, ueber: null, wander: { x: 0, y: 0 }, wanderBis: 0, blick: { x: 0, y: 0 }, letztesZiel: { x: 0, y: 0 },
      neigung: 0, neigungV: 0, y: 0, vy: 0, quetsch: 0, quetschV: 0, pupille: 1, lid: 0,
      blinzeln: -1e9, naechstesBlinzeln: jetzt + 1500 + Math.random() * 2000, naechsterHops: 0, hutFlug: null,
      taps: [], tippZahl: 0, satzZahl: 0, sichtbar: false, aktiv: false, hoehe: '', obenBis: 0, t: jetzt,
    });
    this.setAttribute('zustand', 'normal');
    q('button').addEventListener('click', e => this.angetippt(e));
    if (this.begleiter) this.platziere(jetzt, true);
    else new IntersectionObserver(([e]) => {
      this.sichtbar = e.intersectionRatio >= .35;
      if (this.sichtbar && !this.begruesst) { this.begruesst = true; setTimeout(() => this.begruesse(), 500); }
    }, { threshold: [0, .35] }).observe(this);
  }
  disconnectedCallback() { alle.delete(this); }

  begruesse() {
    if (this.hasAttribute('jubelt')) this.freu(); else this.sprung(2);
    const text = this.getAttribute('gruss') ?? (this.hasAttribute('stumm') ? null : GRUSS);
    if (text) this.sag(text, 5200);
  }

  /* --- what pages and the hooks call --- */
  sag(text, ms = 2800) {
    const b = this.el.blase;
    b.textContent = text; b.classList.add('zeigen');
    this.redetBis = performance.now() + ms;
    clearTimeout(this.sagT); this.sagT = setTimeout(() => b.classList.remove('zeigen'), ms);
  }
  setze(zustand, ms = 0) {
    this.zustand = zustand; this.setAttribute('zustand', zustand);
    clearTimeout(this.zustandT); this.bis = ms;
    if (ms) this.zustandT = setTimeout(() => { this.bis = 0; this.setze(this.grundZustand()); }, ms);
  }
  grundZustand() { const ruhe = performance.now() - letzteEingabe; return ruhig ? 'normal' : ruhe > 32000 ? 'schlaf' : ruhe > 20000 ? 'muede' : 'normal'; }
  sprung(v) { if (!ruhig && this.y === 0) { this.vy = -v; this.quetschV += .03; } }
  freu(text) {
    this.setze('freut', 1500);
    this.quetschV -= .05; setTimeout(() => this.sprung(3.6), 90); // crouch first, then jump
    if (text) this.sag(text);
  }
  hoppla(text = 'Hoppla!') { this.setze('hoppla', 1800); this.sag(text, 2400); }
  schau(x, y, ms = 1500) { this.ueber = { x, y, bis: performance.now() + ms }; }
  aufregen(el, text) {
    const jetzt = performance.now();
    this.setze('aufgeregt', 3400); this.naechsterHops = jetzt;
    this.ueber = { el, bis: jetzt + 3400 }; // his eyes point at it: Dev has no arms
    if (text) this.sag(text, 3400);
    if (this.begleiter) this.obenBis = jetzt + 3400;
  }
  wecken() {
    if (this.zustand !== 'schlaf') return this.setze('normal');
    this.setze('huch', 1400); this.sprung(2.8);
    if (this.sichtbar || this.aktiv) this.sag('Huch! Ich war gar nicht weg.', 2400);
  }
  hutWeg() {
    if (this.hutFlug) return;
    this.hutFlug = performance.now(); this.setze('huch', 1200);
    setTimeout(() => this.sag('Hey, mein Kalpak!', 2000), ruhig ? 0 : 950); // after landing, so the bubble doesn't hide the flying hat
    if (ruhig) this.hutFlug = null;
  }

  angetippt(e) {
    const jetzt = performance.now();
    if (this.begleiter) this.obenBis = jetzt + 3500;
    if (e.composedPath().some(n => n.classList?.contains('hut-treffer'))) return this.hutWeg();
    this.taps = this.taps.filter(t => jetzt - t < 2500).concat(jetzt);
    if (this.taps.length >= 7) { this.taps = []; this.setze('schwindelig', 3200); return this.sag('Nicht nochmal! Mir ist schwindelig.', 3200); }
    if (this.zustand === 'schwindelig') return;
    if (this.tippZahl++ % 4 === 3) return this.freu('Hihi, das kitzelt!');
    this.sag(this.saetze[this.satzZahl++ % this.saetze.length]);
    this.sprung(2.4);
  }

  /* --- companion: tucked below the screen edge; peeks while you scroll, comes up when he talks --- */
  platziere(jetzt, hauptSichtbar) {
    const aktiv = !hauptSichtbar && scrollY > innerHeight * .45;
    if (aktiv && !this.warDa) { this.warDa = true; this.obenBis = this.redetBis = jetzt + 3000; setTimeout(() => { this.freu(); this.sag('Ich komm mit!', 2400); }, 450); }
    this.aktiv = aktiv;
    const h = !aktiv ? 'weg' : jetzt < this.redetBis || jetzt < this.obenBis ? 'da' : jetzt - scrollZeit < 1500 ? 'lugt' : 'spitze';
    if (h !== this.hoehe) {
      this.hoehe = h; this.style.setProperty('--hoehe', HOEHEN[h]); this.inert = h === 'weg';
      if (h === 'weg') { this.el.blase.classList.remove('zeigen'); this.redetBis = 0; } // the bubble sits above him and would stay on screen
    }
  }

  // where the eyes want to go, -1 … 1 on both axes
  richtung(x, y) {
    const r = this.getBoundingClientRect(), dx = x - r.left - r.width / 2, dy = y - r.top - r.height * .61, d = Math.hypot(dx, dy) || 1;
    const m = Math.min(1, d / (d + r.width * .45) * 1.25);
    return { x: dx / d * m, y: dy / d * m };
  }
  blickZiel(jetzt) {
    const z = this.zustand, s = jetzt / 1000;
    if (this.hutFlug && jetzt - this.hutFlug < 1100) return { x: 0, y: -1 };
    if (this.ueber && jetzt < this.ueber.bis) return this.ueber.el ? this.richtung(...mitte(this.ueber.el)) : this.richtung(this.ueber.x, this.ueber.y);
    if (z === 'schlaf') return { x: 0, y: .3 };
    if (z === 'liest') return { x: Math.sin(s * 2.6) * .8, y: .4 };
    if (z === 'schwindelig') return { x: Math.cos(s * 8) * .5, y: Math.sin(s * 8) * .5 };
    if (zeiger.an && jetzt - zeiger.zeit < 4000) return this.richtung(zeiger.x, zeiger.y);
    if (jetzt - scrollZeit < 600) return { x: 0, y: scrollRichtung * .7 };
    if (jetzt > this.wanderBis) { // idle: look around in little jumps, often back at you
      const haken = [...imBild], r = Math.random();
      this.wander = r < .4 ? { x: 0, y: 0 } : r < .6 && haken.length ? this.richtung(...mitte(haken[0])) : { x: (Math.random() * 2 - 1) * .9, y: (Math.random() * 1.6 - .6) * .6 };
      this.wanderBis = jetzt + 900 + Math.random() * 2400;
    }
    return this.wander;
  }

  zeichne(jetzt) {
    if (ruhig) return;
    const f = Math.min(50, jetzt - this.t) / 16.67, s = jetzt / 1000, z = this.zustand;
    this.t = jetzt;
    if (!this.bis && (z === 'normal' || z === 'muede')) { const g = this.grundZustand(); if (g !== z) this.setze(g); }

    // eyes: quick like real saccades, slower while reading; a big jump sometimes comes with a blink
    const ziel = this.blickZiel(jetzt), k = 1 - Math.pow(1 - (z === 'liest' ? .1 : .24), f);
    if (Math.hypot(ziel.x - this.letztesZiel.x, ziel.y - this.letztesZiel.y) > .9 && Math.random() < .4) this.naechstesBlinzeln = jetzt;
    this.letztesZiel = ziel;
    this.blick.x += (ziel.x - this.blick.x) * k; this.blick.y += (ziel.y - this.blick.y) * k;
    const { x: bx, y: by } = this.blick;

    const offen = !['schlaf', 'freut', 'hoppla', 'schwindelig'].includes(z);
    if (jetzt > this.naechstesBlinzeln && offen) { this.blinzeln = jetzt; this.naechstesBlinzeln = jetzt + (Math.random() < .2 ? 260 : 2200 + Math.random() * 4200); }
    const p = (jetzt - this.blinzeln) / 170, auf = p >= 0 && p < 1 ? 1 - Math.sin(p * Math.PI) * .92 : 1;
    this.lid += ((z === 'muede' ? .5 : 0) - this.lid) * .05 * f;
    const spannung = feinZeiger && jetzt - zeiger.zeit < 600 ? Math.min(.15, zeiger.tempo * .07) : 0;
    this.pupille += ((z === 'huch' ? 1.25 : z === 'aufgeregt' ? 1.1 : 1 + spannung) - this.pupille) * .15 * f;

    // body: hops with gravity, squash on landing, breathing, leaning toward what he looks at
    if (z === 'aufgeregt' && this.y === 0 && jetzt > this.naechsterHops) { this.vy = -2.1; this.naechsterHops = jetzt + 380 + Math.random() * 220; }
    if (this.hutFlug && jetzt - this.hutFlug > 2300 && !this.hutHops) { this.hutHops = true; this.sprung(2.6); }
    this.vy += .32 * f; this.y += this.vy * f;
    if (this.y > 0) { if (this.vy > 1) this.quetschV -= this.vy * .022; this.y = 0; this.vy = 0; }
    this.quetschV = (this.quetschV - this.quetsch * .18 * f) * Math.pow(.78, f); this.quetsch += this.quetschV * f;
    const atem = Math.sin(s * (z === 'schlaf' ? 1.6 : 2.4)) * (z === 'schlaf' ? .022 : .012), streck = this.y < 0 ? Math.min(.06, -this.vy * .015) : 0;
    const sy = 1 + this.quetsch + atem + streck, sx = 1 - (this.quetsch + streck) * .7 - atem * .5;
    const zittern = z === 'hoppla' ? Math.sin(s * 30) * 3 : 0, taumeln = z === 'schwindelig' ? Math.sin(s * 5) * 9 : 0;
    this.neigungV = (this.neigungV + ((z === 'schlaf' ? 4 : bx * 5) + zittern + taumeln - this.neigung) * .09 * f) * Math.pow(.8, f);
    this.neigung += this.neigungV * f;

    const e = this.el;
    e.figur.setAttribute('transform', `translate(0 ${this.y.toFixed(2)}) rotate(${this.neigung.toFixed(2)} 50 90) translate(50 90) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(-50 -90)`);
    e.gesicht.setAttribute('transform', `translate(${(bx * 1.2).toFixed(2)} ${(by * .9).toFixed(2)})`);
    const ay = auf * (1 - this.lid), pu = this.pupille;
    e.augen.forEach((a, i) => {
      const cx = i ? 60.5 : 39.5;
      a.setAttribute('transform', `translate(${(bx * 2.4).toFixed(2)} ${(by * 2).toFixed(2)}) translate(${cx} 63) scale(${pu.toFixed(3)} ${(pu * ay).toFixed(3)}) translate(${-cx} -63)`);
    });
    if (z === 'schwindelig') {
      e.spiralen.forEach((sp, i) => sp.setAttribute('transform', `rotate(${(-s * 420).toFixed(1)} ${i ? 60.5 : 39.5} 61)`));
      e.kreis.forEach((st, i) => { const w = s * 4 + i * 2.094; st.setAttribute('transform', `translate(${(50 + Math.cos(w) * 19).toFixed(2)} ${(22 + Math.sin(w) * 5).toFixed(2)})`); });
    }

    // the whole kalpak (felt + brim): after a tap on it, it flies off, shows the bald head and lands crooked
    let hx = 0, hy = 0, rot = 0; // the white felt is part of the hat now, so no gaze parallax: it would slide off the head
    if (this.hutFlug) {
      const t = jetzt - this.hutFlug;
      if (t < 900) { const u = t / 900; hy -= 50 * Math.sin(Math.PI * u); hx += 5 * u; rot = 706 * u; }
      else if (t < 2300) { hx += 5; rot = -14 + Math.sin(t / 60) * 4 * Math.max(0, 1 - (t - 900) / 500); }
      else if (t < 2650) { const u = (t - 2300) / 350; hx += 5 * (1 - u); rot = -14 * (1 - u); }
      else { this.hutFlug = null; this.hutHops = false; }
    }
    e.huete.forEach(h => h.setAttribute('transform', `translate(${hx.toFixed(2)} ${hy.toFixed(2)}) rotate(${rot.toFixed(1)} 50 38)`));
  }
}
customElements.get('dev-figur') || customElements.define('dev-figur', DevFigur);
}

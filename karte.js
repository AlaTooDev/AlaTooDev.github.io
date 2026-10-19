// AlaTooDev "Höhenlinien": a living contour map in WebGL, Dev on his summit, visitors set their own peaks. No libraries.

/* ---------- texts you may want to change ---------- */
const SAETZE = ['Ich bin ein Berg. Ein kleiner.', 'Mein Hut heißt Kalpak. Tipp mal drauf!', 'Psst … Peaked kommt bald.', 'Deine Daten? Bleiben bei dir.', 'Klick mal auf die Karte!'];
const GIPFELNAMEN = ['Mount Muskelkater', 'Schnaufkogel', 'Blasenpflasterjoch', 'Kaiserschmarrnspitze', 'Selfiehorn', 'Akku-leer-Kopf', 'Fast-oben-Spitze', 'Puls-180-Grat', 'Mount Müsliriegel', 'Wadenbeißer', 'Hüttenkäsehorn', 'Mount Everest (gefühlt)'];
const VIELE_GIPFEL = 'Du baust Gipfel schneller als ich Apps!';

const html = document.documentElement;
const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
const feinZeiger = matchMedia('(pointer: fine)').matches;
window.karteLaeuft = true; // tells the safety net in index.html that the map script runs (the page motion is in seiten.js)

/* ---------- section titles: split into words that rise out of a mask (CSS .wm) ---------- */
function teileWoerter(h) {
  let i = 0;
  const maske = inhalt => {
    const m = document.createElement('span'), s = document.createElement('span');
    m.className = 'wm'; s.style.setProperty('--i', i++); s.append(inhalt); m.append(s);
    return m;
  };
  // words of plain text get one mask each, an <em> stays whole
  h.replaceChildren(...[...h.childNodes].flatMap(k => k.nodeType === Node.TEXT_NODE
    ? k.textContent.split(/(\s+)/).filter(Boolean).map(t => /^\s+$/.test(t) ? document.createTextNode(t) : maske(t))
    : [maske(k)]));
}
if (!ruhig) $$('h2').forEach(teileWoerter);

/* ---------- Dev lives in dev.js (<dev-figur>); the map only tells him what happens ---------- */
const dev = $('.dev');
dev.saetze = SAETZE; // what he says when tapped; greeting, moods and the rest come from dev.js
/* ---------- pointer: a little hill and a torch on the map ---------- */
const ziel = { x: -9999, y: -9999, an: false }, zeiger = { x: -9999, y: -9999, staerke: 0 };
function setzeZeiger(e) {
  ziel.x = e.clientX; ziel.y = e.clientY; ziel.an = true;
  if (zeiger.x < -9000) { zeiger.x = ziel.x; zeiger.y = ziel.y; }
}
addEventListener('pointermove', setzeZeiger, { passive: true });
addEventListener('pointerdown', setzeZeiger, { passive: true });
addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') ziel.an = false; }, { passive: true });
addEventListener('pointercancel', () => { ziel.an = false; }, { passive: true });
document.addEventListener('mouseout', e => { if (!e.relatedTarget) ziel.an = false; });

/* ---------- the phone in the Peaked card tilts toward the pointer ---------- */
const handy = $('.handy'), peakedKarte = $('.peaked');
if (handy && feinZeiger && !ruhig) {
  peakedKarte.addEventListener('pointermove', e => {
    const r = peakedKarte.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    handy.style.setProperty('--ry', `${(-14 + x * 20).toFixed(1)}deg`);
    handy.style.setProperty('--rx', `${(6 - y * 12).toFixed(1)}deg`);
  });
  peakedKarte.addEventListener('pointerleave', () => { handy.style.removeProperty('--ry'); handy.style.removeProperty('--rx'); });
}

/* ---------- the terrain, in plain JS: SAME math as the shader below (for the altimeter) ---------- */
const fract = x => x - Math.floor(x);
function hash(x, y) {
  let a = fract(x * .1031), b = fract(y * .1031), c = a;
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
  a += d; b += d; c += d;
  return fract((a + b) * c);
}
function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const ab = hash(ix, iy) + (hash(ix + 1, iy) - hash(ix, iy)) * ux;
  const cd = hash(ix, iy + 1) + (hash(ix + 1, iy + 1) - hash(ix, iy + 1)) * ux;
  return ab + (cd - ab) * uy;
}
function fbm(x, y) {
  let v = 0, a = .5;
  for (let i = 0; i < 4; i++) { v += a * noise(x, y); [x, y] = [1.6 * x - 1.2 * y, 1.2 * x + 1.6 * y]; a *= .5; }
  return v;
}
const glocke = (dx, dy, r) => Math.exp(-(dx * dx + dy * dy) / (r * r));
const meter = h => Math.max(0, Math.round(700 + h * 3400));

/* ---------- state shared by map, peaks and altimeter ---------- */
const held = $('.held'), heldText = $('.held-text'), marken = $('.gipfel-marken');
const hm = $('.hoehenmesser'), hmWert = $('.hm-wert'), canvas = $('.karte');
const GIPFEL_HOEHE = .62, GIPFEL_RADIUS = 80, MAX_GIPFEL = 3, LEBENSDAUER = 12000; // older peaks sink back into the map, every peak after 12 s
let gipfel = [], gipfelZahl = 0, welle = null;
const S = { zeit: 0, scroll: 0, zoom: 1, mass: 360, mitteX: 0, mitteY: 0, dev: [0, 0, 1], ziel: [0, -9999, 1], held: null };
const zielTitel = $('#buch-titel');
const AUFTAKT = html.classList.contains('auftakt-an') ? -9 : .2; // the map spreads from Dev; under the opening's clouds (seiten.js) it is already whole

function hoeheBei(x, y) {
  const px = (x - S.mitteX) / (S.mass * S.zoom) + 3.1, py = (y - S.mitteY) / (S.mass * S.zoom) + 1.7 + S.scroll * .35 / S.mass;
  const qx = fbm(px * .9, py * .9 + S.zeit * .03), qy = fbm(px * .9 + 5.2 - S.zeit * .025, py * .9 + 1.3);
  let h = (fbm(px + 1.4 * qx, py + 1.4 * qy) - .22) * 1.7;
  h += 1.05 * glocke(x - S.dev[0], y - S.dev[1], S.dev[2]);
  h += .95 * glocke(x - S.ziel[0], y - S.ziel[1], S.ziel[2]);
  h += .25 * zeiger.staerke * glocke(x - zeiger.x, y - zeiger.y, 120);
  if (S.held) for (const g of gipfel) h += g.jetzt * glocke(x - S.held.left - g.x, y - S.held.top - g.y, GIPFEL_RADIUS); // null until the first frame
  return h;
}

/* ---------- set your own peak ---------- */
const wachse = s => { // easeOutBack over 1.1 s
  if (ruhig) return 1;
  const x = Math.min(Math.max(s / 1.1, 0), 1) - 1;
  return 1 + 2.70158 * x * x * x + 1.70158 * x * x;
};
held.addEventListener('click', e => {
  if (e.target.closest('a, button, dev-figur, .held-text') || getSelection().toString()) return;
  const r = held.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  const lebend = gipfel.filter(g => !g.stirbt);
  if (lebend.length >= MAX_GIPFEL) versinke(lebend[0]);
  const name = GIPFELNAMEN[gipfelZahl % GIPFELNAMEN.length];
  gipfelZahl++;
  const marke = document.createElement('div'), b = document.createElement('b'), small = document.createElement('small');
  marke.className = 'gm'; marke.style.left = `${x}px`; marke.style.top = `${y + 5}px`;
  b.textContent = name;
  small.textContent = `${meter((karte ? hoeheBei(e.clientX, e.clientY) : .8) + GIPFEL_HOEHE).toLocaleString('de-DE')} m`;
  marke.append(b, small, document.createElement('i'));
  marken.append(marke);
  const neu = { x, y, geboren: S.zeit, stirbt: 0, jetzt: 0, marke };
  gipfel.push(neu);
  setTimeout(() => versinke(neu), LEBENSDAUER);
  welle = { x, y, geboren: S.zeit };
  dev.freu?.(gipfelZahl === 6 ? VIELE_GIPFEL : `Neuer Gipfel: ${name}!`);
  dev.schau?.(e.clientX, e.clientY, 1600);
  if (ruhig) einmal();
});

function versinke(g) { // the peak sinks back into the map, its label fades
  if (g.stirbt) return;
  g.stirbt = ruhig ? -1e9 : S.zeit || 1e-6; // calm mode: gone at the next drawing
  g.marke.classList.add('weg');
  setTimeout(() => g.marke.remove(), 700); // the label goes even when the map does not draw (no WebGL, tab in the background)
  einmal();
}

/* ---------- the map: one fragment shader, contour lines of a slowly flowing terrain ---------- */
const FS = `#extension GL_OES_standard_derivatives : enable
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;        // drawing buffer, px
uniform float uDpr;       // buffer px per CSS px
uniform float uZeit;      // s
uniform float uScroll;    // CSS px
uniform float uZoom;      // map zooms in while you scroll out of the hero
uniform float uMass;      // CSS px per noise unit
uniform vec3 uZeiger;     // pointer x, y (CSS px from top left), strength
uniform vec3 uDev;        // Dev's summit x, y, radius
uniform vec3 uZiel;       // the last summit, behind "Sag Hallo"
uniform vec4 uGipfel[8];  // visitor peaks x, y, radius, height
uniform vec4 uWelle;      // ripple x, y, age, on
uniform vec3 uLichtung;   // quiet area behind the headline x, y, radius
uniform float uAuftakt;   // intro: radius of the map spreading out from Dev
uniform float uDimm;      // overall line strength
uniform float uFortschritt; // 0 at the top of the page, 1 at the bottom: colors drift toward dusk
uniform vec3 uGrund, uLinie, uWarm;
uniform float uDunkel;    // 1 = night map (lines glow), 0 = paper map (lines are ink)

float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0., a = .5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= .5; }
  return v;
}
float glocke(vec2 d, float r) { return exp(-dot(d, d) / (r * r)); }

float hoehe(vec2 px) {
  vec2 p = (px - .5 * uRes / uDpr) / (uMass * uZoom) + vec2(3.1, 1.7 + uScroll * .35 / uMass);
  vec2 q = vec2(fbm(p * .9 + vec2(0., uZeit * .03)), fbm(p * .9 + vec2(5.2 - uZeit * .025, 1.3)));
  float h = (fbm(p + 1.4 * q) - .22) * 1.7;
  h += 1.05 * glocke(px - uDev.xy, uDev.z);
  h += .95 * glocke(px - uZiel.xy, uZiel.z);
  h += .25 * uZeiger.z * glocke(px - uZeiger.xy, 120.);
  for (int i = 0; i < 8; i++) h += uGipfel[i].w * glocke(px - uGipfel[i].xy, uGipfel[i].z);
  return h;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  float h = hoehe(px);
  float f = h * 12.;
  float w = fwidth(f);
  float d = abs(fract(f + .5) - .5) / max(w, 1e-4);
  float linie = 1. - smoothstep(.5 * uDpr - .4, .5 * uDpr + .6, d);
  float f5 = f / 5.;
  float d5 = abs(fract(f5 + .5) - .5) / max(fwidth(f5), 1e-4);
  float haupt = 1. - smoothstep(1.05 * uDpr - .5, 1.05 * uDpr + .7, d5);
  float dicht = 1. - smoothstep(.18, .45, w);   // lines closer than a few px: fade instead of moire
  linie *= dicht; haupt *= dicht;

  float licht = .6 + .9 * uZeiger.z * glocke(px - uZeiger.xy, 260.) + .35 * glocke(px - uDev.xy, uDev.z * 1.8) + .7 * glocke(px - uZiel.xy, uZiel.z * 1.6);
  float ruhe = mix(.4, 1., smoothstep(uLichtung.z * .5, uLichtung.z, length((px - uLichtung.xy) * vec2(.75, 1.))));
  float auftakt = 1. - smoothstep(uAuftakt - 160., uAuftakt, length(px - uDev.xy));
  float welle = 0.;
  if (uWelle.w > .5) {
    float dd = length(px - uWelle.xy) - uWelle.z * 420.;
    welle = exp(-dd * dd / 700.) * (1. - smoothstep(.2, 1.5, uWelle.z));
  }

  // far map: bigger, slower, fainter. Depth without 3D (idea from Aura's "Shadow Wave Scroll")
  vec2 pf = (px - .5 * uRes / uDpr) / (uMass * 2.3) + vec2(11.7, 4.2 + uScroll * .12 / uMass);
  float ff = fbm(pf + vec2(uZeit * .01, 0.)) * 9.;
  float wf = fwidth(ff);
  float fern = (1. - smoothstep(.35 * uDpr - .4, .35 * uDpr + .6, abs(fract(ff + .5) - .5) / max(wf, 1e-4))) * (1. - smoothstep(.15, .4, wf));

  // "ala" means colorful: the blue wanders a little, summits glow warm like alpenglow, the page ends at dusk
  float bunt = noise(px / 640. + vec2(uZeit * .015, 3.));
  vec3 farbe = mix(uLinie, mix(uLinie, uWarm, .35), bunt * .6 + uFortschritt * .45);
  farbe = mix(farbe, uWarm, clamp(smoothstep(.95, 1.45, h) + welle, 0., 1.));
  float a = (linie * .3 + haupt * .62) * licht * ruhe * uDimm * auftakt + welle * (linie + haupt) * .9;
  float aFern = fern * .14 * ruhe * auftakt;

  vec3 grund = uGrund + (uDunkel > .5 ? .028 : -.02) * clamp(h, 0., 1.6) * auftakt * uDimm;
  grund = mix(mix(grund, uLinie, aFern), grund + uLinie * aFern, uDunkel);
  vec3 col = mix(mix(grund, farbe, clamp(a, 0., 1.)), grund + farbe * a, uDunkel);
  vec2 uv = gl_FragCoord.xy / uRes;
  col *= 1. - uDunkel * .35 * smoothstep(.35, 1.1, length(uv - vec2(.62, .55)));
  col += (hash(gl_FragCoord.xy + fract(uZeit) * 91.) - .5) * (uDunkel > .5 ? .022 : .016);
  gl_FragColor = vec4(col, 1.);
}`;

const karte = starteKarte();
if (!karte) html.classList.add('ohne-karte');

function starteKarte() {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl || !gl.getExtension('OES_standard_derivatives')) return null;
  const baue = (typ, quelle) => {
    const s = gl.createShader(typ); gl.shaderSource(s, quelle); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  };
  const vs = baue(gl.VERTEX_SHADER, 'attribute vec2 a; void main() { gl_Position = vec4(a, 0., 1.); }'), fs = baue(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // one triangle covers the screen
  const a = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  const u = {};
  for (const n of ['uRes', 'uDpr', 'uZeit', 'uScroll', 'uZoom', 'uMass', 'uZeiger', 'uDev', 'uZiel', 'uGipfel', 'uWelle', 'uLichtung', 'uAuftakt', 'uDimm', 'uFortschritt', 'uGrund', 'uLinie', 'uWarm', 'uDunkel']) u[n] = gl.getUniformLocation(prog, n);

  // colors come from the CSS variables, so stil.css stays the one place to change them
  let F;
  const hex = name => { const n = parseInt(getComputedStyle(html).getPropertyValue(name).trim().slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const leseFarben = () => { F = { grund: hex('--karte-grund'), linie: hex('--karte-linie'), warm: hex('--karte-warm'), dunkel: parseFloat(getComputedStyle(html).getPropertyValue('--karte-dunkel')) || 0 }; };
  leseFarben();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { leseFarben(); einmal(); });
  new MutationObserver(() => { leseFarben(); einmal(); }).observe(html, { attributes: true, attributeFilter: ['data-theme'] }); // explicit theme choice (e.g. in the Claude app)

  // resolution: capped pixel ratio, lowered further if the device struggles
  let qualitaet = 1, proben = [], heldSichtbar = true;
  const groesse = () => {
    const dpr = Math.min(devicePixelRatio || 1, feinZeiger ? 1.5 : 1.25) * qualitaet * (heldSichtbar ? 1 : .7); // lines are dimmed down there anyway
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  };
  const messeTempo = dt => {
    if (qualitaet <= .55 || dt <= 0 || dt > 250) return;
    proben.push(dt);
    if (proben.length < 60) return;
    proben.sort((x, y) => x - y);
    if (proben[30] > 24) { qualitaet = Math.max(.55, qualitaet * .8); groesse(); }
    proben = [];
  };
  new ResizeObserver(() => { groesse(); einmal(); }).observe(canvas);
  groesse();

  const daten = new Float32Array(32), start = performance.now();
  let erstesBild = false;
  function zeichne(jetztMs) {
    groesse();
    S.zeit = ruhig ? 0 : (jetztMs - start) / 1000;
    const glaetten = ruhig ? 1 : .16;
    zeiger.x += (ziel.x - zeiger.x) * glaetten; zeiger.y += (ziel.y - zeiger.y) * glaetten;
    zeiger.staerke = ruhig ? 0 : zeiger.staerke + ((ziel.an ? 1 : 0) - zeiger.staerke) * .06;

    const k = Math.min(1, scrollY / (innerHeight * .9)), weich = k * k * (3 - 2 * k);
    // between two pages the camera lifts off and the lines light up; once a page sits, the map calms down behind the text
    const unterwegs = ruhig ? 0 : Math.sin(Math.PI * fract(scrollY / innerHeight)) ** 2;
    S.scroll = scrollY; S.zoom = (1 + .35 * weich) * (1 + .12 * unterwegs) * (window.anflug || 1); // anflug: the opening's descent (seiten.js)
    S.mass = Math.min(460, Math.max(260, innerWidth * .3));
    S.mitteX = canvas.clientWidth / 2; S.mitteY = canvas.clientHeight / 2;
    const r = dev.getBoundingClientRect();
    S.dev = [r.left + r.width / 2, r.top + r.height * .62, r.width * .95];
    const z = zielTitel.getBoundingClientRect();
    S.ziel = [z.left + z.width / 2, z.top + z.height / 2, Math.min(300, innerWidth * .34)];
    S.held = held.getBoundingClientRect();
    const t = heldText.getBoundingClientRect();

    daten.fill(0);
    gipfel = gipfel.filter(g => { if (g.stirbt && S.zeit - g.stirbt > .8) { g.marke.remove(); return false; } return true; });
    gipfel.forEach((g, i) => {
      g.jetzt = GIPFEL_HOEHE * wachse(S.zeit - g.geboren) * (g.stirbt ? Math.max(0, 1 - (S.zeit - g.stirbt) / .8) : 1);
      if (i < 8) daten.set([S.held.left + g.x, S.held.top + g.y, GIPFEL_RADIUS, g.jetzt], i * 4);
    });
    const alter = welle ? S.zeit - welle.geboren : 9;

    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform1f(u.uDpr, canvas.width / canvas.clientWidth);
    gl.uniform1f(u.uZeit, S.zeit);
    gl.uniform1f(u.uScroll, S.scroll);
    gl.uniform1f(u.uZoom, S.zoom);
    gl.uniform1f(u.uMass, S.mass);
    gl.uniform3f(u.uZeiger, zeiger.x, zeiger.y, zeiger.staerke);
    gl.uniform3f(u.uDev, ...S.dev);
    gl.uniform3f(u.uZiel, ...S.ziel);
    gl.uniform4fv(u.uGipfel, daten);
    gl.uniform4f(u.uWelle, welle ? S.held.left + welle.x : 0, welle ? S.held.top + welle.y : 0, alter, alter < 1.6 && !ruhig ? 1 : 0);
    gl.uniform3f(u.uLichtung, t.left + t.width / 2, t.top + t.height / 2, Math.max(t.width, t.height) * .62);
    const auftakt = (S.zeit - AUFTAKT) / 2.6; // intro wave from Dev; afterwards the whole map stays open
    gl.uniform1f(u.uAuftakt, ruhig || auftakt >= 1 ? 1e6 : Math.max(0, auftakt) ** .6 * (Math.hypot(innerWidth, innerHeight) + 400));
    gl.uniform1f(u.uDimm, 1 - .5 * weich + .45 * unterwegs);
    gl.uniform1f(u.uFortschritt, Math.min(1, scrollY / Math.max(1, html.scrollHeight - innerHeight)));
    gl.uniform3f(u.uGrund, ...F.grund); gl.uniform3f(u.uLinie, ...F.linie); gl.uniform3f(u.uWarm, ...F.warm);
    gl.uniform1f(u.uDunkel, F.dunkel);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // altimeter: the height under the pointer, from the same math
    const ueberKarte = feinZeiger && ziel.an && ziel.y > S.held.top && ziel.y < S.held.bottom && !imText(ziel.x, ziel.y);
    hm.classList.toggle('an', ueberKarte);
    if (ueberKarte) {
      hmWert.textContent = meter(hoeheBei(ziel.x, ziel.y)).toLocaleString('de-DE');
      hm.style.transform = `translate(${ziel.x + 18}px, ${ziel.y + 20}px)`;
    }
    if (!erstesBild) { erstesBild = true; html.classList.add('karte-an'); }
  }
  const imText = (x, y) => [heldText, dev].some(el => { const b = el.getBoundingClientRect(); return x > b.left && x < b.right && y > b.top && y < b.bottom; });

  // drawing loop: full speed while the hero is in view or the page scrolls (the map moves with it,
  // 20 fps there looked like lag), ~20 fps while resting behind the other sections
  let letzte = 0, raf = 0, geplant = false, scrollBis = 0, warVoll = false;
  new IntersectionObserver(([e]) => { heldSichtbar = e.isIntersecting; }).observe(held);
  addEventListener('scroll', () => { scrollBis = performance.now() + 300; }, { passive: true });
  function schleife(jetzt) {
    raf = requestAnimationFrame(schleife);
    const voll = heldSichtbar || jetzt < scrollBis;
    if (!voll && jetzt - letzte < 45) return;
    if (voll && warVoll) messeTempo(jetzt - letzte); // only full-rate frame gaps say something about speed
    warVoll = voll; letzte = jetzt;
    zeichne(jetzt);
  }
  function einmal() { // calm mode: draw only when something changes
    if (!ruhig || geplant) return;
    geplant = true;
    requestAnimationFrame(() => { geplant = false; zeichne(performance.now()); });
  }
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); cancelAnimationFrame(raf); html.classList.remove('karte-an'); });
  if (ruhig) { addEventListener('scroll', einmal, { passive: true }); einmal(); } else raf = requestAnimationFrame(schleife);
  return { einmal };
}
function einmal() { karte?.einmal(); }

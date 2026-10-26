// alatoo.dev "Linien": one living contour map under every page. Dev, Peaked and the guestbook are summits on it,
// labels follow the contour lines, visitors set their own summits. No libraries.
// Every part below runs only if its elements are on the page, so the start page, Peaked, help, legal pages and 404 share this file.

/* ---------- texts you may want to change ---------- */
const SAETZE = ['Ich bin ein Berg. Ein kleiner.', 'Mein Hut heißt Kalpak. Tipp mal drauf!', 'Psst … Peaked kommt bald.', 'Deine Daten? Bleiben bei dir.', 'Klick mal auf die Karte!'];
const GIPFELNAMEN = ['Mount Muskelkater', 'Schnaufkogel', 'Blasenpflasterjoch', 'Kaiserschmarrnspitze', 'Selfiehorn', 'Akku-leer-Kopf', 'Fast-oben-Spitze', 'Puls-180-Grat', 'Mount Müsliriegel', 'Wadenbeißer'];
// what Peaked keeps, written along the contour lines around the phone (top arc, bottom arc), from the summit outward
// phones: the text sits above the phone, so only the arcs below it carry labels
const RINGSCHRIFT_HANDY = [[null, 'Peaked, Gipfel 01'], [null, 'Gipfel, Touren, Fotos']];
const RINGSCHRIFT = [['Peaked, Gipfel 01', '2.840 m'], ['Gipfel, Touren, Fotos, Erinnerungen', 'alles bleibt auf deinem Gerät']];
const BEISPIELE = [
  { name: 'Vlad', text: 'Willkommen im Gipfelbuch! Schön, dass du hier oben bist.', beispiel: true },
  { name: 'Dev', text: 'Salam! Ich war als Erster hier. Glaube ich.', beispiel: true },
];

const html = document.documentElement;
const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
const feinZeiger = matchMedia('(pointer: fine)').matches;
const klemm = (v, a, b) => Math.min(b, Math.max(a, v));
const dev = $('.dev');
if (dev && !dev.dataset.eigeneSaetze) dev.saetze = SAETZE;

// a spring as Apple describes it: response in seconds, damping ratio (1 = no overshoot)
function feder(wert, v, ziel, dt, antwort, daempfung = 1) {
  const k = (2 * Math.PI / antwort) ** 2, c = 4 * Math.PI * daempfung / antwort;
  for (let rest = dt; rest > 0; rest -= 1 / 120) { const s = Math.min(rest, 1 / 120); v += (-k * (wert - ziel) - c * v) * s; wert += v * s; }
  return [wert, v];
}

/* ---------- the legend (menu): the green pill slides to the place you are at, phones fold it out ---------- */
const kopf = $('.kopf'), schlitten = $('.schlitten'), knopf = $('.legende-knopf');
const links = $$('.legende a');
let hier = links.find(a => a.getAttribute('aria-current') === 'page') ? 'seite' : 'start';
function markiere(id = hier) {
  hier = id;
  links.forEach(a => a.classList.toggle('hier', id === 'seite' ? a.getAttribute('aria-current') === 'page' : a.getAttribute('href') === '#' + id));
  const a = links.find(l => l.classList.contains('hier'));
  if (!a || !schlitten) { if (schlitten) schlitten.style.opacity = 0; return; }
  schlitten.style.opacity = 1;
  schlitten.style.width = a.offsetWidth + 'px';
  schlitten.style.transform = `translateX(${a.offsetLeft}px)`;
}
if (hier === 'start') {
  const orte = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) markiere(e.target.id); }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main .ort[id]').forEach(s => orte.observe(s));
} else markiere();
addEventListener('resize', () => markiere());
document.fonts?.ready.then(() => markiere());
const klappe = auf => { kopf?.classList.toggle('offen', auf); knopf?.setAttribute('aria-expanded', auf); };
knopf?.addEventListener('click', () => klappe(!kopf.classList.contains('offen')));
links.forEach(a => a.addEventListener('click', () => klappe(false)));
addEventListener('keydown', e => { if (e.key === 'Escape') klappe(false); });
addEventListener('pointerdown', e => { if (kopf && !kopf.contains(e.target)) klappe(false); });

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

/* ---------- the terrain in plain JS: the SAME math as the shader below (altimeter, ring labels) ---------- */
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
const nirgendwo = html.hasAttribute('data-nirgendwo'); // 404 page: every height on this map reads 404 m
const meter = h => nirgendwo ? 404 : Math.max(0, Math.round((500 + h * 1700) / 5) * 5); // map heights: Dev's summit lands near 3.100 m
const zahl = n => n.toLocaleString('de-DE');

// summits on the map: Dev's, Peaked's (phone), the guestbook's (its title), plus up to 8 small ones (game and visitors)
const S = { zeit: 0, scroll: 0, zoom: 1, mass: 360, mitteX: 0, mitteY: 0, dev: [0, -9999, 1], peaked: [0, -9999, 1, 0], buch: [0, -9999, 1, 0], klein: [] };
function hoeheBei(x, y) {
  const px = (x - S.mitteX) / (S.mass * S.zoom) + 3.1, py = (y - S.mitteY) / (S.mass * S.zoom) + 1.7 + S.scroll * .35 / S.mass;
  const qx = fbm(px * .9, py * .9 + S.zeit * .03), qy = fbm(px * .9 + 5.2 - S.zeit * .025, py * .9 + 1.3);
  let h = (fbm(px + 1.4 * qx, py + 1.4 * qy) - .22) * 1.7;
  if (S.peaked[3] > 0) h *= 1 - .85 * glocke(x - S.peaked[0], y - S.peaked[1], S.peaked[2] * 1.7); // Peaked is the finished summit: clean rings
  h += 1.05 * glocke(x - S.dev[0], y - S.dev[1], S.dev[2]);
  h += S.peaked[3] * glocke(x - S.peaked[0], y - S.peaked[1], S.peaked[2]);
  h += S.buch[3] * glocke(x - S.buch[0], y - S.buch[1], S.buch[2]);
  h += .25 * zeiger.staerke * glocke(x - zeiger.x, y - zeiger.y, 120);
  for (const g of S.klein) h += g[3] * glocke(x - g[0], y - g[1], g[2]);
  return h;
}

/* ---------- small summits: the hidden game in the hero (funny names, they sink again) and the visitors' summits ---------- */
const start = $('.start'), spielMarken = $('.gipfel-marken');
const buch = $('.buch'), besucherMarken = $('.besucher-marken');
const SPIEL_MAX = 3, LEBENSDAUER = 12000, KLEIN_RADIUS = 72;
let spiel = [], besucher = [], spielZahl = 0, welle = null;
const wachse = s => { if (ruhig) return 1; const t = Math.min(Math.max(s / 1.1, 0), 1); return 1 - (1 - t) ** 3; };

start?.addEventListener('click', e => {
  if (!spielMarken || e.target.closest('a, button, dev-figur, .start-text, .gipfelzeichen') || getSelection().toString()) return;
  const r = start.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  const lebend = spiel.filter(g => !g.stirbt);
  if (lebend.length >= SPIEL_MAX) versinke(lebend[0]);
  const name = GIPFELNAMEN[spielZahl++ % GIPFELNAMEN.length];
  const g = { ort: start, fx: x / r.width, fy: y / r.height, hoch: .62, geboren: S.zeit, stirbt: 0, jetzt: 0 };
  g.marke = marke(spielMarken, g.fx, g.fy, name, `${zahl(meter(hoeheBei(e.clientX, e.clientY) + .62))} m`);
  spiel.push(g);
  setTimeout(() => versinke(g), LEBENSDAUER);
  welle = { x: e.clientX, y: e.clientY, geboren: S.zeit };
  dev?.freu?.(spielZahl === 6 ? 'Du baust Gipfel schneller als ich Apps!' : `Neuer Gipfel: ${name}!`);
  dev?.schau?.(e.clientX, e.clientY, 1600);
});
function versinke(g) {
  if (g.stirbt) return;
  g.stirbt = ruhig ? -1e9 : S.zeit || 1e-6;
  g.marke.classList.add('weg');
  setTimeout(() => g.marke.remove(), 700);
}
function marke(eltern, fx, fy, name, hoehe) {
  const m = document.createElement('div'), b = document.createElement('b'), small = document.createElement('small');
  m.className = 'gm'; m.style.left = `${fx * 100}%`; m.style.top = `calc(${fy * 100}% - 4px)`;
  b.textContent = name; small.textContent = hoehe;
  m.append(b, small, document.createElement('i'));
  eltern.append(m);
  return m;
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
uniform float uZoom;      // the opening's descent
uniform float uMass;      // CSS px per noise unit
uniform vec3 uZeiger;     // pointer x, y (CSS px), strength
uniform vec3 uDev;        // Dev's summit x, y, radius
uniform vec4 uPeaked;     // Peaked's summit x, y, radius, height
uniform vec4 uBuch;       // the guestbook's summit
uniform vec4 uKlein[8];   // small summits x, y, radius, height
uniform vec4 uRuhe[6];    // calm areas behind text: x, y, radius x, radius y
uniform vec3 uNebel;      // fog over the next app's summit: x, y, radius
uniform vec4 uWelle;      // ripple x, y, age, on
uniform float uFortschritt; // 0 at the top of the page, 1 at the bottom: colors drift toward dusk
uniform vec3 uGrund, uLinie, uWarm, uNebelFarbe;
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
  if (uPeaked.w > 0.) h *= 1. - .85 * glocke(px - uPeaked.xy, uPeaked.z * 1.7); // Peaked is the finished summit: clean rings
  h += 1.05 * glocke(px - uDev.xy, uDev.z);
  h += uPeaked.w * glocke(px - uPeaked.xy, uPeaked.z);
  h += uBuch.w * glocke(px - uBuch.xy, uBuch.z);
  h += .25 * uZeiger.z * glocke(px - uZeiger.xy, 120.);
  for (int i = 0; i < 8; i++) h += uKlein[i].w * glocke(px - uKlein[i].xy, uKlein[i].z);
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

  float licht = .62 + .9 * uZeiger.z * glocke(px - uZeiger.xy, 260.) + .3 * glocke(px - uDev.xy, uDev.z * 1.8)
              + .35 * glocke(px - uPeaked.xy, uPeaked.z * 1.3) + .5 * glocke(px - uBuch.xy, uBuch.z * 1.5);
  float ruhe = 1.;
  for (int i = 0; i < 6; i++) {
    if (uRuhe[i].z > 0.) ruhe = min(ruhe, mix(.3, 1., smoothstep(.62, 1.08, length((px - uRuhe[i].xy) / uRuhe[i].zw))));
  }
  float nebel = uNebel.z > 0. ? 1. - smoothstep(uNebel.z * .25, uNebel.z, length((px - uNebel.xy) * vec2(.8, 1.))) : 0.;
  float welle = 0.;
  if (uWelle.w > .5) {
    float dd = length(px - uWelle.xy) - uWelle.z * 420.;
    welle = exp(-dd * dd / 700.) * (1. - smoothstep(.2, 1.5, uWelle.z));
  }

  // far map: bigger, slower, fainter
  vec2 pf = (px - .5 * uRes / uDpr) / (uMass * 2.3) + vec2(11.7, 4.2 + uScroll * .12 / uMass);
  float ff = fbm(pf + vec2(uZeit * .01, 0.)) * 9.;
  float wf = fwidth(ff);
  float fern = (1. - smoothstep(.35 * uDpr - .4, .35 * uDpr + .6, abs(fract(ff + .5) - .5) / max(wf, 1e-4))) * (1. - smoothstep(.15, .4, wf));

  // "ala" means colorful: the jade wanders a little, summits glow like alpenglow, the page ends at dusk
  float bunt = noise(px / 640. + vec2(uZeit * .015, 3.));
  vec3 farbe = mix(uLinie, mix(uLinie, uWarm, .35), bunt * .6 + uFortschritt * .45);
  farbe = mix(farbe, uWarm, clamp(smoothstep(.95, 1.45, h) + welle, 0., 1.));
  float a = (linie * .3 + haupt * .62) * licht * ruhe * (1. - .9 * nebel) + welle * (linie + haupt) * .9;
  float aFern = fern * .12 * ruhe * (1. - nebel);

  // the paper stays flat (labels knock the lines out with a halo in exactly this color)
  vec3 grund = mix(uGrund, uNebelFarbe, nebel * .75);
  grund = mix(mix(grund, uLinie, aFern), grund + uLinie * aFern, uDunkel);
  vec3 col = mix(mix(grund, farbe, clamp(a, 0., 1.)), grund + farbe * a, uDunkel);
  col += (hash(gl_FragCoord.xy + fract(uZeit) * 91.) - .5) * .008;   // dither against banding
  gl_FragColor = vec4(col, 1.);
}`;

const canvas = $('.karte'), hm = $('.hoehenmesser'), hmWert = $('.hm-wert');
const handy = $('.handy-buehne > .handy'), // only the big phone on the start page; the Peaked page shows a row of screens instead
      peaked = $('.peaked'), ringe = $('.ringschrift'), nebelgipfel = $('.nebelgipfel'), handySteuer = $('.handy-steuer');
const buchTitel = $('#buch-titel');
// the phone and the buttons floating below it stand on one summit: its middle, height, top and bottom
function buehne() {
  const p = handy.getBoundingClientRect(), unten = handySteuer?.offsetHeight ? handySteuer.getBoundingClientRect().bottom : p.bottom;
  return [p.left + p.width / 2, (p.top + unten) / 2, unten - p.top, p.top, unten];
}
if (canvas) starteKarte();

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
  for (const n of ['uRes', 'uDpr', 'uZeit', 'uScroll', 'uZoom', 'uMass', 'uZeiger', 'uDev', 'uPeaked', 'uBuch', 'uKlein', 'uRuhe', 'uNebel', 'uWelle', 'uFortschritt', 'uGrund', 'uLinie', 'uWarm', 'uNebelFarbe', 'uDunkel']) u[n] = gl.getUniformLocation(prog, n);

  // colors come from the CSS variables, so stil.css stays the one place to change them
  let F;
  const hex = name => { const n = parseInt(getComputedStyle(html).getPropertyValue(name).trim().slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const leseFarben = () => { F = { grund: hex('--karte-grund'), linie: hex('--karte-linie'), warm: hex('--karte-warm'), nebel: hex('--karte-nebel'), dunkel: parseFloat(getComputedStyle(html).getPropertyValue('--karte-dunkel')) || 0 }; };
  leseFarben();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', leseFarben);
  new MutationObserver(leseFarben).observe(html, { attributes: true, attributeFilter: ['data-theme'] }); // explicit theme choice (e.g. in the Claude app)

  // resolution: capped pixel ratio, lowered further if the device struggles
  let qualitaet = 1, proben = [];
  const groesse = () => {
    const dpr = Math.min(devicePixelRatio || 1, feinZeiger ? 1.5 : 1.25) * qualitaet;
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

  const klein = new Float32Array(32), ruhe = new Float32Array(24), t0 = performance.now();
  const ruheBloecke = $$('.ruhe');
  function zeichne(jetztMs) {
    groesse();
    S.zeit = ruhig ? 0 : (jetztMs - t0) / 1000;
    const glaetten = ruhig ? 1 : .16;
    zeiger.x += (ziel.x - zeiger.x) * glaetten; zeiger.y += (ziel.y - zeiger.y) * glaetten;
    zeiger.staerke = ruhig ? 0 : zeiger.staerke + ((ziel.an ? 1 : 0) - zeiger.staerke) * .06;
    S.scroll = scrollY; S.zoom = window.anflug || 1; // anflug: the opening's descent
    S.mass = Math.min(460, Math.max(260, innerWidth * .3));
    S.mitteX = canvas.clientWidth / 2; S.mitteY = canvas.clientHeight / 2;

    if (dev) { const d = dev.getBoundingClientRect(); S.dev = [d.left + d.width / 2, d.top + d.height * .62, d.width * .95]; }
    if (handy) { const [x, y, h] = buehne(); S.peaked = [x, y, h * (innerWidth < 900 ? 1 : .8), 1.15]; } // phones: a wider summit, so its rings close around the phone
    if (buchTitel) { const b = buchTitel.getBoundingClientRect(); S.buch = [b.left + b.width * .45, b.top + b.height / 2, Math.min(300, innerWidth * .34), .95]; }

    // small summits: grow in, sink out
    spiel = spiel.filter(g => !(g.stirbt && S.zeit - g.stirbt > .8));
    const alle = [...besucher, ...spiel].slice(-8);
    S.klein = alle.map(g => {
      g.jetzt = g.hoch * wachse(S.zeit - g.geboren) * (g.stirbt ? Math.max(0, 1 - (S.zeit - g.stirbt) / .8) : 1);
      const r = g.ort.getBoundingClientRect();
      return [r.left + g.fx * r.width, r.top + g.fy * r.height, KLEIN_RADIUS, g.jetzt];
    });
    klein.fill(0); S.klein.forEach((g, i) => klein.set(g, i * 4));

    // calm areas behind the text blocks in view (the lines dim there, they never vanish)
    ruhe.fill(0);
    let n = 0;
    for (const el of ruheBloecke) {
      if (n >= 6) break;
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100 || !r.width) continue;
      ruhe.set([r.left + r.width / 2, r.top + r.height / 2, r.width * .62 + 30, r.height * .62 + 30], n++ * 4);
    }
    const ng = nebelgipfel?.getBoundingClientRect();
    const alter = welle ? S.zeit - welle.geboren : 9;

    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform1f(u.uDpr, canvas.width / canvas.clientWidth);
    gl.uniform1f(u.uZeit, S.zeit);
    gl.uniform1f(u.uScroll, S.scroll);
    gl.uniform1f(u.uZoom, S.zoom);
    gl.uniform1f(u.uMass, S.mass);
    gl.uniform3f(u.uZeiger, zeiger.x, zeiger.y, zeiger.staerke);
    gl.uniform3f(u.uDev, ...S.dev);
    gl.uniform4f(u.uPeaked, ...S.peaked);
    gl.uniform4f(u.uBuch, ...S.buch);
    gl.uniform4fv(u.uKlein, klein);
    gl.uniform4fv(u.uRuhe, ruhe);
    gl.uniform3f(u.uNebel, ng ? ng.left + 8 : 0, ng ? ng.top + 10 : 0, ng?.width ? Math.max(170, ng.width * .55) : 0);
    gl.uniform4f(u.uWelle, welle ? welle.x : 0, welle ? welle.y : 0, alter, alter < 1.6 && !ruhig ? 1 : 0);
    gl.uniform1f(u.uFortschritt, Math.min(1, scrollY / Math.max(1, html.scrollHeight - innerHeight)));
    gl.uniform3f(u.uGrund, ...F.grund); gl.uniform3f(u.uLinie, ...F.linie); gl.uniform3f(u.uWarm, ...F.warm); gl.uniform3f(u.uNebelFarbe, ...F.nebel);
    gl.uniform1f(u.uDunkel, F.dunkel);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    nachZeichnen();
  }

  // drawing loop: full speed while something moves near you, ~24 fps while the page rests
  let letzte = 0, scrollBis = 0, warVoll = false;
  addEventListener('scroll', () => { scrollBis = performance.now() + 400; }, { passive: true });
  function schleife(jetzt) {
    requestAnimationFrame(schleife);
    const voll = jetzt < scrollBis || ziel.an || jetzt - t0 < 4000 || kippAktiv();
    if (!voll && jetzt - letzte < 40) return;
    if (voll && warVoll) messeTempo(jetzt - letzte);
    warVoll = voll; letzte = jetzt;
    zeichne(jetzt);
  }
  if (ruhig) {
    const einmal = () => requestAnimationFrame(() => zeichne(performance.now()));
    ['scroll', 'resize', 'pointermove'].forEach(n => addEventListener(n, einmal, { passive: true }));
    setInterval(einmal, 1000); // labels and new summits still appear
    einmal();
  } else requestAnimationFrame(schleife);
  return true;
}

/* ---------- after each frame: altimeter, the labels along Peaked's contour lines ---------- */
let bild = 0;
function nachZeichnen() {
  bild++;
  // altimeter: the height under the pointer, from the same math, only over open map
  const ueberKarte = hm && feinZeiger && ziel.an && !imText(ziel.x, ziel.y);
  hm?.classList.toggle('an', !!ueberKarte);
  if (ueberKarte) {
    hmWert.textContent = zahl(meter(hoeheBei(ziel.x, ziel.y)));
    hm.style.transform = `translate(${ziel.x + 18}px, ${ziel.y + 20}px)`;
  }
  if (ringe && bild % 2 === 0) ringschrift();
}
const textBloecke = $$('.ruhe, .kopf, .knopf, dev-figur, .gipfelzeichen, .nebelgipfel, .eintragen, .handy, .handy-steuer, .fuss');
const imText = (x, y) => textBloecke.some(el => { const b = el.getBoundingClientRect(); return x > b.left - 12 && x < b.right + 12 && y > b.top - 12 && y < b.bottom + 12; });

// Contour lines around a dominant summit are star-shaped: walk outward along rays and find where each level is crossed.
// The levels are the shader's own (every 1/12), so the labels sit on drawn lines.
const RAYS = 72;
function ringe_um(cx, cy, rMax) {
  const top = hoeheBei(cx, cy), oben = Math.floor(top * 12);
  const stufen = []; for (let k = 2; k <= 16; k++) stufen.push((oben - k) / 12);
  const radien = stufen.map(() => new Float32Array(RAYS).fill(-1));
  const schritt = Math.max(4, rMax / 110);
  for (let i = 0; i < RAYS; i++) {
    const t = i / RAYS * Math.PI * 2, cs = Math.cos(t), sn = Math.sin(t);
    let r0 = 0, h0 = top;
    for (let r = schritt; r <= rMax; r += schritt) {
      const h1 = hoeheBei(cx + cs * r, cy + sn * r);
      stufen.forEach((L, k) => {
        if (radien[k][i] >= 0 || !(h0 >= L && h1 < L)) return;
        let lo = r0, hi = r;
        for (let j = 0; j < 6; j++) { const m = (lo + hi) / 2; if (hoeheBei(cx + cs * m, cy + sn * m) >= L) lo = m; else hi = m; }
        radien[k][i] = (lo + hi) / 2;
      });
      r0 = r; h0 = h1;
      if (radien[radien.length - 1][i] >= 0) break;
    }
  }
  return radien.map((rs, k) => rs.every(r => r >= 0) ? { L: stufen[k], rs } : null);
}
// the label follows the line's course, not each little wiggle: on a wiggly line the letters ran into each other (Vlad, round 7)
function glaetten(rs, n = 3) {
  const aus = new Float32Array(RAYS);
  for (let i = 0; i < RAYS; i++) { let s = 0; for (let k = -n; k <= n; k++) s += rs[(i + k + RAYS) % RAYS]; aus[i] = s / (2 * n + 1); }
  return aus;
}
const messer = document.createElement('canvas').getContext('2d');
const textBreite = text => { messer.font = `650 15px ${getComputedStyle(html).getPropertyValue('--sans')}`; return messer.measureText(text).width + text.length * 1.5; }; // + letter-spacing .1em
let letzteStufen = []; // the levels labelled last time: kept while they still work, so labels do not jump as the terrain flows
function ringschrift() {
  const s = (peaked || handy.closest('.ort'))?.getBoundingClientRect();
  if (!s || s.bottom < 0 || s.top > innerHeight || !handy.offsetHeight) return;
  const [cx, cy] = S.peaked, [, , H, oben, unten] = buehne(), frei = cy - oben + 34, freiUnten = unten - cy + 30, schmal = innerWidth < 900;
  // usable rings: round enough and clear of the phone and its buttons (on phones only the arc below it matters)
  const gut = ringe_um(cx, cy, H * 1.25).filter(Boolean).map(g => ({ ...g, rs: glaetten(g.rs) })).filter(({ rs }) => {
    let min = 1e9, max = 0;
    for (const r of rs) { min = Math.min(min, r); max = Math.max(max, r); }
    return schmal ? min / max > .5 && rs[RAYS / 4] > freiUnten : min / max > .58 && rs[RAYS * 3 / 4] > frei && rs[RAYS / 4] > freiUnten;
  }).map(g => ({ ...g, mass: schmal ? g.rs[RAYS / 4] : g.rs.reduce((a, b) => a + b, 0) / RAYS }));
  const ziele = schmal ? [.66, .84] : [.7, .86];
  let genommen = letzteStufen.map(L => gut.find(g => Math.abs(g.L - L) < 1e-6)).filter(Boolean);
  if (genommen.length < ziele.length) {
    genommen = [];
    ziele.forEach(f => {
      let best = null;
      for (const g of gut) if (!genommen.includes(g) && genommen.every(j => Math.abs(j.mass - g.mass) > 40) && (!best || Math.abs(g.mass - f * H) < Math.abs(best.mass - f * H))) best = g;
      if (best) genommen.push(best);
    });
  }
  genommen.sort((a, b) => a.mass - b.mass);
  letzteStufen = genommen.map(g => g.L);
  const ox = s.left, oy = s.top;
  let svg = '';
  genommen.forEach(({ rs }, n) => {
    const punkt = i => { const t = i / RAYS * Math.PI * 2, r = rs[i % RAYS]; return [cx - ox + Math.cos(t) * r, cy - oy + Math.sin(t) * r]; };
    const bogen = (von, bis, schritt) => { const p = []; for (let i = von; schritt > 0 ? i <= bis : i >= bis; i += schritt) p.push(punkt(i)); return p; };
    const laenge = p => { let l = 0; for (let i = 1; i < p.length; i++) l += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return l; };
    const oben = bogen(RAYS / 2, RAYS, 1), unten = bogen(RAYS / 2, 0, -1); // west over the top to east, west under the bottom to east
    const d = p => 'M' + p.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' L');
    const [o, un] = (schmal ? RINGSCHRIFT_HANDY : RINGSCHRIFT)[n] || [];
    svg += `<path id="ring-${n}-o" d="${d(oben)}" fill="none"/><path id="ring-${n}-u" d="${d(unten)}" fill="none"/>`;
    // the letters stand OUTSIDE the line: above it on the top arc, hanging below it on the bottom arc, so on a curve they
    // spread apart instead of crowding together; a label only goes where it has room
    const passt = (text, p) => text && textBreite(text) < laenge(p) * .8;
    const obenFrei = cy - rs[RAYS * 3 / 4] > (kopf ? kopf.getBoundingClientRect().bottom : 0) + 30; // never tucked under the legend
    const obenDa = obenFrei && passt(o, oben);
    if (obenDa) svg += `<text${n === 0 ? ' class="warm"' : ''} dy="-4"><textPath href="#ring-${n}-o" startOffset="50%" text-anchor="middle">${o}</textPath></text>`;
    if (passt(un, unten)) svg += `<text${n === 0 && !obenDa ? ' class="warm"' : ''} dominant-baseline="hanging" dy="4"><textPath href="#ring-${n}-u" startOffset="50%" text-anchor="middle">${un}</textPath></text>`;
  });
  ringe.innerHTML = svg;
}

/* ---------- the phone tilts: with the mouse on computers, with the tilt sensor on Android, with a sideways swipe on iPhones ----------
   iPhones only hand out the sensor after a system prompt; Vlad wants no prompt when the page opens, so there a swipe tilts it. */
const kipp = { x: 0, y: 0, vx: 0, vy: 0, zx: 0, zy: 0, zug: null, laeuft: false };
const kippAktiv = () => kipp.laeuft;
const kippbar = handy && !ruhig ? $$('.handy') : [];
if (kippbar.length) {
  const haupt = handy;
  function kippSchritt(t) {
    const dt = Math.min(.05, (t - (kipp.t || t)) / 1000) || 1 / 60; kipp.t = t;
    const [antwort, daempfung] = kipp.zug ? [.1, 1] : kipp.frei ? [.42, .62] : [.35, 1]; // released after a swipe: it swings back a little
    [kipp.x, kipp.vx] = feder(kipp.x, kipp.vx, kipp.zx, dt, antwort, daempfung);
    [kipp.y, kipp.vy] = feder(kipp.y, kipp.vy, kipp.zy, dt, antwort, daempfung);
    haupt.style.setProperty('--kx', kipp.x.toFixed(2)); haupt.style.setProperty('--ky', kipp.y.toFixed(2));
    const ruht = Math.abs(kipp.x - kipp.zx) < .02 && Math.abs(kipp.y - kipp.zy) < .02 && Math.abs(kipp.vx) < .05 && Math.abs(kipp.vy) < .05;
    if (ruht && !kipp.zug) { kipp.laeuft = false; kipp.t = 0; kipp.frei = false; return; }
    requestAnimationFrame(kippSchritt);
  }
  const wecke = () => { if (!kipp.laeuft) { kipp.laeuft = true; requestAnimationFrame(kippSchritt); } };
  // mouse: the phone leans toward the pointer while it is near
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = haupt.getBoundingClientRect(), dx = (e.clientX - (r.left + r.width / 2)) / innerWidth, dy = (e.clientY - (r.top + r.height / 2)) / innerHeight;
    const nah = Math.abs(dy) < .75;
    kipp.zy = nah ? klemm(dx * 46, -18, 18) : 0; kipp.zx = nah ? klemm(-dy * 34, -13, 13) : 0;
    wecke();
  }, { passive: true });
  // Android (and other phones that hand out the sensor without asking): the phone follows how you hold yours
  let sensor = null;
  if (!feinZeiger && 'DeviceOrientationEvent' in window && typeof DeviceOrientationEvent.requestPermission !== 'function') {
    addEventListener('deviceorientation', e => {
      if (e.beta == null || e.gamma == null || kipp.zug) return;
      if (!sensor) sensor = { b: e.beta, g: e.gamma };
      sensor.b += (e.beta - sensor.b) * .02; sensor.g += (e.gamma - sensor.g) * .02; // the resting position follows slowly
      kipp.zx = klemm(-(e.beta - sensor.b) * .9, -14, 14); kipp.zy = klemm((e.gamma - sensor.g) * 1.1, -20, 20);
      wecke();
    });
  }
  // touch: a sideways swipe over the phone tilts it, with growing resistance; vertical swipes still scroll the page
  haupt.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    kipp.zug = { id: e.pointerId, x: e.clientX, y0: kipp.zy, spur: [[e.timeStamp, kipp.y]] };
    try { haupt.setPointerCapture(e.pointerId); } catch {} // the finger may leave the phone while swiping
    wecke();
  });
  haupt.addEventListener('pointermove', e => {
    const z = kipp.zug; if (!z || e.pointerId !== z.id) return;
    const roh = z.y0 + (e.clientX - z.x) * .32;
    kipp.zy = 26 * Math.tanh(roh / 26); // rubber band toward the edge
    z.spur.push([e.timeStamp, kipp.y]); if (z.spur.length > 6) z.spur.shift();
  });
  const los = e => {
    const z = kipp.zug; if (!z || e.pointerId !== z.id) return;
    const [t0, y0] = z.spur[0], [t1, y1] = z.spur.at(-1);
    kipp.vy = t1 > t0 ? (y1 - y0) / ((t1 - t0) / 1000) : 0; // hand the swipe's speed to the spring
    kipp.zug = null; kipp.frei = true; kipp.zy = kipp.zx = 0;
    wecke();
  };
  haupt.addEventListener('pointerup', los);
  haupt.addEventListener('pointercancel', los);
  haupt.addEventListener('lostpointercapture', los);
  haupt.addEventListener('dragstart', e => e.preventDefault());
}

/* ---------- the phone's buttons: which screen of the app, and the app by day or by night ----------
   Until the visitor picks, the app follows the system's light or dark mode, like the real one does. */
for (const steuer of $$('.handy-steuer')) {
  const bild = steuer.parentElement.querySelector('.bildschirm'), wahl = $('.screen-wahl', steuer), gleiter = $('.wahl-schlitten', steuer), modus = $('.modus-knopf', steuer);
  const nacht = matchMedia('(prefers-color-scheme: dark)');
  let dunkel = null; // null: follows the system
  const zeigtDunkel = () => dunkel ?? nacht.matches;
  const gleite = () => { const b = $('[aria-pressed="true"]', wahl); gleiter.style.width = b.offsetWidth + 'px'; gleiter.style.transform = `translateX(${b.offsetLeft}px)`; };
  const modusZeigen = () => { const d = zeigtDunkel(); modus.setAttribute('aria-pressed', d); modus.setAttribute('aria-label', d ? 'App bei Nacht, zum Tag wechseln' : 'App bei Tag, zur Nacht wechseln'); };
  // the old picture stays on top as a cover sheet and fades out once the new one is drawn
  function blende(wechsel) {
    const alt = $('.screen.an img', bild);
    const deck = !ruhig && alt.complete && alt.naturalWidth ? Object.assign(alt.cloneNode(), { className: 'deckblatt', alt: '', loading: 'eager' }) : null;
    if (deck) { deck.src = alt.currentSrc; bild.append(deck); }
    wechsel();
    if (!deck) return;
    const neu = $('.screen.an img', bild);
    let weg = false;
    const ab = () => { if (weg) return; weg = true; deck.classList.add('weg'); setTimeout(() => deck.remove(), 500); };
    // two frames: a changed <source> has been picked by then; a picture not loaded yet keeps the cover until it is
    requestAnimationFrame(() => requestAnimationFrame(() => neu.complete && neu.naturalWidth ? ab() : neu.addEventListener('load', ab, { once: true })));
    setTimeout(ab, 2000);
  }
  wahl.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.getAttribute('aria-pressed') === 'true') return;
    blende(() => {
      for (const k of $$('button', wahl)) k.setAttribute('aria-pressed', k === b);
      for (const s of $$('.screen', bild)) { const an = s.dataset.screen === b.dataset.screen; s.classList.toggle('an', an); s.setAttribute('aria-hidden', !an); }
    });
    gleite();
  });
  modus.addEventListener('click', () => blende(() => {
    dunkel = !zeigtDunkel();
    for (const q of $$('source', bild)) q.media = dunkel ? 'all' : 'not all';
    modusZeigen();
  }));
  nacht.addEventListener('change', modusZeigen);
  steuer.hidden = false;
  modusZeigen();
  gleiter.style.transition = 'none'; gleite(); gleiter.offsetWidth; gleiter.style.transition = ''; // in place at once, glides from then on
  new ResizeObserver(gleite).observe(wahl); // the webfont or a zoom changes the buttons' widths
}

/* ---------- the marked trail through the four rules ---------- */
const wegFeld = $('.weg-feld'), wegPfad = $('.weg-linie path');
function zeichneWeg() {
  const f = wegFeld.getBoundingClientRect();
  const p = $$('.wegpunkt').map(w => { const r = w.getBoundingClientRect(); return [r.left + r.width / 2 - f.left, r.top + r.height / 2 - f.top]; });
  if (p.length < 2) return;
  const breit = innerWidth >= 900;
  // desktop: the trail comes in from the lower left and leaves at the upper right; phones: straight down the left
  const pts = breit ? [[p[0][0] - 90, p[0][1] + 70], ...p, [p[p.length - 1][0] + 90, p[p.length - 1][1] - 70]] : [[p[0][0], p[0][1] - 40], ...p, [p[p.length - 1][0], p[p.length - 1][1] + 40]];
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) { // Catmull-Rom as cubic Béziers
    const a = pts[i - 1] || pts[i], b = pts[i], c = pts[i + 1], e = pts[i + 2] || c;
    d += ` C${b[0] + (c[0] - a[0]) / 6} ${b[1] + (c[1] - a[1]) / 6} ${c[0] - (e[0] - b[0]) / 6} ${c[1] - (e[1] - b[1]) / 6} ${c[0]} ${c[1]}`;
  }
  wegPfad.setAttribute('d', d);
}
if (wegFeld && wegPfad) { new ResizeObserver(zeichneWeg).observe(wegFeld); document.fonts?.ready.then(zeichneWeg); }

/* ---------- Vlad's photo: a square picture at the given path replaces the placeholder as soon as it exists ---------- */
const fotoRahmen = $('[data-foto]');
if (fotoRahmen) {
  const bild = new Image();
  bild.onload = () => { bild.alt = 'Vlad'; fotoRahmen.replaceChildren(bild); };
  bild.src = fotoRahmen.dataset.foto;
}

/* ---------- Gipfelbuch: every entry is a summit on the map ----------
   With data-api set, entries come from the guestbook server and new ones wait for Vlad's approval; without it, a preview. */
if (buch) {
  const liste = $('.eintraege'), form = $('.eintragen'), status = $('.status'), textfeld = $('#gb-text'), namensfeld = $('#gb-name'), zaehler = $('.zaehler');
  const API = (buch.dataset.api || '').replace(/\/$/, '');
  const DREIECK = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4 16 15H4Z"/></svg>';
  $$('.vorschau-hinweis').forEach(p => { p.hidden = p.classList.contains('echt') ? !API : !!API; });
  function freierPlatz(ohne) {
    // a spot on open map: not under the text, the form or another summit, not under the header
    const b = buch.getBoundingClientRect();
    const sperren = [$('.buch-text'), form].map(el => { const r = el.getBoundingClientRect(); return [r.left - b.left - 60, r.top - b.top - 30, r.right - b.left + 60, r.bottom - b.top + 90]; }); // labels sit above their summit
    let best = null, bestWert = -1;
    for (let y = 170; y < b.height - 50; y += 32) for (let x = 50; x < b.width - 50; x += 32) {
      if (sperren.some(([l, t, r, u]) => x > l && x < r && y > t && y < u)) continue;
      const naechster = Math.min(260, ...besucher.filter(g => g !== ohne && g.platziert).map(g => Math.hypot(g.fx * b.width - x, g.fy * b.height - y)));
      const wert = naechster + Math.random() * 40;
      if (wert > bestWert) { bestWert = wert; best = [x / b.width, y / b.height]; }
    }
    return best || [.15 + Math.random() * .7, .92];
  }
  // the text column is centred in its place, so it moves whenever the list grows: then all summits look for open map again
  function verteile() {
    besucher.forEach(g => g.platziert = false);
    for (const g of besucher) {
      [g.fx, g.fy] = freierPlatz(g); g.platziert = true;
      g.marke.style.left = `${g.fx * 100}%`; g.marke.style.top = `calc(${g.fy * 100}% - 4px)`;
    }
  }
  let verteilen = 0;
  new ResizeObserver(() => { cancelAnimationFrame(verteilen); verteilen = requestAnimationFrame(verteile); }).observe($('.buch-text'));
  function setzeGipfel(eintrag) {
    const [fx, fy] = freierPlatz();
    const r = buch.getBoundingClientRect();
    const hoehe = `${zahl(meter(hoeheBei(r.left + fx * r.width, r.top + fy * r.height) + .55))} m`;
    const g = { ort: buch, fx, fy, platziert: true, hoch: .55, geboren: S.zeit, stirbt: 0, jetzt: 0, marke: marke(besucherMarken, fx, fy, eintrag.name, hoehe) };
    besucher.push(g);
    if (besucher.length > 5) { const alt = besucher.shift(); alt.marke.remove(); }
    return hoehe;
  }
  function zeigeEintrag(e, oben = false) {
    const li = document.createElement('li'), wer = document.createElement('span'), was = document.createElement('span');
    const idee = e.text.startsWith('[Idee] ');
    li.innerHTML = DREIECK;
    wer.className = 'wer'; was.className = 'was';
    wer.textContent = e.name + ' ';
    const hoehe = document.createElement('span'); hoehe.className = 'hoehe'; hoehe.textContent = e.hoehe || '';
    wer.append(hoehe);
    if (idee) { const m = document.createElement('span'); m.className = 'marke-idee'; m.textContent = 'App-Idee'; wer.append(m); }
    // textContent only: entries are untrusted
    was.textContent = (idee ? e.text.slice(7) : e.text) + (e.beispiel ? ' (Beispiel)' : e.vorschau ? ' (nur Vorschau)' : e.wartet ? ' (wartet auf Freigabe)' : '');
    li.append(wer, was);
    oben ? liste.prepend(li) : liste.append(li);
  }
  const leer = () => { const li = document.createElement('li'); li.className = 'leer'; li.textContent = 'Noch niemand hier oben. Du kannst die erste Person sein.'; liste.append(li); };
  // the entries need the layout before their summits can find open map
  async function lade() {
    if (!API) return BEISPIELE.forEach(e => { e.hoehe = setzeGipfel(e); zeigeEintrag(e); });
    try {
      const r = await fetch(`${API}/eintraege`, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(r.status);
      const eintraege = await r.json();
      if (!eintraege.length) return leer();
      eintraege.slice(0, 8).forEach((e, i) => { const x = { name: String(e.name), text: String(e.text) }; if (i < 5) x.hoehe = setzeGipfel(x); zeigeEintrag(x); });
    } catch { const li = document.createElement('li'); li.className = 'leer'; li.textContent = 'Das Gipfelbuch ist gerade nicht erreichbar. Versuch es später noch einmal.'; liste.append(li); }
  }
  if (document.readyState === 'complete') requestAnimationFrame(lade); else addEventListener('load', () => requestAnimationFrame(lade), { once: true });

  const melde = (text, fehler = false) => { status.textContent = text; status.classList.toggle('fehler', fehler); };
  textfeld.addEventListener('input', () => { zaehler.textContent = `${textfeld.value.length} / 490`; });
  $$('input[name=art]').forEach(r => r.addEventListener('change', () => { textfeld.placeholder = r.value === 'idee' && r.checked ? 'Welche App fehlt dir? Was soll sie richtig gut können?' : ''; }));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = namensfeld.value.trim(), text = textfeld.value.trim(), ok = form.einverstanden.checked;
    namensfeld.setAttribute('aria-invalid', !name); textfeld.setAttribute('aria-invalid', !text);
    if (!name) { namensfeld.focus(); return melde('Bitte schreib deinen Namen dazu, er wird der Name deines Gipfels.', true); }
    if (!text) { textfeld.focus(); return melde('Bitte schreib eine kurze Nachricht.', true); }
    if (!ok) { form.einverstanden.focus(); return melde('Bitte bestätige, dass dein Eintrag öffentlich stehen darf.', true); }
    const idee = form.art.value === 'idee';
    const eintrag = { name, text: (idee ? '[Idee] ' : '') + text, vorschau: !API, wartet: !!API };
    if (API) {
      const knopfEl = form.querySelector('button[type=submit]');
      knopfEl.disabled = true; melde('Wird eingetragen …');
      try {
        const r = await fetch(`${API}/eintraege`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, text: eintrag.text, einverstanden: true, website: form.website?.value || '' }) });
        if (!r.ok) { const d = await r.json().catch(() => ({})); return melde(d.fehler || 'Das hat nicht geklappt. Versuch es bitte später noch einmal.', true); }
      } catch { return melde('Keine Verbindung zum Gipfelbuch. Versuch es bitte später noch einmal.', true); }
      finally { knopfEl.disabled = false; }
    }
    liste.querySelector('.leer')?.remove();
    eintrag.hoehe = setzeGipfel(eintrag);
    zeigeEintrag(eintrag, true);
    form.reset(); zaehler.textContent = '0 / 490';
    melde(API ? 'Danke! Dein Gipfel steht für alle sichtbar, sobald ich ihn freigebe.' : `Dein Gipfel steht auf ${eintrag.hoehe}. In der Vorschau wird nichts gespeichert.`);
    dev?.freu?.(`Willkommen oben, ${name}!`);
  });
}

/* ---------- one wheel gesture = one place, with our own glide ----------
   Only where stil.css snaps (big screens). Chrome's own snap after a wheel notch was abrupt and a fast spin skipped places.
   Places taller than the screen get stops inside, so no text is skipped. Arrow keys stay with the browser. */
const orteListe = $$('main .ort');
if (orteListe.length > 1) {
  const fest = matchMedia('(min-width: 881px) and (min-height: 601px)');
  let faehrt = false, fahrtNr = 0;
  const halte = () => {
    const max = html.scrollHeight - innerHeight, punkte = [];
    for (const s of orteListe) {
      const oben = s.getBoundingClientRect().top + scrollY, hoch = s.offsetHeight;
      punkte.push(oben);
      for (let y = oben + innerHeight * .85; y < oben + hoch - innerHeight; y += innerHeight * .85) punkte.push(y);
      if (hoch > innerHeight + 4) punkte.push(oben + hoch - innerHeight);
    }
    punkte.push(max);
    return [...new Set(punkte.map(y => Math.round(klemm(y, 0, max))))].sort((a, b) => a - b);
  };
  function gleite(ziel) {
    const start = scrollY, weg = ziel - start, nr = ++fahrtNr;
    if (Math.abs(weg) < 2) return;
    if (ruhig) return scrollTo(0, ziel);
    const dauer = 750 + 250 * Math.sqrt(Math.abs(weg) / innerHeight), t0 = performance.now(); // one screen ≈ 1 s
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
  const kannSelbst = (el, dy) => { // a list or text field under the pointer that can still scroll itself
    for (; el && el !== document.body; el = el.parentElement)
      if (el.scrollHeight > el.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(el).overflowY)
        && (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0)) return true;
    return false;
  };
  // a gesture ends after 200 ms without wheel events, or when a clearly stronger push starts a new one
  // (a trackpad keeps sending weaker and weaker events after a flick, those must not move a second place)
  let gesperrt = false, zuletzt = 0, impuls = 0, summe = 0;
  addEventListener('wheel', e => {
    if (html.classList.contains('auftakt-laeuft')) return;
    if (!fest.matches || ruhig || e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX) || kannSelbst(e.target, e.deltaY)) return;
    e.preventDefault();
    const d = Math.abs(e.deltaY) * (e.deltaMode ? 40 : 1), pause = e.timeStamp - zuletzt > 200, staerker = d > impuls * 1.6 + 6;
    zuletzt = e.timeStamp; impuls = d;
    if (faehrt || (gesperrt && !pause && !staerker)) return;
    gesperrt = false;
    summe = pause ? e.deltaY : summe + e.deltaY;
    if (Math.abs(summe) < 20) return;
    summe = 0; gesperrt = true;
    // the next stop that is a real step away (a place only a little taller than the screen ends 40 px later: skip that)
    const h = halte(), min = innerHeight * .25;
    gleite(e.deltaY > 0 ? h.find(y => y > scrollY + min) ?? h.at(-1) : h.findLast(y => y < scrollY - min) ?? 0);
  }, { passive: false });
  // links to a place (menu, buttons) glide the same way on big screens
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'), ort = a && !a.classList.contains('sprung') && orteListe.find(s => `#${s.id}` === a.hash);
    if (!ort || !fest.matches || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    gleite(Math.min(html.scrollHeight - innerHeight, ort.getBoundingClientRect().top + scrollY));
    history.replaceState(null, '', a.hash);
    ort.tabIndex = -1; ort.focus({ preventScroll: true }); // keyboard users continue from there
  });
}

/* ---------- opening: a drone flight down through the clouds onto Dev's summit ----------
   About 2.3 s; any click, key or scroll skips it. */
const auftakt = $('.auftakt');
if (auftakt && dev && html.classList.contains('auftakt-laeuft')) {
  const gipfel = $('.gipfel');
  const nebel = $('.auftakt-nebel'), titel = $('.auftakt-marke'), wolken = $$('.auftakt-wolke'); // clouds back to front
  dev.begruesst = true; // he says hello when the clouds open over him
  const d = dev.getBoundingClientRect();
  const zx = Math.min(innerWidth * .85, Math.max(innerWidth * .15, d.left + d.width / 2));
  const zy = Math.min(innerHeight * .8, Math.max(innerHeight * .2, d.top + d.height / 2));
  // cloud sheets from the map's own noise, drawn at a sixth of the screen size: the upscaling makes them soft
  const farbe = n => getComputedStyle(html).getPropertyValue(n).trim().match(/\w\w/g).map(x => parseInt(x, 16));
  const licht = farbe('--wolke-licht'), schatten = farbe('--wolke-schatten');
  const W = Math.ceil(innerWidth / 6), H = Math.ceil(innerHeight / 6), diag = Math.hypot(W, H);
  const weich = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  wolken.forEach((c, k) => {
    const mass = .05 - k * .011, loch = [.26, .14, 0][k], dicht = [.42, .4, .34][k], n = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) n[y * W + x] = fbm(x * mass + k * 7.3, y * mass * 1.15 - k * 3.1);
    c.width = W; c.height = H;
    const g = c.getContext('2d'), b = g.createImageData(W, H);
    for (let i = 0; i < W * H; i++) {
      const x = i % W, y = (i - x) / W, nach = n[Math.min(W * H - 1, i + 2 * W + 2)];
      const hell = Math.min(1, Math.max(0, .5 + (n[i] - nach) * 14));
      for (let j = 0; j < 3; j++) b.data[i * 4 + j] = schatten[j] + (licht[j] - schatten[j]) * hell;
      b.data[i * 4 + 3] = 255 * weich(dicht, dicht + .22, n[i]) * (loch ? weich(loch * .35, loch * 2.3, Math.hypot(x - zx / 6, y - zy / 6) / diag) : 1);
    }
    g.putImageData(b, 0, 0);
    c.style.transformOrigin = `${zx}px ${zy}px`;
  });
  const laeufe = [], spiele = (el, bilder, o) => laeufe.push(el.animate(bilder, { fill: 'both', ...o }));
  const vorbei = 'cubic-bezier(.55, 0, .85, .45)'; // faster and faster as it passes the camera
  spiele(titel, [{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: 80, easing: 'cubic-bezier(.16, 1, .3, 1)' });
  spiele(titel, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(2.6)' }], { duration: 750, delay: 700, easing: vorbei, fill: 'forwards' });
  spiele(nebel, [{ opacity: 1 }, { opacity: 0 }], { duration: 600, delay: 550, easing: 'ease-in-out' });
  [[1.9, 1400, 800], [2.5, 1150, 650], [3.4, 950, 500]].forEach(([gross, duration, delay], k) =>
    spiele(wolken[k], [{ transform: 'none', opacity: 1 }, { transform: `scale(${(1 + gross) / 2})`, opacity: 1, offset: .45 }, { transform: `scale(${gross})`, opacity: 0 }], { duration, delay, easing: vorbei }));
  // the descent: map and summit grow toward the camera and settle
  const t0 = performance.now(), TIEF = .84, o = gipfel.getBoundingClientRect();
  gipfel.style.transformOrigin = `${d.left + d.width / 2 - o.left}px ${d.bottom - o.top}px`;
  let fertig = false, gegruesst = false;
  const gruesse = () => { if (!gegruesst) { gegruesst = true; dev.begruesse?.(); } };
  const ende = () => {
    if (fertig) return;
    fertig = true;
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(n => removeEventListener(n, ueberspringe, true));
    window.anflug = 1;
    gipfel.style.transform = gipfel.style.transformOrigin = '';
    html.classList.remove('auftakt-laeuft');
    gruesse();
  };
  const sinke = jetzt => {
    if (fertig) return;
    const t = Math.min(1, Math.max(0, (jetzt - t0 - 450) / 1850));
    window.anflug = TIEF + (1 - TIEF) * (1 - (1 - t) ** 3); // slows down as the drone arrives
    gipfel.style.transform = `scale(${window.anflug})`;
    if (t < 1) requestAnimationFrame(sinke); else ende();
  };
  requestAnimationFrame(sinke);
  setTimeout(gruesse, 1500);
  const ueberspringe = e => {
    if (e.type === 'wheel') { e.preventDefault(); e.stopPropagation(); } // this scroll only skips, it does not move a place yet
    html.classList.remove('auftakt-an');
    laeufe.forEach(a => a.finish());
    ende();
  };
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(n => addEventListener(n, ueberspringe, { capture: true, passive: n !== 'wheel' }));
}

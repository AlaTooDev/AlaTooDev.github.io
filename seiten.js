// alatoo.dev: one section = one page. The snapping itself is CSS (stil.css); this file adds the motion between pages,
// the stages on the right, the hopping arrow and the misty horizon (ridges in depth, fog you can wipe away).

{
const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
const seiten = [...document.querySelectorAll('main > section')];
const etappen = [...document.querySelectorAll('.etappen a')];
const pfeil = document.querySelector('.weiter');
let aktiv = -1, geplant = false;

document.querySelectorAll('[data-tiefe]').forEach(el => el.style.setProperty('--d', el.dataset.tiefe));

// per page -1 … 0 … 1: left upward, in place, still below. A page taller than the screen counts as in place while it fills it.
// --ein/--aus drive the CSS motion; .wartet makes the page title rise again on every arrival.
function messe() {
  geplant = false;
  const h = innerHeight;
  let naechste = 0, abstand = Infinity;
  seiten.forEach((s, i) => {
    const r = s.getBoundingClientRect();
    const p = Math.max(-1, Math.min(1, r.top > 0 ? r.top / h : r.bottom < h ? (r.bottom - h) / h : 0)), q = Math.abs(p);
    if (!ruhig) { s.style.setProperty('--ein', Math.max(p, 0).toFixed(4)); s.style.setProperty('--aus', Math.max(-p, 0).toFixed(4)); }
    if (q > .98) s.classList.add('wartet'); else if (q < .35) s.classList.remove('wartet');
    if (q < abstand) { abstand = q; naechste = i; }
  });
  if (naechste !== aktiv) {
    aktiv = naechste;
    etappen.forEach((a, i) => i === aktiv ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'));
  }
  pfeil.classList.toggle('weg', aktiv === seiten.length - 1);
  pfeil.classList.toggle('unterwegs', aktiv > 0);
}
const plane = () => { if (!geplant) { geplant = true; requestAnimationFrame(messe); } };
addEventListener('scroll', plane, { passive: true });
addEventListener('resize', plane);
messe();

pfeil.addEventListener('click', () => seiten[Math.min(aktiv + 1, seiten.length - 1)].scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth' }));

/* ---------- the horizon ---------- */
const horizont = document.querySelector('.horizont'), land = horizont?.querySelector('.landschaft'), leinwand = land?.querySelector('.dunst');

// the ridges follow the mouse by their depth, like looking around (eased, so they glide)
if (land && !ruhig) {
  const ziel = { x: 0, y: 0 }, ist = { x: 0, y: 0 };
  let gleitet = false;
  const gleite = () => {
    ist.x += (ziel.x - ist.x) * .07; ist.y += (ziel.y - ist.y) * .07;
    land.style.setProperty('--mx', ist.x.toFixed(4)); land.style.setProperty('--my', ist.y.toFixed(4));
    gleitet = Math.abs(ziel.x - ist.x) + Math.abs(ziel.y - ist.y) > .002;
    if (gleitet) requestAnimationFrame(gleite);
  };
  const los = () => { if (!gleitet) { gleitet = true; requestAnimationFrame(gleite); } };
  horizont.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; ziel.x = 1 - e.clientX / innerWidth * 2; ziel.y = 1 - e.clientY / innerHeight * 2; los(); });
  horizont.addEventListener('pointerleave', () => { ziel.x = ziel.y = 0; los(); });
}

// fog over Gipfel 02: the mouse (or a tap) wipes it away, it creeps back a few seconds later.
// Two canvases: the fog itself (vorlage) and what has been wiped (maske), which fades by itself.
if (leinwand) {
  const ctx = leinwand.getContext('2d'), vorlage = document.createElement('canvas'), maske = document.createElement('canvas');
  const vctx = vorlage.getContext('2d'), mctx = maske.getContext('2d');
  const KRAN = { x: .62, y: .15 }; // where the crane stands, in parts of the landscape (index.html, .kran)
  let w = 0, h = 0, skala = 1, letzteWisch = -1e9, laeuft = false, gefunden = 0, vorher = null;

  function baueNebel() {
    skala = Math.min(devicePixelRatio || 1, 1.5);
    w = Math.round(leinwand.clientWidth * skala); h = Math.round(leinwand.clientHeight * skala);
    if (!w || !h) return;
    for (const c of [leinwand, vorlage, maske]) { c.width = w; c.height = h; }
    const n = parseInt(getComputedStyle(land).getPropertyValue('--nebel').trim().slice(1), 16) || 0xffffff;
    const rgb = `${n >> 16 & 255}, ${n >> 8 & 255}, ${n & 255}`;
    const wolke = (x, y, rx, ry, a) => {
      vctx.save(); vctx.translate(x * w, y * h); vctx.scale(rx * w, ry * h);
      const g = vctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, `rgba(${rgb}, ${a})`); g.addColorStop(.5, `rgba(${rgb}, ${a * .85})`); g.addColorStop(1, `rgba(${rgb}, 0)`);
      vctx.fillStyle = g; vctx.fillRect(-1, -1, 2, 2); vctx.restore();
    };
    // thickest around the crane, thinner haze drifting off to both sides
    wolke(KRAN.x, KRAN.y, .13, .2, 1);
    wolke(.5, .2, .2, .14, .9);
    wolke(.74, .2, .16, .13, .85);
    wolke(.34, .3, .2, .1, .55);
    wolke(.88, .34, .16, .09, .5);
    zeichne();
  }
  function zeichne() {
    ctx.globalCompositeOperation = 'copy'; ctx.drawImage(vorlage, 0, 0);
    ctx.globalCompositeOperation = 'destination-out'; ctx.drawImage(maske, 0, 0);
  }
  function schleife(t) {
    if (t - letzteWisch > 1500) { mctx.globalCompositeOperation = 'destination-out'; mctx.fillStyle = 'rgba(0, 0, 0, .03)'; mctx.fillRect(0, 0, w, h); }
    if (t - letzteWisch > 9000) { mctx.clearRect(0, 0, w, h); laeuft = false; } // fully back
    zeichne();
    if (laeuft) requestAnimationFrame(schleife);
  }
  function wische(e, r) {
    const b = leinwand.getBoundingClientRect(), x = (e.clientX - b.left) * skala, y = (e.clientY - b.top) * skala, rr = r * skala;
    const g = mctx.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, 'rgba(0, 0, 0, .9)'); g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    mctx.globalCompositeOperation = 'source-over'; mctx.fillStyle = g; mctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    letzteWisch = performance.now();
    if (!laeuft) { laeuft = true; requestAnimationFrame(schleife); }
    // wiped around the crane for a while: Dev lets you in on the secret, once
    const nahe = Math.abs(x / w - KRAN.x) < .07 && Math.abs(y / h - KRAN.y) < .12;
    if (nahe && vorher) gefunden += Math.hypot(e.clientX - vorher.x, e.clientY - vorher.y);
    vorher = nahe ? { x: e.clientX, y: e.clientY } : null;
    if (gefunden > 220) {
      gefunden = -Infinity;
      const dev = [...document.querySelectorAll('dev-figur')].find(d => d.aktiv || d.sichtbar);
      dev?.freu?.('Erwischt! Da oben wird schon gebaut.');
    }
  }
  land.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') wische(e, 70); });
  land.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') wische(e, 110); });
  new ResizeObserver(baueNebel).observe(leinwand);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', baueNebel);
}
}

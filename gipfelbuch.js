// alatoo.dev guestbook ("Gipfelbuch"). Talks to the Cloudflare Worker in Designs/aufstieg/gipfelbuch-worker
// (GET/POST /eintraege). Without a server address (data-api empty) it runs as a preview and saves nothing.

/* ---------- texts you may want to change ---------- */
const BUCH_TEXTE = {
  danke: 'Danke für deinen Eintrag!',
  gespeichert: 'Danke! Dein Eintrag erscheint, sobald Vlad ihn gelesen hat.',
  vorschau: 'Vorschau: Das Gipfelbuch ist noch nicht angeschlossen, dein Eintrag wurde nicht gespeichert.',
  offline: 'Das Gipfelbuch ist gerade nicht erreichbar. Schreib mir sonst eine Mail.',
  laedtNicht: 'Das Gipfelbuch lädt gerade nicht. Versuch es später noch einmal.',
  leer: 'Noch ist das Buch leer. Trag dich als Erstes ein!',
  fehlt: 'Bitte fülle Name und Nachricht aus und setz den Haken.',
};
const BEISPIELE = [ // shown only in preview mode
  { name: 'Vlad', text: 'Willkommen im Gipfelbuch! Hinterlass gern einen Gruß oder eine Idee für die nächste App.', erstellt: 1791973800 },
  { name: 'Dev', text: 'Salam! Ich war als Erster hier oben. Schön, dass du da bist.', erstellt: 1791918900 },
];
const IDEE = 'Idee: '; // the worker stores plain text, so the kind of entry travels as a prefix (textarea max 490 + prefix stays under the worker's 500)

{
  const buch = document.getElementById('gipfelbuch');
  const q = s => buch.querySelector(s);
  const form = q('.eintragen'), liste = q('.eintraege'), status = q('.status'), zaehler = q('.zaehler'), textfeld = q('textarea');
  const API = (buch.dataset.api || '').trim().replace(/\/+$/, '');
  const datum = s => new Date(s * 1000).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

  function zeile(e) {
    const li = document.createElement('li'), was = document.createElement('p'), wer = document.createElement('p');
    const idee = e.text.startsWith(IDEE);
    if (idee) { const m = document.createElement('span'); m.className = 'marke-idee'; m.textContent = 'App-Idee'; li.append(m); }
    was.className = 'was'; was.textContent = idee ? e.text.slice(IDEE.length) : e.text; // textContent only: entries are untrusted
    wer.className = 'wer'; wer.textContent = `${e.name} · ${datum(e.erstellt)}${e.vorschau ? ' · nur Vorschau' : ''}`;
    li.append(was, wer);
    return li;
  }
  const hinweis = text => Object.assign(document.createElement('li'), { className: 'leer', textContent: text });
  const melde = (text, fehler = false) => { status.textContent = text; status.classList.toggle('fehler', fehler); };
  const zaehle = () => { zaehler.textContent = `${textfeld.value.length} / 490`; };

  async function lade() {
    try {
      let daten = BEISPIELE;
      if (API) { const r = await fetch(`${API}/eintraege`); if (!r.ok) throw new Error(r.status); daten = await r.json(); }
      liste.replaceChildren(...(daten.length ? daten.map(zeile) : [hinweis(BUCH_TEXTE.leer)]));
    } catch { liste.replaceChildren(hinweis(BUCH_TEXTE.laedtNicht)); }
  }

  textfeld.addEventListener('input', zaehle);
  // "Idee ins Gipfelbuch" on the horizon page: the book opens with "App-Idee" already chosen
  document.querySelectorAll('[data-idee]').forEach(a => a.addEventListener('click', () => { form.elements.art.value = 'idee'; }));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.checkValidity()) { melde(BUCH_TEXTE.fehlt, true); form.querySelector(':invalid')?.focus(); return; }
    const f = new FormData(form), knopf = form.querySelector('button');
    const daten = { name: f.get('name'), text: (f.get('art') === 'idee' ? IDEE : '') + f.get('text').trim(), einverstanden: f.get('einverstanden') === 'on', website: f.get('website') };
    const dev = document.querySelector('.dev-jubel');
    knopf.disabled = true;
    try {
      if (!API) { // preview without a server: show it, but say it was not saved
        liste.querySelector('.leer')?.remove();
        liste.prepend(zeile({ ...daten, erstellt: Date.now() / 1000, vorschau: true }));
        form.reset(); melde(BUCH_TEXTE.vorschau); dev?.freu?.(BUCH_TEXTE.danke); return;
      }
      const r = await fetch(`${API}/eintraege`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(daten) });
      const antwort = await r.json().catch(() => ({}));
      if (!r.ok) return melde(antwort.fehler || BUCH_TEXTE.offline, true);
      form.reset(); melde(BUCH_TEXTE.gespeichert); dev?.freu?.(BUCH_TEXTE.danke);
    } catch { melde(BUCH_TEXTE.offline, true); }
    finally { knopf.disabled = false; zaehle(); }
  });
  lade();
}

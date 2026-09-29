/* ================================================================
   Helfer
   ================================================================ */
const $ = id => document.getElementById(id);

/* Icons – überall dieselbe Strichstärke, statt Emoji in Knöpfen */
const ICO = {
  plus:   '<path d="M12 5v14M5 12h14"/>',
  chart:  '<path d="M3 17l6-6 4 4 7-7"/><path d="M14 8h6v6"/>',
  cal:    '<rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  spark:  '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 01-10 0z"/><path d="M17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3M9 20h6M12 14v6"/>',
  camera: '<rect x="3" y="5" width="18" height="15" rx="3"/><circle cx="12" cy="12.5" r="3.5"/><path d="M8.5 5l1.5-2h4l1.5 2"/>',
  play:   '<path d="M7 5l11 7-11 7z"/>',
  bell:   '<path d="M18 8a6 6 0 10-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 01-3.4 0"/>',
  wand:   '<path d="M15 4V2M15 10V8M12.5 6h-2M19.5 6h-2M4 20l9-9M13.5 4.5l1 1"/>',
  bulb:   '<path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.5.4.8 1 .8 1.6V17h5.4v-1.5c0-.6.3-1.2.8-1.6A6 6 0 0012 3z"/>',
  book:   '<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
  stop:   '<circle cx="12" cy="13" r="8"/><path d="M12 9.5V13M9.5 2h5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  speaker: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"/>',
  cards:  '<rect x="3" y="6" width="14" height="14" rx="3"/><path d="M7 3h11a3 3 0 013 3v11"/>',
  pen:    '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'
};
function ico(name) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">' + (ICO[name] || "") + "</svg>";
}
function btnHTML(level, id, icon, label, opts = {}) {
  const cls = "btn btn-" + level;
  const style = opts.accent ? ' style="--accent:' + opts.accent + '"' : "";
  const dis = opts.disabled ? " disabled" : "";
  if (level === "quiet") return `<button class="${cls}" id="${id}"${dis}><span>${label}</span><span>›</span></button>`;
  return `<button class="${cls}" id="${id}"${style}${dis}>${icon ? ico(icon) : ""}<span>${label}</span></button>`;
}
function isoDate(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function todayStr() { return isoDate(new Date()); }
function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return d + "." + m + "." + y;
}
const WD_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const MONTHS_SHORT = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];
function fmtNice(iso) {
  const d = new Date(iso + "T00:00:00");
  return WD_SHORT[d.getDay()] + ", " + d.getDate() + ". " + MONTHS_SHORT[d.getMonth()];
}
function daysSince(ts) { return Math.floor((Date.now() - ts) / 86400000); }
function daysBetweenIso(a, b) {
  return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
}
function addDaysIso(iso, n) {
  const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return isoDate(d);
}
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
/* Aus einer alten id die Entstehungszeit lesen – uid() beginnt mit dem Zeitstempel */
function idTime(id) {
  const t = parseInt(String(id).slice(0, 8), 36);
  return (t > 15e11 && t < 25e11) ? t : 0;   // grob 2017 bis 2049
}

/* ================================================================
   Daten (voll kompatibel mit der bisherigen App)
   ================================================================ */
const STORE_KEY = "meinTagData";
function load() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
  catch { return {}; }
}
const data = Object.assign(
  { todos: [], dailies: [], avoids: [], knows: [], books: [], mediaTips: {}, bookTips: null, sport: null, usage: { input: 0, output: 0, cost: 0 } },
  load()
);

// Handstand-Etappen (Standard-Skill, wird beim ersten Start in die Skill-Liste übernommen)
const DEFAULT_HANDSTAND_STEPS = [
  "Handgelenke aufwärmen & Hollow-Body-Hold 3×20 Sek.",
  "Pike Push-ups 3×8 – baut die Schulterkraft auf",
  "Wall Walk: mit den Füßen die Wand hochlaufen, 3×3",
  "Wandhandstand (Bauch zur Wand), 3×20 Sek. halten",
  "Wandhandstand (Rücken zur Wand), Balance suchen, 3×30 Sek.",
  "Kurz von der Wand lösen, frei halten 3–5 Sek.",
  "Freier Handstand 15+ Sek."
];

/* Vokabeln lernen: jedes fällige Wort einmal pro Runde.
   3× in Folge gewusst (Englisch → Deutsch), danach 1× andersrum (Deutsch → Englisch) → das Wort sitzt.
   Was sitzt, wird nach ≈1 Monat (vorwärts) und ≈3 Monaten (andersrum) noch einmal aufgefrischt.
   Falsch → Lösung 1× abschreiben und 2× aus dem Kopf schreiben; morgen kommt das Wort wieder,
   die Serie beginnt von vorn. */
const VOCAB_STEPS = 3;
const VOCAB_GAPS = [1, 3, 7];     // Tage bis zur nächsten Abfrage nach dem 1., 2. und 3. Treffer
const VOCAB_REFRESH = [30, 60];   // Tage bis zur 1. Auffrischung (nach „sitzt") und von dort bis zur 2.
const VOCAB_COPIES = 3;           // davon das erste Mal mit sichtbarer Lösung, die übrigen aus dem Kopf

/* Eskalationsstufen der Erinnerungen */
const NAG_LEVELS = {
  sanft:     { label: "Sanft",     desc: "Ein Hinweis, alle 4 Stunden.",        everyMin: 240, max: 1, wall: false },
  normal:    { label: "Normal",    desc: "Alle 2 Stunden, freundlich.",          everyMin: 120, max: 2, wall: false },
  penetrant: { label: "Penetrant", desc: "Alle 30 Minuten. Mit Nachdruck.",      everyMin: 30,  max: 3, wall: true },
  gnadenlos: { label: "Gnadenlos", desc: "Alle 10 Minuten. Du hast es so gewollt.", everyMin: 10, max: 6, wall: true }
};

function normalizeData() {
  if (!data.usage) data.usage = { input: 0, output: 0, cost: 0 };
  if (!Array.isArray(data.todos)) data.todos = [];
  // Aufgaben: „bis wann" (until) oder „an diesem Tag" (on)
  data.todos.forEach(t => {
    if (t.kind !== "on") t.kind = "until";
    if (typeof t.repeat !== "number") t.repeat = 0;      // 0 = einmalig, sonst Abstand in Tagen
    if (!Array.isArray(t.doneDates)) t.doneDates = [];   // Historie wiederkehrender Aufgaben
  });
  if (!Array.isArray(data.dailies)) data.dailies = [];
  // Gewohnheiten führen jetzt eine Liste erledigter Tage – für den Rückblick
  data.dailies.forEach(h => {
    if (!Array.isArray(h.history)) h.history = h.lastDone ? [h.lastDone] : [];
    if (h.mode !== "week") h.mode = "interval";
    if (typeof h.perWeek !== "number" || h.perWeek < 1) h.perWeek = 3;
  });
  // Tagebuch: ein Text je Tag
  if (!data.journal || typeof data.journal !== "object") data.journal = {};
  if (!Array.isArray(data.avoids)) data.avoids = [];
  if (!Array.isArray(data.books)) data.books = [];
  if (!data.sport) data.sport = {};
  if (!Array.isArray(data.sport.trainingDays)) data.sport.trainingDays = [1, 2, 4, 5];
  if (!data.sport.log || typeof data.sport.log !== "object") data.sport.log = {};
  if (!Array.isArray(data.sport.runs)) data.sport.runs = [];
  if (!Array.isArray(data.sport.customEx)) data.sport.customEx = [];
  data.sport.customEx = data.sport.customEx.filter(e => e && e.name);
  if (!Array.isArray(data.sport.removedEx)) data.sport.removedEx = [];
  // Wochentage je Übung; fehlt ein Eintrag, gelten die allgemeinen Trainingstage
  if (!data.sport.exDays || typeof data.sport.exDays !== "object") data.sport.exDays = {};
  // Trainingsarten („Druck", „Zug" …) bündeln Übungen und geben ihnen gemeinsame Tage
  if (!Array.isArray(data.sport.splits)) data.sport.splits = [];
  data.sport.splits.forEach(sp => {
    if (!Array.isArray(sp.days)) sp.days = [];
    if (!Array.isArray(sp.ex)) sp.ex = [];
    if (!sp.id) sp.id = uid();
  });
  // Skills: alte Handstand-Struktur in die neue Skill-Liste überführen
  if (!Array.isArray(data.sport.skillList)) {
    const hs = (data.sport.skills && data.sport.skills.handstand) || { done: [] };
    data.sport.skillList = [{
      id: "handstand", name: "Handstand", emoji: "🤸",
      steps: DEFAULT_HANDSTAND_STEPS.slice(),
      done: Array.isArray(hs.done) ? hs.done.slice() : []
    }];
  }
  data.sport.skillList.forEach(sk => {
    if (!Array.isArray(sk.steps)) sk.steps = [];
    if (!Array.isArray(sk.done)) sk.done = [];
  });
  // Medien: Typ-Kennung + Sterne (1–5) in Tiers (S–D) überführen
  data.books.forEach(b => {
    if (!b.media) b.media = "book";
    if (typeof b.eng !== "boolean") b.eng = false;
    if (typeof b.reading !== "boolean") b.reading = false;
  });
  // Filme & Serien gibt es nicht mehr (läuft über Letterboxd)
  data.books = data.books.filter(b => b.media !== "screen");
  if (data.mediaTips && typeof data.mediaTips === "object") delete data.mediaTips.screen;
  const R2T = { 5: "S", 4: "A", 3: "B", 2: "C", 1: "D" };
  data.books.forEach(b => {
    if (!b.tier && b.rating) b.tier = R2T[b.rating] || "";
    delete b.rating;
  });
  if (!data.mediaTips || typeof data.mediaTips !== "object") data.mediaTips = {};
  if (data.bookTips && !data.mediaTips.book) { data.mediaTips.book = data.bookTips; data.bookTips = null; }
  // Erinnerungen
  if (!data.notify || typeof data.notify !== "object") data.notify = {};
  if (typeof data.notify.on !== "boolean") data.notify.on = false;
  if (!NAG_LEVELS[data.notify.level]) data.notify.level = "penetrant";
  if (typeof data.notify.night !== "boolean") data.notify.night = true;
  if (!data.notify.lastFire || typeof data.notify.lastFire !== "object") data.notify.lastFire = {};
  if (typeof data.lastBackup !== "number") data.lastBackup = 0;
  delete data.vocabDir;   // Richtung ergibt sich jetzt aus dem Lernstand
  // Aussprache: Akzent der Vorlese-Stimme, und ob beim Aufdecken vorgelesen wird
  if (!["en-GB", "en-US"].includes(data.vocabAccent)) data.vocabAccent = "en-GB";
  if (typeof data.vocabSpeak !== "boolean") data.vocabSpeak = true;
  // Vokabel-Serie: je Übungstag der Tag, an dem danach wieder etwas fällig war
  if (!data.vocabLog || typeof data.vocabLog !== "object") data.vocabLog = {};
  if (typeof data.vocabRemind !== "boolean") data.vocabRemind = true;
  // Bücher: Anlegedatum, für die Jahresübersicht
  data.books.forEach(b => { if (!b.created) { const t = idTime(b.id); if (t) b.created = t; } });
  // Vokabeln
  if (!Array.isArray(data.vocab)) data.vocab = [];
  data.vocab.forEach(v => {
    if (v.kind !== "term") v.kind = "word";
    if (typeof v.hits !== "number") {
      // Alter Karteikasten: Fach 1 = neu bzw. falsch, jedes weitere Fach = ein Treffer mehr in Folge.
      // Wer schon weit war, muss nur noch die Abfrage andersrum bestehen.
      const box = typeof v.box === "number" ? v.box : 1;
      v.hits = box - 1;
    }
    v.hits = Math.max(0, Math.min(VOCAB_STEPS, Math.floor(v.hits) || 0));
    v.learned = v.learned === true;
    delete v.box; delete v.__retried; delete v.__flip;
    if (v.learned) {
      // Wörter, die schon vor der Auffrischung saßen, bekommen ihren Termin nachträglich
      if (typeof v.refresh !== "number") {
        v.refresh = 0;
        if (!v.due) v.due = addDaysIso(v.learnedAt || todayStr(), VOCAB_REFRESH[0]);
      }
      v.refresh = Math.max(0, Math.min(VOCAB_REFRESH.length, Math.floor(v.refresh) || 0));
      if (v.refresh >= VOCAB_REFRESH.length) delete v.due;
      else if (!v.due) v.due = todayStr();
    } else {
      delete v.refresh;
      if (!v.due) v.due = todayStr();
    }
  });
}
normalizeData();
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }

/* ================================================================
   Theme
   ================================================================ */
const THEME_KEY = "meinTagTheme";
const lightQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;
function themeMode() {
  const m = localStorage.getItem(THEME_KEY);
  return m === "light" || m === "auto" ? m : "dark";
}
function applyTheme() {
  const mode = themeMode();
  const light = mode === "light" || (mode === "auto" && !!lightQuery && lightQuery.matches);
  document.body.classList.toggle("light", light);
  document.querySelector('meta[name="theme-color"]').setAttribute("content", light ? "#f5f3ed" : "#131210");
}
applyTheme();
// „Wie System“: wechselt mit, wenn das Handy abends dunkel wird
if (lightQuery && lightQuery.addEventListener) lightQuery.addEventListener("change", applyTheme);

/* Den Browser bitten, die Daten nicht von selbst aufzuräumen */
let storagePersisted = false;
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persisted()
    .then(p => p || navigator.storage.persist())
    .then(p => { storagePersisted = !!p; })
    .catch(() => {});
}
function storageHint() {
  return storagePersisted
    ? "Der Browser hat zugesagt, deine Daten nicht von selbst zu löschen. Eine Sicherung ab und zu schadet trotzdem nicht."
    : "Deine Daten liegen nur in diesem Browser. Sichere sie ab und zu als Datei.";
}

/* ================================================================
   Kopf: Begrüßung + Datum
   ================================================================ */
(() => {
  const now = new Date();
  const h = now.getHours();
  $("greet").textContent = h < 5 ? "Gute Nacht" : h < 11 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
  const wd = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"][now.getDay()];
  $("big-date").innerHTML = esc(wd) + ",<br><em>" + now.getDate() + ". " + MONTHS[now.getMonth()] + "</em>";
})();

/* ================================================================
   Bottom-Sheet
   ================================================================ */
function openSheet(html, { accent } = {}) {
  const backdrop = document.createElement("div");
  backdrop.className = "sheet-backdrop";
  const sheet = document.createElement("div");
  sheet.className = "sheet";
  if (accent) sheet.style.setProperty("--sheet-accent", accent);
  sheet.innerHTML = '<div class="grab-zone"><div class="grab"></div></div>'
    + '<button class="sheet-x" title="Schließen">✕</button>' + html;
  backdrop.appendChild(sheet);
  document.body.appendChild(backdrop);
  requestAnimationFrame(() => backdrop.classList.add("open"));

  const close = () => {
    sheet.style.transform = "";
    backdrop.style.opacity = "";
    backdrop.classList.remove("open");
    setTimeout(() => backdrop.remove(), 280);
  };
  backdrop.addEventListener("click", e => { if (e.target === backdrop) close(); });
  sheet.querySelector(".sheet-x").addEventListener("click", close);

  /* Runterwischen: greift von überall, solange das Fenster oben steht.
     Ein schneller Schnipser genügt – die Strecke ist zweitrangig. */
  const SPRING = "transform .42s cubic-bezier(.2,.9,.25,1)";
  let sy = 0, dy = 0, drag = false, pid = null, lastY = 0, lastT = 0, vel = 0;

  sheet.addEventListener("pointerdown", e => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const onGrab = !!e.target.closest(".grab-zone");
    // Eingabefelder und Textbereiche gehören dem Finger, nicht der Geste
    const onInput = !!e.target.closest("input, textarea, select");
    if (!onGrab && (sheet.scrollTop > 0 || onInput)) return;
    sy = lastY = e.clientY; lastT = e.timeStamp; dy = 0; vel = 0;
    drag = true; pid = e.pointerId;
    sheet.style.transition = "none";
  });

  sheet.addEventListener("pointermove", e => {
    if (!drag || e.pointerId !== pid) return;
    dy = e.clientY - sy;
    const dt = e.timeStamp - lastT;
    if (dt > 0) vel = (e.clientY - lastY) / dt;      // Pixel je Millisekunde
    lastY = e.clientY; lastT = e.timeStamp;
    if (dy > 3) { try { sheet.setPointerCapture(pid); } catch {} }
    const shown = dy < 0 ? dy / 4 : dy;              // Widerstand nach oben
    sheet.style.transform = "translateY(" + shown + "px)";
    if (dy > 0) backdrop.style.opacity = String(Math.max(0.12, 1 - dy / 460));
  });

  const endDrag = () => {
    if (!drag) return;
    drag = false;
    if (vel > 0.45 || dy > 110) { close(); return; }
    sheet.style.transition = SPRING;
    sheet.style.transform = "translateY(0)";
    backdrop.style.opacity = "";
  };
  sheet.addEventListener("pointerup", endDrag);
  sheet.addEventListener("pointercancel", endDrag);

  return { sheet, close };
}

/* ================================================================
   Wischgesten (rechts = Aktion, links = löschen)
   ================================================================ */
function enableSwipe(el, { onRight, onDelete }) {
  el.style.touchAction = "pan-y";
  let sx = 0, sy = 0, dx = 0, active = false, decided = false, horiz = false, pid = null, swiped = false;
  el.addEventListener("pointerdown", e => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    sx = e.clientX; sy = e.clientY; dx = 0; active = true; decided = false; horiz = false; pid = e.pointerId;
    el.style.transition = "none";
  });
  el.addEventListener("pointermove", e => {
    if (!active || e.pointerId !== pid) return;
    const mx = e.clientX - sx, my = e.clientY - sy;
    if (!decided && (Math.abs(mx) > 8 || Math.abs(my) > 8)) {
      decided = true; horiz = Math.abs(mx) > Math.abs(my);
      if (horiz) { try { el.setPointerCapture(pid); } catch {} }
    }
    if (!horiz) return;
    dx = mx;
    el.style.transform = "translateX(" + dx + "px)";
    el.style.background = dx > 0 ? "rgba(143,193,120,.16)" : dx < 0 ? "rgba(232,121,106,.16)" : "";
  });
  const end = () => {
    if (!active) return; active = false;
    swiped = horiz && Math.abs(dx) > 10;
    el.style.transition = "transform .22s ease, background .22s ease, opacity .22s ease";
    const TH = 70;
    if (horiz && dx <= -TH && onDelete) {
      el.style.transform = "translateX(-110%)"; el.style.opacity = "0";
      setTimeout(onDelete, 200);
    } else {
      el.style.transform = ""; el.style.background = "";
      if (horiz && dx >= TH && onRight) onRight();
    }
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  el.addEventListener("click", e => { if (swiped) { e.stopPropagation(); e.preventDefault(); swiped = false; } }, true);
}

/* ================================================================
   Claude-API (eigener Schlüssel, nur lokal gespeichert)
   ================================================================ */
const KEY_STORE = "meinTagApiKey";
function getApiKey() { return localStorage.getItem(KEY_STORE) || ""; }

const PRICES = {
  "claude-haiku-4-5": { input: 1, output: 5,  cacheWrite: 1.25, cacheRead: 0.1 }
};
function usdCost(u, model) {
  const p = PRICES[model] || PRICES["claude-haiku-4-5"];
  return (u.input_tokens || 0) * p.input / 1e6
       + (u.output_tokens || 0) * p.output / 1e6
       + (u.cache_creation_input_tokens || 0) * p.cacheWrite / 1e6
       + (u.cache_read_input_tokens || 0) * p.cacheRead / 1e6;
}
function fmtCost(c) { return "$" + c.toFixed(4); }

async function callClaude({ system, userText, maxTokens = 4096, tools = null, model = "claude-haiku-4-5", image = null }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    alert("Bitte trage zuerst in den Einstellungen (Zahnrad oben rechts) deinen API-Schlüssel ein.");
    return null;
  }
  let content = userText;
  if (image) {
    content = [
      { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
      { type: "text", text: userText }
    ];
  }
  const messages = [{ role: "user", content }];
  let cost = 0, tokIn = 0, tokOut = 0, response = null;
  for (let i = 0; i < 6; i++) {
    const reqBody = { model, max_tokens: maxTokens, system, messages };
    if (tools) reqBody.tools = tools;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify(reqBody)
    });
    const body = await res.json();
    if (!res.ok) {
      if (res.status === 401) throw new Error("Der API-Schlüssel wurde nicht akzeptiert. Prüfe ihn in den Einstellungen.");
      throw new Error(body?.error?.message || res.statusText);
    }
    cost += usdCost(body.usage || {}, model);
    tokIn += body.usage?.input_tokens || 0;
    tokOut += body.usage?.output_tokens || 0;
    response = body;
    if (body.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: body.content });
      continue;
    }
    break;
  }
  if (response.stop_reason === "refusal") throw new Error("Claude hat diese Anfrage abgelehnt.");
  const text = (response.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
  if (!text) throw new Error("Es kam keine Text-Antwort zurück. Versuche es noch einmal.");
  data.usage.cost += cost;
  data.usage.input += tokIn;
  data.usage.output += tokOut;
  save();
  return { text, cost };
}

/* ================================================================
   Navigation + FAB
   ================================================================ */
let currentTab = "heute";
let habitView = "daily";
let mediaView = "book";
let sportView = "training";
let booksView = null;

document.querySelectorAll("nav.tabs button").forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll("nav.tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("visible", v.id === "view-" + tab));
  renderCurrent();
  updateFab();
  window.scrollTo({ top: 0 });
}
function renderCurrent() {
  if (currentTab === "heute") renderToday();
  else if (currentTab === "todo") renderTodos();
  else if (currentTab === "habits") renderHabits();
  else if (currentTab === "media") renderMedia();
  else if (currentTab === "sport") renderSport();
}
function rerenderAll() {
  renderCurrent();
  if (typeof updateBadge === "function") updateBadge();
}

const fab = $("fab");
function fabAction() {
  if (currentTab === "heute" || currentTab === "todo") return openTodoSheet;
  if (currentTab === "habits") return habitView === "daily" ? openDailySheet : openAvoidSheet;
  if (currentTab === "media") return mediaView === "vocab" ? openVocabSheet : openMediaSheet;
  if (currentTab === "sport") {
    if (sportView === "training") return openExerciseSheet;
    if (sportView === "runs") return () => openRunSheet(null);
    return openSkillSheet; // Skills
  }
  return null;
}
function updateFab() { fab.classList.toggle("hide", !fabAction()); }
fab.addEventListener("click", () => { const a = fabAction(); if (a) a(); });

/* ================================================================
   HEUTE — das Tages-Dashboard
   ================================================================ */
function weekKeyOf(iso) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return isoDate(d);
}
function weekStreak(h) {
  // Wochen in Folge, in denen das Ziel erreicht wurde; die laufende zählt nur, wenn schon geschafft
  const goal = h.perWeek || 3;
  const counts = {};
  (h.history || []).forEach(d => { const k = weekKeyOf(d); counts[k] = (counts[k] || 0) + 1; });
  let streak = 0;
  const mon = mondayOf(new Date());
  for (let w = 0; w < 200; w++) {
    const k = isoDate(addD(mon, -7 * w));
    const c = counts[k] || 0;
    if (c >= goal) streak++;
    else if (w > 0) break;      // vergangene Woche verfehlt = Ende
  }
  return streak;
}
function habitState(h) {
  const today = todayStr();
  const doneToday = h.lastDone === today;

  if (h.mode === "week") {
    const goal = h.perWeek || 3;
    const wk = weekKeyOf(today);
    const inWeek = (h.history || []).filter(d => weekKeyOf(d) === wk).length;
    return { mode: "week", goal, inWeek, doneToday,
      due: !doneToday && inWeek < goal, nextDue: today, streak: weekStreak(h) };
  }

  const interval = h.interval || 1;
  const gap = h.lastDone ? daysBetweenIso(h.lastDone, today) : Infinity;
  const alive = h.lastDone && gap <= interval;
  const nextDue = h.lastDone ? addDaysIso(h.lastDone, interval) : today;
  return { mode: "interval", interval, doneToday, due: !doneToday && nextDue <= today,
    nextDue, streak: alive ? h.streak : 0 };
}
function toggleDailyHabit(h) {
  const today = todayStr();
  if (!Array.isArray(h.history)) h.history = [];
  if (h.lastDone === today) {
    h.lastDone = h.prevLastDone;
    if (h.mode !== "week") h.streak = h.prevStreak;
    h.history = h.history.filter(d => d !== today);
  } else {
    h.prevLastDone = h.lastDone;
    if (h.mode !== "week") {
      h.prevStreak = h.streak;
      const g = h.lastDone ? daysBetweenIso(h.lastDone, today) : Infinity;
      h.streak = (h.lastDone && g <= (h.interval || 1)) ? h.streak + 1 : 1;
    }
    h.lastDone = today;
    if (!h.history.includes(today)) h.history.push(today);
  }
  save(); rerenderAll();
}

/* Fällig heute? „until" = spätestens dann, „on" = genau dann. */
function todoDue(t, today) {
  if (t.done || !t.deadline) return false;
  return t.kind === "on" ? t.deadline <= today : t.deadline <= today;
}
function todoSoon(t, today) {
  if (t.done || !t.deadline || t.kind !== "on") return false;
  const d = daysBetweenIso(today, t.deadline);
  return d > 0 && d <= 2;
}
const REPEAT_LABEL = { 0: "", 1: "täglich", 7: "wöchentlich", 14: "alle 2 Wochen", 28: "alle 4 Wochen" };
function markTodo(t, done) {
  const today = todayStr();
  if (done && t.repeat > 0) {
    // Wiederkehrend: abhaken heißt weiterrücken, nicht verschwinden
    if (!t.doneDates.includes(today)) t.doneDates.push(today);
    let next = addDaysIso(t.deadline || today, t.repeat);
    while (next <= today) next = addDaysIso(next, t.repeat);   // verpasste Runden überspringen
    t.deadline = next;
    t.done = false;
    delete t.doneAt;
    cheer("Erledigt – nächstes Mal " + fmtNice(next));
    return;
  }
  t.done = done;
  if (done) {
    t.doneAt = today;
    if (!t.doneDates.includes(today)) t.doneDates.push(today);
  } else {
    delete t.doneAt;
    t.doneDates = t.doneDates.filter(d => d !== today);
  }
}
function resetAvoid(a) {
  if (confirm("Rückfall bei „" + a.title + "“? Der Zähler startet neu bei 0.")) {
    a.since = Date.now(); save(); rerenderAll();
  }
}
function freqLabel(h) {
  if (h.mode === "week") return (h.perWeek || 3) + "× pro Woche";
  const n = h.interval || 1;
  if (n === 1) return "Täglich";
  if (n === 7) return "1× pro Woche";
  if (n === 14) return "Alle 2 Wochen";
  return "Alle " + n + " Tage";
}

/* Direkt zu den Vokabeln – vom Heute-Bildschirm und vom App-Symbol aus */
function goVocab() {
  mediaView = "vocab"; booksView = null;
  switchTab("media");
}

function renderToday() {
  const box = $("view-heute");
  const today = todayStr();

  // Tagesplan zusammenstellen
  // Fällig ist: ohne Frist, oder Frist erreicht – plus was du heute abgehakt hast
  const dueTodos = data.todos.filter(t =>
    (!t.deadline || t.deadline <= today) && (!t.done || t.doneAt === today));
  const habitStates = data.dailies.map(h => ({ h, st: habitState(h) }));
  const planHabits = habitStates.filter(x => x.st.due || x.st.doneToday);
  const isTrainDay = data.sport.trainingDays.includes(new Date().getDay()) && allEx().length > 0;
  const trainedToday = data.sport.log[today] && Object.keys(data.sport.log[today]).length > 0;

  let total = dueTodos.length + planHabits.length + (isTrainDay ? 1 : 0);
  let done = dueTodos.filter(t => t.done).length + planHabits.filter(x => x.st.doneToday).length + ((isTrainDay && trainedToday) ? 1 : 0);
  const pct = total ? Math.round(done / total * 100) : 100;
  const C = 2 * Math.PI * 47;

  let msg;
  if (total === 0) msg = "Freier Tag – nichts ist fällig.";
  else if (done === total) msg = "Alles geschafft. Stark!";
  else if (done === 0) msg = total + (total === 1 ? " Punkt steht" : " Punkte stehen") + " heute an.";
  else msg = "Noch " + (total - done) + " von " + total + " offen.";

  let html = `
    <div class="card today-hero">
      <div class="ringwrap">
        <svg viewBox="0 0 108 108">
          <circle class="ring-bg" cx="54" cy="54" r="47"/>
          <circle class="ring-fg" cx="54" cy="54" r="47" stroke-dasharray="${C.toFixed(1)}"
            stroke-dashoffset="${(C * (1 - (total ? done / total : 1))).toFixed(1)}"
            style="stroke:${done === total && total > 0 ? "var(--todo)" : "var(--sport)"}"/>
        </svg>
        <div class="ring-label"><div>${total ? done + "<small>von " + total + "</small>" : "✓<small>frei</small>"}</div></div>
      </div>
      <div class="msg">
        <div class="m1">${esc(msg)}</div>
        <div class="m2">${pct}% deines Tagesplans erledigt</div>
      </div>
    </div>`;

  // Schnellzugriff
  const vAll = data.vocab.length, vDueNow = vocabDue().length, vStreak = vocabStreak();
  html += `
    <div class="quick-grid">
      <button class="quick" id="qk-vocab" style="--c:var(--media)">
        <span class="q-ic">${ico("cards")}</span>
        <span><span class="q-t" style="display:block">Vokabeln</span><span class="q-s">${vDueNow ? vDueNow + " fällig" : vAll ? vAll + (vAll === 1 ? " Wort" : " Wörter") : "noch leer"}${vStreak ? " · 🔥 " + vStreak : ""}</span></span>
      </button>
      <button class="quick" id="qk-word" style="--c:var(--run)">
        <span class="q-ic">${ico("pen")}</span>
        <span><span class="q-t" style="display:block">Neues Wort</span><span class="q-s">nachschlagen</span></span>
      </button>
    </div>`;

  // Fällig heute
  html += `<div class="sect"><span class="tick" style="background:var(--todo)"></span><h2>Fällig heute</h2></div>`;
  box.innerHTML = html;
  $("qk-vocab").addEventListener("click", goVocab);
  $("qk-word").addEventListener("click", () => { goVocab(); openVocabSheet(); });

  const planWrap = document.createElement("div");
  if (!dueTodos.length && !planHabits.length && !isTrainDay) {
    planWrap.innerHTML = '<div class="empty-state">Heute ist nichts fällig.<br>Genieß den Tag – oder plane etwas über +.</div>';
  }

  dueTodos.sort((a, b) => (a.done - b.done) || (a.deadline || "9999").localeCompare(b.deadline || "9999")).forEach((t, i) => {
    const overdue = !t.done && t.deadline && t.deadline < today;
    const row = document.createElement("div");
    row.className = "row" + (t.done ? " done" : "");
    row.style.animationDelay = (i * .04) + "s";
    row.innerHTML = `
      <button class="ring-check ${t.done ? "on" : ""}" style="${t.done ? "background:var(--todo);border-color:var(--todo)" : ""}">${t.done ? "✓" : ""}</button>
      <div class="grow"><div class="t">${esc(t.title)}</div>
      <div class="s">${overdue ? '<span class="overdue">Überfällig · ' + fmtNice(t.deadline) + "</span>" : (t.repeat > 0 ? "↻ " + REPEAT_LABEL[t.repeat] : t.kind === "on" ? "Termin heute" : "Aufgabe") + (t.deadlineTime ? " · " + t.deadlineTime + " Uhr" : "")}</div></div>`;
    row.querySelector(".ring-check").addEventListener("click", () => { markTodo(t, !t.done); save(); rerenderAll(); });
    planWrap.appendChild(row);
  });

  // Termine der nächsten zwei Tage – sichtbar, aber nicht im Ring
  data.todos.filter(t => todoSoon(t, today))
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .forEach(t => {
      const row = document.createElement("div");
      row.className = "row";
      row.style.opacity = ".62";
      row.innerHTML = `
        <span class="ring-check" style="border-style:dashed"></span>
        <div class="grow"><div class="t">${esc(t.title)}</div>
        <div class="s"><span>kommt ${fmtNice(t.deadline)}${t.deadlineTime ? " · " + t.deadlineTime + " Uhr" : ""}</span></div></div>`;
      planWrap.appendChild(row);
    });

  planHabits.forEach(({ h, st }, i) => {
    const row = document.createElement("div");
    row.className = "row" + (st.doneToday ? " done" : "");
    row.style.animationDelay = ((dueTodos.length + i) * .04) + "s";
    row.innerHTML = `
      <button class="ring-check ${st.doneToday ? "on" : ""}" style="${st.doneToday ? "background:var(--habit);border-color:var(--habit)" : ""}">${st.doneToday ? "✓" : ""}</button>
      <div class="grow"><div class="t">${esc(h.title)}</div>
      <div class="s">Gewohnheit · ${st.mode === "week" ? st.inWeek + " von " + st.goal + " diese Woche" : st.streak > 0 ? "Streak " + st.streak : freqLabel(h)}</div></div>`;
    row.querySelector(".ring-check").addEventListener("click", () => toggleDailyHabit(h));
    planWrap.appendChild(row);
  });

  if (isTrainDay) {
    const todayLog = data.sport.log[today] || {};
    const row = document.createElement("div");
    row.className = "row" + (trainedToday ? " done" : "");
    row.style.cursor = "pointer";
    const chips = allEx().map(ex =>
      `<span class="me ${todayLog[ex.name] ? "on" : ""}">${esc(ex.name)}${todayLog[ex.name] ? " " + todayLog[ex.name] : ""}</span>`
    ).join("");
    row.innerHTML = `
      <button class="ring-check ${trainedToday ? "on" : ""}" style="${trainedToday ? "background:var(--sport);border-color:var(--sport)" : ""}">${trainedToday ? "✓" : ""}</button>
      <div class="grow"><div class="t">Training</div><div class="mini-ex">${chips}</div></div>`;
    row.addEventListener("click", () => { sportView = "training"; switchTab("sport"); });
    planWrap.appendChild(row);
  }

  // Läufe heute
  const todayRuns = data.sport.runs.filter(r => r.date === today);
  todayRuns.forEach(r => {
    const row = document.createElement("div");
    row.className = "row done";
    row.innerHTML = `<button class="ring-check on" style="background:var(--run);border-color:var(--run)">✓</button>
      <div class="grow"><div class="t">Lauf</div><div class="s">${r.km.toFixed(2).replace(".", ",")} km · ${fmtDur(r.durSec)} · ${fmtPace(r.durSec, r.km)}</div></div>`;
    planWrap.appendChild(row);
  });
  box.appendChild(planWrap);

  // Weitere offene Aufgaben (ohne heutige Deadline)
  const otherOpen = data.todos.filter(t => !t.done && t.deadline && t.deadline > today && !todoSoon(t, today));
  if (otherOpen.length) {
    const link = document.createElement("button");
    link.className = "btn btn-quiet";
    link.innerHTML = `<span>${otherOpen.length} weitere offene ${otherOpen.length === 1 ? "Aufgabe" : "Aufgaben"}</span><span>›</span>`;
    link.addEventListener("click", () => switchTab("todo"));
    box.appendChild(link);
  }

  // Vermeiden-Zähler
  if (data.avoids.length) {
    const sect = document.createElement("div");
    sect.className = "sect";
    sect.innerHTML = '<span class="tick" style="background:var(--avoid)"></span><h2>Vermeiden</h2>';
    box.appendChild(sect);
    const strip = document.createElement("div");
    strip.className = "shield-strip";
    data.avoids.forEach(a => {
      const el = document.createElement("div");
      el.className = "shield";
      el.innerHTML = `<b>${daysSince(a.since)}</b><span>${daysSince(a.since) === 1 ? "Tag" : "Tage"} · ${esc(a.title)}</span>`;
      el.addEventListener("click", () => { habitView = "avoid"; switchTab("habits"); });
      strip.appendChild(el);
    });
    box.appendChild(strip);
  }

  // Angebote – alles Optionale in einer Zeile, nur wenn wirklich was ansteht
  const offers = [];
  const vDue = vocabDue().length;
  if (vDue) offers.push({ icon: "▶", text: vDue + " " + (vDue === 1 ? "Vokabel" : "Vokabeln"), c: "var(--media)", go: () => startQuiz(vocabDue()) });
  if (new Date().getDay() === 0 && new Date().getHours() >= 17 && data.weekReviewSeen !== isoDate(mondayOf(new Date())))
    offers.push({ icon: "📖", text: "Deine Woche", c: "var(--media)", go: openWeekReview });
  if (Date.now() - (data.lastBackup || 0) > 28 * 86400000 && (data.todos.length || data.books.length || data.vocab.length))
    offers.push({ icon: "!", text: "Sichern", c: "var(--avoid)", go: openBackupSheet });

  if (offers.length) {
    const strip = document.createElement("div");
    strip.className = "offer-strip";
    offers.forEach(o => {
      const el = document.createElement("button");
      el.className = "offer";
      el.style.setProperty("--c", o.c);
      el.innerHTML = `<span class="of-ic">${o.icon}</span><span>${esc(o.text)}</span>`;
      el.addEventListener("click", o.go);
      strip.appendChild(el);
    });
    box.appendChild(strip);
  }

  // Rückblick – steht offen da, kein Aufklappen mehr
  const sect = document.createElement("div");
  sect.className = "sect";
  sect.style.marginTop = "26px";
  sect.innerHTML = '<span class="tick" style="background:var(--media)"></span><h2>Rückblick</h2>';
  box.appendChild(sect);
  const slot = document.createElement("div");
  box.appendChild(slot);
  renderReviewWeek(slot);

  box.insertAdjacentHTML("beforeend", btnHTML("quiet", "btn-year", "", "Dieses Jahr"));
  $("btn-year").addEventListener("click", openYearSheet);
}

/* ================================================================
   DIESES JAHR — was am Ende übrig bleibt
   ================================================================ */
function openYearSheet() {
  const year = new Date().getFullYear();
  const inYear = iso => typeof iso === "string" && iso.startsWith(year + "-");
  const monthOf = iso => parseInt(iso.slice(5, 7), 10) - 1;

  let todoDays = [];
  data.todos.forEach(t => (t.doneDates || []).forEach(d => { if (inYear(d)) todoDays.push(d); }));
  const todos = todoDays;
  const habitDays = [];
  data.dailies.forEach(h => (h.history || []).forEach(d => { if (inYear(d)) habitDays.push(d); }));
  const trainDays = Object.keys(data.sport.log).filter(d => inYear(d) && Object.keys(data.sport.log[d]).length);
  const runs = data.sport.runs.filter(r => inYear(r.date));
  const km = runs.reduce((a, r) => a + r.km, 0);
  const words = data.vocab.filter(v => v.created && new Date(v.created).getFullYear() === year);
  const notes = Object.keys(data.journal).filter(d => inYear(d) && (data.journal[d] || "").trim());
  const booksY = data.books.filter(b => b.created && new Date(b.created).getFullYear() === year);
  const sitzen = data.vocab.filter(v => v.learned).length;

  // Aktivität je Monat: an wie vielen Tagen war überhaupt etwas
  const perMonth = new Array(12).fill(0);
  const seen = {};
  const mark = iso => { if (!inYear(iso) || seen[iso]) return; seen[iso] = 1; perMonth[monthOf(iso)]++; };
  todos.forEach(mark);
  habitDays.forEach(mark);
  trainDays.forEach(mark);
  runs.forEach(r => mark(r.date));
  notes.forEach(mark);
  const maxM = Math.max(1, ...perMonth);
  const thisMonth = new Date().getMonth();

  const bars = perMonth.map((v, i) => {
    const h = Math.round(4 + (v / maxM) * 54);
    const future = i > thisMonth;
    return `<span class="pg-bar" title="${v} Tage"><i style="height:${h}px;${i === thisMonth ? "background:var(--media)" : ""}${future ? ";opacity:.25" : ""}"></i></span>`;
  }).join("");

  const stat = (v, l, c) => `<div class="stat"><div class="v"${c ? ' style="color:' + c + '"' : ""}>${v}</div><div class="l">${l}</div></div>`;
  const cards = [
    stat(todos.length, todos.length === 1 ? "Aufgabe" : "Aufgaben", "var(--todo)"),
    stat(habitDays.length, "Gewohnheiten", "var(--habit)"),
    stat(trainDays.length, "Trainingstage", "var(--sport)"),
    runs.length ? stat(km.toFixed(0), "km gelaufen", "var(--run)") : "",
    booksY.length ? stat(booksY.length, booksY.length === 1 ? "Buch" : "Bücher", "var(--media)") : "",
    words.length ? stat(words.length, words.length === 1 ? "Wort" : "Wörter", "var(--media)") : "",
    notes.length ? stat(notes.length, notes.length === 1 ? "Notiz" : "Notizen", "var(--media)") : "",
    sitzen ? stat(sitzen, "Wörter sitzen", "var(--todo)") : ""
  ].filter(Boolean);
  const grid = [];
  for (let i = 0; i < cards.length; i += 3) grid.push('<div class="stat-grid">' + cards.slice(i, i + 3).join("") + "</div>");

  // Bestwerte
  const bests = allEx().map(ex => {
    const { best, bestDate } = bestFor(ex.name);
    return best == null ? "" :
      `<div class="kv"><span class="k">${esc(ex.name)}</span><span class="v" style="color:var(--sport)">${best} ${ex.unit}${bestDate ? ' <span style="color:var(--faint);font-weight:400">· ' + fmtShort(bestDate) + "</span>" : ""}</span></div>`;
  }).filter(Boolean).join("");

  const aktiveTage = Object.keys(seen).length;
  const { sheet, close } = openSheet(`
    <h3>Dieses Jahr</h3>
    <div class="sub">${year} · an <b style="color:var(--text)">${aktiveTage}</b> ${aktiveTage === 1 ? "Tag" : "Tagen"} etwas eingetragen</div>
    ${grid.join("")}
    <label>Monat für Monat</label>
    <div class="pg-chart" style="height:62px">${bars}</div>
    <div class="pg-foot"><span>Jan</span><span>Dez</span></div>
    ${bests ? "<label>Bestwerte</label>" + bests : ""}
    <div class="sheet-actions"><button class="primary" data-act="close">Fertig</button></div>`,
    { accent: "var(--media)" });
  sheet.querySelector('[data-act="close"]').addEventListener("click", close);
}

/* ================================================================
   RÜCKBLICK — was war an einem Tag, und was du dazu schreibst
   ================================================================ */
let reviewWeek = 0;   // 0 = diese Woche, -1 = vorige …

function dayRecord(iso) {
  const todos = data.todos.filter(t => t.doneAt === iso || (t.doneDates || []).includes(iso));
  const habits = data.dailies.filter(h => (h.history || []).includes(iso));
  const ex = data.sport.log[iso] || {};
  const exList = allEx().filter(e => ex[e.name]).map(e => ({ name: e.name, val: ex[e.name], unit: e.unit }));
  const runs = data.sport.runs.filter(r => r.date === iso);
  const note = (data.journal[iso] || "").trim();
  return { todos, habits, exList, runs, note,
    any: todos.length || habits.length || exList.length || runs.length || note };
}

function renderReviewWeek(el) {
  const todayIso = todayStr();
  const mon = mondayOf(new Date());
  mon.setDate(mon.getDate() + reviewWeek * 7);
  const days = [];
  for (let i = 0; i < 7; i++) days.push(isoDate(addD(mon, i)));

  const first = days[0], last = days[6];
  const label = reviewWeek === 0 ? "Diese Woche"
    : reviewWeek === -1 ? "Vorige Woche"
    : fmtShort(first) + " – " + fmtShort(last);

  el.innerHTML = `
    <div class="rev-head">
      <button class="rev-nav" data-nav="-1">‹</button>
      <span class="rev-title">${esc(label)}</span>
      <button class="rev-nav" data-nav="1" ${reviewWeek >= 0 ? "disabled" : ""}>›</button>
    </div>
    <div id="rev-days"></div>`;

  const list = el.querySelector("#rev-days");
  days.forEach((iso, i) => {
    const r = dayRecord(iso);
    const future = iso > todayIso;
    const d = new Date(iso + "T00:00:00");
    const row = document.createElement("div");
    row.className = "rev-day" + (iso === todayIso ? " today" : "") + (future ? " future" : "");
    row.style.animationDelay = (i * .03) + "s";

    // Klartext statt Farbcode
    const pills = [];
    if (r.todos.length) {
      pills.push(r.todos.length === 1
        ? '<span class="pill todo">' + esc(shorten(r.todos[0].title, 22)) + "</span>"
        : '<span class="pill todo">' + r.todos.length + " Aufgaben</span>");
    }
    r.habits.slice(0, 2).forEach(h => pills.push('<span class="pill habit">' + esc(shorten(h.title, 18)) + "</span>"));
    if (r.habits.length > 2) pills.push('<span class="pill habit">+' + (r.habits.length - 2) + "</span>");
    if (r.exList.length) {
      const top = r.exList[0];
      pills.push('<span class="pill sport">' + (r.exList.length === 1 ? top.val + " " + esc(top.name) : "Training") + "</span>");
    }
    r.runs.forEach(x => pills.push('<span class="pill run">' + x.km.toFixed(1).replace(".", ",") + " km</span>"));
    if (r.note) pills.push('<span class="pill note">Notiz</span>');

    const body = pills.length ? pills.join("")
      : future ? '<span class="rev-quiet">—</span>'
      : iso === todayIso ? '<span class="rev-quiet">Heute – noch nichts eingetragen</span>'
      : '<span class="rev-quiet">nichts</span>';

    row.innerHTML = `
      <span class="rev-date"><span class="rev-dow">${WD_SHORT[d.getDay()]}</span><span class="rev-num">${d.getDate()}</span></span>
      <span class="rev-body">${body}</span>`;
    if (!future) row.addEventListener("click", () => openReviewDay(iso));
    list.appendChild(row);
  });

  el.querySelectorAll(".rev-nav").forEach(b => b.addEventListener("click", () => {
    if (b.disabled) return;
    reviewWeek += parseInt(b.dataset.nav, 10);
    if (reviewWeek > 0) reviewWeek = 0;
    renderReviewWeek(el);
  }));
}

function fmtShort(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.getDate() + ". " + MONTHS_SHORT[d.getMonth()];
}
function titleOnly(s) { return String(s).split(" – ")[0].trim(); }
/* Kurzform, die den Band erkennbar lässt: nach dem Doppelpunkt steht meist
   das Unterscheidende, sonst behalten wir das Ende statt des Reihennamens. */
function bookLabel(s, n) {
  const full = titleOnly(s);
  const parts = full.split(": ");
  const cand = parts.length > 1 ? parts.slice(1).join(": ") : full;
  if (cand.length <= n) return cand;
  const tail = cand.slice(cand.length - n);
  const sp = tail.indexOf(" ");
  return "…" + (sp > -1 && sp < n * 0.4 ? tail.slice(sp + 1) : tail).trim();
}
function shorten(s, n) {
  s = String(s);
  // Autor abschneiden, Reihentitel auf den Haupttitel vor dem Doppelpunkt kürzen
  const cut = s.split(" – ")[0].split(": ")[0];
  if (cut.length <= n) return cut;
  // an der letzten Wortgrenze trennen, nicht mitten im Wort
  const head = cut.slice(0, n);
  const sp = head.lastIndexOf(" ");
  return (sp > n * 0.55 ? head.slice(0, sp) : head).trimEnd() + "…";
}

/* Sicherung: alles in die Zwischenablage, damit es nicht nur im Browser lebt */
async function copyBackup() {
  const text = JSON.stringify(data, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    data.lastBackup = Date.now(); save();
    return true;
  } catch {
    prompt("Kopieren ging nicht – markier den Text und kopier ihn selbst:", text);
    data.lastBackup = Date.now(); save();
    return false;
  }
}

/* Sicherung als Datei – landet in „Dateien“ bzw. im Download-Ordner */
function downloadBackup() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "tagwerk-sicherung-" + todayStr() + ".json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  data.lastBackup = Date.now(); save();
}

/* Sicherung zurückholen: ersetzt ALLES (Vokabeln, Tagebuch … eingeschlossen) */
function importBackup(text) {
  let imported;
  try { imported = JSON.parse(text); } catch { imported = null; }
  const known = ["todos", "dailies", "avoids", "books", "vocab", "journal", "sport"];
  if (!imported || typeof imported !== "object" || Array.isArray(imported) || !known.some(k => k in imported)) {
    alert("Das sah nicht nach einer Tagwerk-Sicherung aus – nichts wurde verändert.");
    return false;
  }
  if (!confirm("Alle jetzigen Daten werden durch die Sicherung ersetzt. Weiter?")) return false;
  Object.keys(data).forEach(k => delete data[k]);
  Object.assign(data, { todos: [], dailies: [], avoids: [], knows: [], books: [], mediaTips: {}, bookTips: null, sport: null,
    usage: { input: 0, output: 0, cost: 0 } }, imported);
  normalizeData();
  save(); rerenderAll();
  alert("Sicherung erfolgreich eingespielt.");
  return true;
}
$("backup-file").addEventListener("change", async e => {
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  if (file) importBackup(await file.text());
});

function openBackupSheet() {
  const n = data.todos.length + data.books.length + data.vocab.length
    + data.dailies.length + Object.keys(data.journal).length;
  const { sheet, close } = openSheet(`
    <h3>Tagwerk sichern</h3>
    <div class="sub">Deine Daten liegen nur in diesem Browser. Löschst du die Safari-Daten oder wechselst das Handy, sind sie weg.</div>
    <div class="kv"><span class="k">Einträge insgesamt</span><span class="v">${n}</span></div>
    <div class="kv"><span class="k">Zuletzt gesichert</span><span class="v">${data.lastBackup ? fmtNice(isoDate(new Date(data.lastBackup))) : "nie"}</span></div>
    <div class="hint" style="margin-top:12px">„Als Datei“ speichert eine Sicherungsdatei (z.B. in „Dateien“ oder iCloud). „Kopieren“ legt alles in die Zwischenablage – für eine Mail oder Notiz. Zurück holst du es in den Einstellungen unter „Backup“.</div>
    <button class="btn btn-secondary" data-act="file" style="margin-top:12px"><span>Als Datei sichern</span></button>
    <div class="sheet-actions">
      <button class="quiet" data-act="later">Später</button>
      <button class="primary" data-act="copy">Alles kopieren</button>
    </div>`, { accent: "var(--avoid)" });
  sheet.querySelector('[data-act="file"]').addEventListener("click", () => {
    downloadBackup();
    setTimeout(() => { renderToday(); close(); }, 600);
  });
  sheet.querySelector('[data-act="later"]').addEventListener("click", () => {
    // Zwei Wochen Ruhe, ohne als gesichert zu gelten
    data.lastBackup = Date.now() - 14 * 86400000; save(); renderToday(); close();
  });
  sheet.querySelector('[data-act="copy"]').addEventListener("click", async e => {
    e.target.disabled = true;
    const ok = await copyBackup();
    e.target.textContent = ok ? "Kopiert ✓" : "Fertig";
    setTimeout(() => { renderToday(); close(); }, 800);
  });
}

/* Was die Woche gebracht hat – einmal sonntags, freiwillig */
function openWeekReview() {
  const mon = mondayOf(new Date());
  const days = [];
  for (let i = 0; i < 7; i++) days.push(isoDate(addD(mon, i)));
  const inWeek = iso => days.includes(iso);

  let todos = 0;
  data.todos.forEach(t => (t.doneDates || []).forEach(d => { if (inWeek(d)) todos++; }));
  const habitDays = data.dailies.reduce((n, h) => n + (h.history || []).filter(inWeek).length, 0);
  const trainDays = days.filter(d => data.sport.log[d] && Object.keys(data.sport.log[d]).length).length;
  const runs = data.sport.runs.filter(r => inWeek(r.date));
  const km = runs.reduce((a, r) => a + r.km, 0);
  const words = data.vocab.filter(v => v.created && inWeek(isoDate(new Date(v.created)))).length;
  const notes = days.filter(d => (data.journal[d] || "").trim()).length;
  const books = data.books.filter(b => b.reading).length;

  const stat = (v, l, c) => `<div class="stat"><div class="v"${c ? ' style="color:' + c + '"' : ""}>${v}</div><div class="l">${l}</div></div>`;
  const rows = [
    todos ? stat(todos, todos === 1 ? "Aufgabe" : "Aufgaben", "var(--todo)") : "",
    habitDays ? stat(habitDays, "Gewohnheiten", "var(--habit)") : "",
    trainDays ? stat(trainDays, trainDays === 1 ? "Trainingstag" : "Trainingstage", "var(--sport)") : "",
    runs.length ? stat(km.toFixed(1).replace(".", ",") + " km", "gelaufen", "var(--run)") : "",
    words ? stat(words, words === 1 ? "Wort" : "Wörter", "var(--media)") : "",
    notes ? stat(notes, notes === 1 ? "Notiz" : "Notizen", "var(--media)") : ""
  ].filter(Boolean);

  const grid = [];
  for (let i = 0; i < rows.length; i += 3) grid.push('<div class="stat-grid">' + rows.slice(i, i + 3).join("") + "</div>");

  const leer = !rows.length;
  const sonntag = days[6];
  const { sheet, close } = openSheet(`
    <h3>Deine Woche</h3>
    <div class="sub">${fmtShort(days[0])} – ${fmtShort(days[6])}</div>
    ${leer ? '<div class="answer blank">Diese Woche ist nichts eingetragen. Auch das ist eine Woche.</div>' : grid.join("")}
    ${books ? '<div class="hint" style="margin-top:10px">Du liest gerade ' + books + (books === 1 ? " Buch." : " Bücher.") + "</div>" : ""}
    <label>Was bleibt von der Woche?</label>
    <textarea id="wr-note" placeholder="Wofür warst du dankbar? Was war das Beste?">${esc(data.journal[sonntag] || "")}</textarea>
    <div class="hint" style="margin-top:8px">Landet als Notiz beim Sonntag.</div>
    <div class="sheet-actions">
      <button class="quiet" data-act="later">Später</button>
      <button class="primary" data-act="done">Fertig</button>
    </div>`, { accent: "var(--media)" });

  sheet.querySelector("#wr-note").addEventListener("input", e => {
    const v = e.target.value;
    if (v.trim()) data.journal[sonntag] = v; else delete data.journal[sonntag];
    save();
  });
  sheet.querySelector('[data-act="later"]').addEventListener("click", close);
  sheet.querySelector('[data-act="done"]').addEventListener("click", () => {
    data.weekReviewSeen = isoDate(mon); save();
    renderToday(); close();
  });
}

function openReviewDay(iso) {
  const r = dayRecord(iso);
  const rows = []
    .concat(r.todos.map(t => `<div class="kv"><span class="k">✓ ${esc(t.title)}</span><span class="v" style="color:var(--todo)">Aufgabe</span></div>`))
    .concat(r.habits.map(h => `<div class="kv"><span class="k">✓ ${esc(h.title)}</span><span class="v" style="color:var(--habit)">Gewohnheit</span></div>`))
    .concat(r.exList.map(e => `<div class="kv"><span class="k">${esc(e.name)}</span><span class="v" style="color:var(--sport)">${e.val} ${e.unit}</span></div>`))
    .concat(r.runs.map(x => `<div class="kv"><span class="k">🏃 Lauf</span><span class="v" style="color:var(--run)">${x.km.toFixed(2).replace(".", ",")} km · ${fmtDur(x.durSec)}</span></div>`))
    .join("");

  const { sheet, close } = openSheet(`
    <h3>${fmtNice(iso)}</h3>
    <div class="sub">${fmtDate(iso)}</div>
    ${rows || '<div class="answer blank">An dem Tag ist nichts eingetragen.</div>'}
    <label>Notiz zum Tag</label>
    <textarea id="rv-note" placeholder="Wofür warst du dankbar? Was ist hängengeblieben?">${esc(data.journal[iso] || "")}</textarea>
    <div class="hint" style="margin-top:8px">Wird automatisch gespeichert. Je konkreter, desto mehr bringt's.</div>
    <div class="sheet-actions">
      <button class="primary" data-act="done">Fertig</button>
    </div>`, { accent: "var(--media)" });

  sheet.querySelector("#rv-note").addEventListener("input", e => {
    const v = e.target.value;
    if (v.trim()) data.journal[iso] = v; else delete data.journal[iso];
    save();
  });
  sheet.querySelector('[data-act="done"]').addEventListener("click", () => { renderToday(); close(); });
}

/* ================================================================
   AUFGABEN
   ================================================================ */
function renderTodos() {
  const box = $("view-todo");
  box.innerHTML = "";
  const open = data.todos.filter(t => !t.done).sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));
  const finished = data.todos.filter(t => t.done);

  const sect = document.createElement("div");
  sect.className = "sect";
  sect.innerHTML = `<span class="tick" style="background:var(--todo)"></span><h2>Offen</h2><span class="chip-badge">${open.length}</span>`;
  box.appendChild(sect);

  if (!open.length) {
    box.insertAdjacentHTML("beforeend", '<div class="empty-state">Nichts offen.<br>Neue Aufgabe über den +&#8209;Knopf.</div>');
  } else {
    box.insertAdjacentHTML("beforeend", '<div class="hint">Wischen: rechts = abhaken · links = löschen</div>');
  }
  const today = todayStr();
  open.forEach((t, i) => box.appendChild(todoRow(t, i, today)));

  if (finished.length) {
    const s2 = document.createElement("div");
    s2.className = "sect";
    s2.innerHTML = `<span class="tick" style="background:var(--faint)"></span><h2>Erledigt</h2><span class="chip-badge">${finished.length}</span>`;
    box.appendChild(s2);
    finished.forEach((t, i) => box.appendChild(todoRow(t, i, today)));
  }
}
function todoRow(t, i, today) {
  const overdue = !t.done && t.deadline && t.deadline < today;
  const row = document.createElement("div");
  row.className = "row" + (t.done ? " done" : "");
  row.style.animationDelay = (i * .03) + "s";
  const meta = [];
  if (t.deadline) {
    const pre = t.kind === "on" ? "am " : "bis ";
    meta.push((overdue ? '<span class="overdue">' : "<span>") + pre + fmtNice(t.deadline) + (overdue ? " · überfällig</span>" : "</span>"));
  }
  if (t.deadlineTime) meta.push("<span>" + t.deadlineTime + " Uhr</span>");
  if (t.repeat > 0) meta.push('<span style="color:var(--habit)">↻ ' + REPEAT_LABEL[t.repeat] + "</span>");
  row.innerHTML = `
    <button class="ring-check ${t.done ? "on" : ""}" style="${t.done ? "background:var(--todo);border-color:var(--todo)" : ""}">${t.done ? "✓" : ""}</button>
    <div class="grow"><div class="t">${esc(t.title)}</div>${meta.length ? '<div class="s">' + meta.join("") + "</div>" : ""}</div>`;
  const toggle = () => { markTodo(t, !t.done); save(); rerenderAll(); };
  row.querySelector(".ring-check").addEventListener("click", toggle);
  enableSwipe(row, {
    onRight: toggle,
    onDelete: () => { data.todos = data.todos.filter(x => x.id !== t.id); save(); rerenderAll(); }
  });
  return row;
}

function openTodoSheet() {
  const { sheet, close } = openSheet(`
    <h3>Neue Aufgabe</h3>
    <div class="sub">Was willst du erledigen?</div>
    <input type="text" id="sh-todo-title" placeholder="z.B. Zimmer aufräumen" autocomplete="off">
    <label>Termin</label>
    <div class="seg" id="sh-todo-kind" style="margin:0 0 10px">
      <button data-kind="until" class="on" style="--seg-accent: var(--todo)">Bis wann</button>
      <button data-kind="on" style="--seg-accent: var(--todo)">An diesem Tag</button>
    </div>
    <div class="hint" id="sh-kind-hint" style="margin:0 2px 10px"></div>
    <div class="pickers">
      <div class="pick" id="pick-date"><span>📅</span><span id="pick-date-l">Datum</span><input type="date" id="sh-todo-date"></div>
      <div class="pick" id="pick-time"><span>🕐</span><span id="pick-time-l">Uhrzeit</span><input type="time" id="sh-todo-time"></div>
    </div>
    <label>Wiederholen</label>
    <select id="sh-todo-rep">
      <option value="0">Einmalig</option>
      <option value="1">Täglich</option>
      <option value="7">Wöchentlich</option>
      <option value="14">Alle 2 Wochen</option>
      <option value="28">Alle 4 Wochen</option>
    </select>
    <div class="hint" style="margin-top:8px">Beim Abhaken rückt die Aufgabe von selbst weiter.</div>
    <div class="sheet-actions">
      <button class="quiet" data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="save">Hinzufügen</button>
    </div>`, { accent: "var(--todo)" });

  let kind = "until";
  const hint = sheet.querySelector("#sh-kind-hint");
  const paintKind = () => {
    hint.textContent = kind === "until"
      ? "Kann früher erledigt werden – steht ab dem Tag im Tagesplan."
      : "Fester Termin. Taucht zwei Tage vorher als Vorwarnung auf.";
  };
  sheet.querySelectorAll("#sh-todo-kind button").forEach(b => b.addEventListener("click", () => {
    kind = b.dataset.kind;
    sheet.querySelectorAll("#sh-todo-kind button").forEach(x => x.classList.toggle("on", x === b));
    paintKind();
  }));
  paintKind();
  const dateI = sheet.querySelector("#sh-todo-date"), timeI = sheet.querySelector("#sh-todo-time");
  const upd = () => {
    sheet.querySelector("#pick-date-l").textContent = dateI.value ? fmtNice(dateI.value) : "Datum";
    sheet.querySelector("#pick-date").classList.toggle("set", !!dateI.value);
    sheet.querySelector("#pick-time-l").textContent = timeI.value ? timeI.value + " Uhr" : "Uhrzeit";
    sheet.querySelector("#pick-time").classList.toggle("set", !!timeI.value);
  };
  dateI.addEventListener("change", upd);
  timeI.addEventListener("change", upd);
  sheet.querySelector('[data-act="cancel"]').addEventListener("click", close);
  sheet.querySelector('[data-act="save"]').addEventListener("click", () => {
    const title = sheet.querySelector("#sh-todo-title").value.trim();
    if (!title) return;
    const rep = parseInt(sheet.querySelector("#sh-todo-rep").value, 10) || 0;
    data.todos.push({ id: uid(), title, kind, repeat: rep, doneDates: [],
      deadline: dateI.value || (rep ? todayStr() : ""), deadlineTime: timeI.value, done: false });
    save(); close(); rerenderAll();
  });
  setTimeout(() => sheet.querySelector("#sh-todo-title").focus(), 350);
}

/* ================================================================
   GEWOHNHEITEN
   ================================================================ */
document.querySelectorAll("#habit-seg button").forEach(b => {
  b.addEventListener("click", () => {
    habitView = b.dataset.hview;
    document.querySelectorAll("#habit-seg button").forEach(x => x.classList.toggle("on", x.dataset.hview === habitView));
    renderHabits(); updateFab();
  });
});

function renderHabits() {
  document.querySelectorAll("#habit-seg button").forEach(x => x.classList.toggle("on", x.dataset.hview === habitView));
  const box = $("habits-body");
  box.innerHTML = "";
  if (habitView === "daily") renderDailies(box); else renderAvoids(box);
}

function renderDailies(box) {
  if (!data.dailies.length) {
    box.innerHTML = '<div class="empty-state">Noch keine Gewohnheiten.<br>Leg über + die erste an – z.B. „20 Min lesen“.</div>';
    return;
  }
  box.insertAdjacentHTML("beforeend", '<div class="hint">Wischen: rechts = abhaken · links = löschen</div>');
  data.dailies.forEach((h, i) => {
    const st = habitState(h);
    const row = document.createElement("div");
    row.className = "row";
    row.style.animationDelay = (i * .03) + "s";
    let status;
    if (st.mode === "week") {
      status = st.inWeek >= st.goal
        ? '<span style="color:var(--todo);font-weight:700">Woche geschafft</span>'
        : st.doneToday ? "Heute erledigt" : '<span style="color:var(--habit);font-weight:700">Noch offen</span>';
    } else if (st.doneToday) status = "Heute erledigt";
    else if (st.due) status = '<span style="color:var(--habit);font-weight:700">Jetzt fällig</span>';
    else status = "Nächste: " + fmtNice(st.nextDue);
    const zaehler = st.mode === "week"
      ? "<span>" + st.inWeek + " von " + st.goal + " diese Woche</span>"
      : "";
    row.innerHTML = `
      <button class="ring-check ${st.doneToday ? "on" : ""}" style="${st.doneToday ? "background:var(--habit);border-color:var(--habit)" : ""}">${st.doneToday ? "✓" : ""}</button>
      <div class="grow">
        <div class="t">${esc(h.title)}</div>
        <div class="s"><span>🔥 ${st.streak}</span>${zaehler}<span>${freqLabel(h)}</span><span>${status}</span></div>
      </div>`;
    row.querySelector(".ring-check").addEventListener("click", () => toggleDailyHabit(h));
    enableSwipe(row, {
      onRight: () => toggleDailyHabit(h),
      onDelete: () => { data.dailies = data.dailies.filter(x => x.id !== h.id); save(); rerenderAll(); }
    });
    box.appendChild(row);
  });
}

function renderAvoids(box) {
  if (!data.avoids.length) {
    box.innerHTML = '<div class="empty-state">Noch nichts eingetragen.<br>Was willst du dir abgewöhnen?</div>';
    return;
  }
  box.insertAdjacentHTML("beforeend", '<div class="hint">Wischen: rechts = Rückfall · links = löschen</div>');
  data.avoids.forEach((a, i) => {
    const days = daysSince(a.since);
    const row = document.createElement("div");
    row.className = "row";
    row.style.animationDelay = (i * .03) + "s";
    row.innerHTML = `
      <div class="grow">
        <div class="t">${esc(a.title)}</div>
        <div class="s"><span>seit ${new Date(a.since).toLocaleDateString("de-DE")}</span></div>
      </div>
      <div style="text-align:right">
        <div style="font-family:var(--serif);font-size:24px;font-weight:600;color:var(--avoid)">${days}</div>
        <div style="font-size:11px;color:var(--faint)">${days === 1 ? "Tag" : "Tage"}</div>
      </div>`;
    enableSwipe(row, {
      onRight: () => resetAvoid(a),
      onDelete: () => { data.avoids = data.avoids.filter(x => x.id !== a.id); save(); rerenderAll(); }
    });
    box.appendChild(row);
  });
}

function openDailySheet() {
  const { sheet, close } = openSheet(`
    <h3>Neue Gewohnheit</h3>
    <div class="sub">Dranbleiben zahlt sich aus.</div>
    <input type="text" id="sh-daily-title" placeholder="z.B. 20 Min lesen" autocomplete="off">
    <label>Wie oft?</label>
    <select id="sh-daily-freq">
      <optgroup label="Fester Abstand">
        <option value="i:1">Täglich</option>
        <option value="i:2">Alle 2 Tage</option>
        <option value="i:3">Alle 3 Tage</option>
        <option value="i:7">1× pro Woche</option>
        <option value="i:14">Alle 2 Wochen</option>
      </optgroup>
      <optgroup label="Wochenziel – du verteilst die Tage frei">
        <option value="w:2">2× pro Woche</option>
        <option value="w:3">3× pro Woche</option>
        <option value="w:4">4× pro Woche</option>
        <option value="w:5">5× pro Woche</option>
      </optgroup>
    </select>
    <div class="hint" style="margin-top:8px">Beim Wochenziel reißt nichts, wenn du einen Tag verschiebst.</div>
    <div class="sheet-actions">
      <button class="quiet" data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="save">Hinzufügen</button>
    </div>`, { accent: "var(--habit)" });
  sheet.querySelector('[data-act="cancel"]').addEventListener("click", close);
  sheet.querySelector('[data-act="save"]').addEventListener("click", () => {
    const title = sheet.querySelector("#sh-daily-title").value.trim();
    if (!title) return;
    const [kind, num] = sheet.querySelector("#sh-daily-freq").value.split(":");
    data.dailies.push({
      id: uid(), title,
      mode: kind === "w" ? "week" : "interval",
      interval: kind === "i" ? (parseInt(num, 10) || 1) : 1,
      perWeek: kind === "w" ? (parseInt(num, 10) || 3) : 3,
      streak: 0, lastDone: null, prevStreak: 0, prevLastDone: null, history: []
    });
    save(); close(); rerenderAll();
  });
  setTimeout(() => sheet.querySelector("#sh-daily-title").focus(), 350);
}

function openAvoidSheet() {
  const { sheet, close } = openSheet(`
    <h3>Vermeiden</h3>
    <div class="sub">Der Zähler startet ab jetzt.</div>
    <input type="text" id="sh-avoid-title" placeholder="z.B. Snoozen am Morgen" autocomplete="off">
    <div class="sheet-actions">
      <button class="quiet" data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="save">Starten</button>
    </div>`, { accent: "var(--avoid)" });
  sheet.querySelector('[data-act="cancel"]').addEventListener("click", close);
  sheet.querySelector('[data-act="save"]').addEventListener("click", () => {
    const title = sheet.querySelector("#sh-avoid-title").value.trim();
    if (!title) return;
    data.avoids.push({ id: uid(), title, since: Date.now() });
    save(); close(); rerenderAll();
  });
  setTimeout(() => sheet.querySelector("#sh-avoid-title").focus(), 350);
}

/* ================================================================
   MEDIEN (Bücher / Spiele)
   ================================================================ */
const MEDIA = {
  book: {
    label: "Bücher", one: "Buch", many: "Bücher", verb: "gelesen",
    placeholder: "Buchtitel, z.B. der herr der ringe 1",
    thing: "Buch", things: "Bücher", who: "Autor", whoEx: "J. R. R. Tolkien",
    activeLabel: "Am Lesen", activeSwitch: "Gerade am Lesen",
    tipsTitle: "Buchvorschläge",
    known: "Diese Bücher kenne ich",
    tipsIntro: "Diese Bücher habe ich gelesen und mochte sie",
    tipsAsk: "Empfiehl mir 5 Bücher, die dazu passen und die ich noch nicht gelesen habe. Gib pro Buch genau eine Zeile im Format: Titel | Autor | kurzer Grund (max. 10 Wörter). Keine Nummerierung, keine weiteren Zeilen.",
    defaultIcon: "📚",
    cats: ["Fantasy", "Roman", "Krimi & Thriller", "Sachbuch", "Finanzen", "Selbstentwicklung", "Wissenschaft", "Biografie", "Sonstiges"],
    icons: { "Fantasy": "🐉", "Roman": "📖", "Krimi & Thriller": "🕵️", "Sachbuch": "💡", "Finanzen": "💰", "Selbstentwicklung": "🌱", "Wissenschaft": "🔬", "Biografie": "👤", "Sonstiges": "📚" }
  },
  game: {
    label: "Spiele", one: "Spiel", many: "Spiele", verb: "gespielt",
    placeholder: "Videospiel, z.B. zelda botw",
    thing: "Videospiel", things: "Videospiele", who: "Entwicklerstudio", whoEx: "FromSoftware",
    activeLabel: "Am Spielen", activeSwitch: "Gerade am Spielen",
    tipsTitle: "Spiele-Tipps",
    known: "Diese Spiele kenne ich",
    tipsIntro: "Diese Spiele habe ich gespielt und mochte sie",
    tipsAsk: "Empfiehl mir 5 Videospiele, die dazu passen und die ich noch nicht gespielt habe. Gib pro Spiel genau eine Zeile im Format: Titel | Plattform oder Studio | kurzer Grund (max. 10 Wörter). Keine Nummerierung, keine weiteren Zeilen.",
    defaultIcon: "🎮",
    cats: ["Fantasy", "Sci-Fi", "Action & Abenteuer", "Horror & Thriller", "Mystery & Krimi", "Drama & Story", "Open World", "Sonstiges"],
    icons: { "Fantasy": "🐉", "Sci-Fi": "🚀", "Action & Abenteuer": "🗺️", "Horror & Thriller": "🔪", "Mystery & Krimi": "🕵️", "Drama & Story": "🎭", "Open World": "🌍", "Sonstiges": "🎮" }
  }
};
// Vokabeln sind kein Medientyp – dort fällt M() auf Bücher zurück
function M() { return MEDIA[mediaView] || MEDIA.book; }
function catOf(b) { return b.cat || "Sonstiges"; }
function authorOf(b) { const p = String(b.question).split(" – "); return p.length > 1 ? p[p.length - 1] : ""; }
function iconOf(cat, media = mediaView) { return MEDIA[media].icons[cat] || MEDIA[media].defaultIcon; }
function itemsOfMedia() { return data.books.filter(b => (b.media || "book") === mediaView); }

document.querySelectorAll("#media-seg button").forEach(b => {
  b.addEventListener("click", () => {
    mediaView = b.dataset.media; booksView = null;
    document.querySelectorAll("#media-seg button").forEach(x => x.classList.toggle("on", x.dataset.media === mediaView));
    renderMedia(); updateFab();
  });
});

/* Tier-Wertung: S = Highlight … D = gefällt mir nicht */
const TIERS = ["S", "A", "B", "C", "D"];
const TIER_COLOR = { S: "#e8796a", A: "#e0a458", B: "#d9bc5a", C: "#8fc178", D: "#7aa5f0" };
function tierRank(t) { const i = TIERS.indexOf(t); return i === -1 ? 99 : i; }
function engTag(b) { return b.eng ? '<span class="tag-eng">ENG</span>' : ""; }
function readingBooks() { return data.books.filter(b => b.reading && (b.media || "book") === mediaView); }
function tierBadge(t) {
  if (!t || !TIER_COLOR[t]) return "";
  return `<span class="tier-badge" style="background:${TIER_COLOR[t]}">${t}</span>`;
}

function renderMedia() {
  document.querySelectorAll("#media-seg button").forEach(x => x.classList.toggle("on", x.dataset.media === mediaView));
  if (mediaView === "vocab") { renderVocab(); return; }
  const box = $("media-body");
  const cfg = M();
  box.innerHTML = "";
  const items = itemsOfMedia();

  if (!items.length) {
    box.innerHTML = `<div class="empty-state">Noch nichts unter „${esc(cfg.label)}“.<br>Füge über + deinen ersten Eintrag hinzu.</div>`;
    booksView = null;
    return;
  }

  // Tipps + Tierlist
  box.insertAdjacentHTML("beforeend", `
    <div class="btn-row">
      ${btnHTML("secondary", "media-tips", "spark", "Tipps")}
      ${btnHTML("secondary", "media-tierlist", "trophy", "Tierlist")}
    </div>`);
  $("media-tips").addEventListener("click", openTipsSheet);
  $("media-tierlist").addEventListener("click", openTierlistSheet);

  // Nachtragen, wenn irgendwo Autor oder Beschreibung fehlt
  const missing = items.filter(needsEnrich).length;
  if (missing) {
    box.insertAdjacentHTML("beforeend", btnHTML("primary", "media-fix", "wand",
      missing + " " + (missing === 1 ? "Eintrag" : "Einträge") + " nachtragen", { accent: "var(--media)" }));
    $("media-fix").addEventListener("click", e => enrichAllMissing(e.currentTarget));
  }

  if (booksView === null) {
    // Was gerade läuft, steht oben
    const reading = items.filter(b => b.reading);
    if (reading.length) {
      const sect = document.createElement("div");
      sect.className = "sect";
      sect.innerHTML = '<span class="tick" style="background:var(--media)"></span><h2>' + esc(cfg.activeLabel) + '</h2><span class="chip-badge">' + reading.length + "</span>";
      box.appendChild(sect);
      reading.forEach((b, i) => {
        const n = data.vocab.filter(v => v.book === b.question).length;
        const row = document.createElement("div");
        row.className = "row reading";
        row.style.cursor = "pointer";
        row.style.animationDelay = (i * .03) + "s";
        row.innerHTML = `
          <div class="grow">
            <div class="t">${esc(titleOnly(b.question))}${engTag(b)}</div>
            <div class="s"><span>${esc(authorOf(b))}${n ? " · " + n + (n === 1 ? " Wort" : " Wörter") : ""}</span></div>
          </div>${tierBadge(b.tier)}<span style="color:var(--faint)">›</span>`;
        row.addEventListener("click", () => openMediaDetail(b));
        box.appendChild(row);
      });
      box.insertAdjacentHTML("beforeend", '<div class="sect"><span class="tick" style="background:var(--faint)"></span><h2>Kategorien</h2></div>');
    }
    box.insertAdjacentHTML("beforeend",
      `<div class="media-total">Insgesamt ${cfg.verb}: <b>${items.length} ${items.length === 1 ? cfg.one : cfg.many}</b></div>`);
    const cats = [...new Set(items.map(catOf))].sort((a, b) => a.localeCompare(b, "de"));
    const grid = document.createElement("div");
    grid.className = "tiles";
    cats.forEach((cat, i) => {
      const inCat = items.filter(b => catOf(b) === cat);
      const sCount = inCat.filter(b => b.tier === "S").length;
      const tile = document.createElement("button");
      tile.className = "tile";
      tile.style.animationDelay = (i * .04) + "s";
      tile.innerHTML = `<div class="ic">${iconOf(cat)}</div><div class="n">${esc(cat)}</div>
        <div class="c">${inCat.length} ${inCat.length === 1 ? cfg.one : cfg.many}${sCount ? " · " + sCount + "× S" : ""}</div>`;
      tile.addEventListener("click", () => { booksView = cat; renderMedia(); });
      grid.appendChild(tile);
    });
    box.appendChild(grid);
    return;
  }

  // Innerhalb einer Kategorie
  const back = document.createElement("button");
  back.className = "back-row";
  back.textContent = "← Alle Kategorien";
  back.addEventListener("click", () => { booksView = null; renderMedia(); });
  box.appendChild(back);
  box.insertAdjacentHTML("beforeend", `<div class="cat-title">${iconOf(booksView)} ${esc(booksView)}</div>`);
  box.insertAdjacentHTML("beforeend", '<div class="hint">Antippen für Details · nach links wischen = löschen</div>');

  const inCat = items.filter(x => catOf(x) === booksView).sort((a, b) => tierRank(a.tier) - tierRank(b.tier));
  inCat.forEach((b, i) => {
    const row = document.createElement("div");
    row.className = "row";
    row.style.cursor = "pointer";
    row.style.animationDelay = (i * .03) + "s";
    const preview = b.busy ? "Claude schlägt nach …"
      : (b.desc || (b.answer || "").split("\n")[0]).trim();
    row.innerHTML = `
      <div class="grow">
        <div class="t">${esc(b.question)}${engTag(b)}</div>
        ${preview ? '<div class="s"><span class="prev">' + esc(preview) + "</span></div>" : ""}
      </div>${tierBadge(b.tier)}<span style="color:var(--faint)">›</span>`;
    row.addEventListener("click", () => openMediaDetail(b));
    enableSwipe(row, {
      onDelete: () => { data.books = data.books.filter(x => x.id !== b.id); save(); renderMedia(); }
    });
    box.appendChild(row);
  });
}

/* Tierlist-Übersicht: Einträge per Ziehen einsortieren */
function openTierlistSheet() {
  const cfg = M();
  const { sheet, close } = openSheet(`
    <h3>Tierlist · ${esc(cfg.label)}</h3>
    <div class="sub">Zieh einen Eintrag in eine Reihe. S = Highlight · D = gefällt mir nicht.</div>
    <div id="tl-wrap"></div>
    <label>Ohne Wertung</label>
    <div class="tl-pool" id="tl-pool" data-tier=""></div>
    <div class="hint" style="margin-top:8px">Zurück in „Ohne Wertung“ ziehen = Wertung entfernen.</div>
    <div class="sheet-actions"><button class="quiet" data-act="close">Schließen</button></div>`, { accent: "var(--media)" });
  sheet.querySelector('[data-act="close"]').addEventListener("click", close);

  const rebuild = () => {
    const items = itemsOfMedia();
    const wrap = sheet.querySelector("#tl-wrap");
    wrap.innerHTML = TIERS.map(t => `
      <div class="tl-row" data-tier="${t}">
        <span class="tl-lab" style="background:${TIER_COLOR[t]}">${t}</span>
        <div class="tl-items"></div>
      </div>`).join("");
    TIERS.forEach(t => {
      const target = wrap.querySelector(`.tl-row[data-tier="${t}"] .tl-items`);
      const inTier = items.filter(b => b.tier === t);
      if (!inTier.length) target.innerHTML = '<span class="tl-empty">–</span>';
      else inTier.forEach(b => target.appendChild(makeTierChip(b, sheet, rebuild)));
    });
    const pool = sheet.querySelector("#tl-pool");
    pool.innerHTML = "";
    const unrated = items.filter(b => !b.tier);
    if (!unrated.length) pool.innerHTML = '<span class="tl-empty">Alles einsortiert ✓</span>';
    else unrated.forEach(b => pool.appendChild(makeTierChip(b, sheet, rebuild)));
  };
  rebuild();
}

function makeTierChip(b, sheet, rebuild) {
  const chip = document.createElement("span");
  chip.className = "tl-item";
  chip.textContent = titleOnly(b.question);
  chip.title = b.question;
  chip.style.touchAction = "none";
  chip.addEventListener("pointerdown", e => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY;
    let ghost = null, dragging = false;
    try { chip.setPointerCapture(e.pointerId); } catch {}
    const clearOver = () => sheet.querySelectorAll("[data-tier]").forEach(r => r.classList.remove("tl-over"));
    const targetAt = (x, y) => {
      const el = document.elementFromPoint(x, y);
      return el ? el.closest("[data-tier]") : null;
    };
    const move = ev => {
      if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) {
        dragging = true;
        ghost = chip.cloneNode(true);
        ghost.classList.add("tl-ghost");
        document.body.appendChild(ghost);
        chip.classList.add("tl-dragging");
      }
      if (!dragging) return;
      ghost.style.left = ev.clientX + "px";
      ghost.style.top = ev.clientY + "px";
      clearOver();
      const t = targetAt(ev.clientX, ev.clientY);
      if (t) t.classList.add("tl-over");
    };
    const up = ev => {
      chip.removeEventListener("pointermove", move);
      chip.removeEventListener("pointerup", up);
      chip.removeEventListener("pointercancel", up);
      if (ghost) ghost.remove();
      chip.classList.remove("tl-dragging");
      clearOver();
      if (!dragging) return;
      const t = targetAt(ev.clientX, ev.clientY);
      if (t) {
        b.tier = t.dataset.tier || "";
        save(); renderMedia(); rebuild();
      }
    };
    chip.addEventListener("pointermove", move);
    chip.addEventListener("pointerup", up);
    chip.addEventListener("pointercancel", up);
  });
  return chip;
}

/* ---- Claude räumt auf: Titel korrigieren, Urheber anhängen, Genre, ein Satz ---- */
function jsonFrom(text) {
  const t = String(text).replace(/```json|```/g, "").trim();
  try { return JSON.parse(t); } catch {}
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch {} }
  const c = t.indexOf("["), d = t.lastIndexOf("]");
  if (c >= 0 && d > c) { try { return JSON.parse(t.slice(c, d + 1)); } catch {} }
  return null;
}
function enrichSystem(cfg, eng) {
  const lang = eng
    ? "Der Nutzer liest auf ENGLISCH: gib den englischen Originaltitel, nicht die deutsche Ausgabe. "
    : "Gib die offizielle deutsche Fassung des Titels (falls es keine gibt, den Originaltitel). ";
  return "Du bist ein sorgfältiger Katalog für " + cfg.things + ". " + lang
    + "Der Nutzer tippt Titel oft falsch, unvollständig oder klein geschrieben. "
    + "Erkenne, welches " + cfg.thing + " gemeint ist, und korrigiere die Schreibweise. "
    + "Hänge hinten mit „ – “ den " + cfg.who + " an, z.B. „… – " + cfg.whoEx + "“. "
    + "Antworte AUSSCHLIESSLICH mit JSON, ohne Code-Fences, im Format: "
    + '{"title":"<Titel> – <' + cfg.who + '>","cat":"<Kategorie>","desc":"<genau ein Satz>"}. '
    + "cat ist genau eine dieser Kategorien: " + cfg.cats.join(", ") + ". "
    + "desc ist EIN einziger Satz auf Deutsch (max. 20 Wörter): worum es geht bzw. die Kernaussage. Keine Spoiler zum Ende. "
    + "Wenn du den Titel nicht sicher erkennst, gib ihn unverändert zurück und setze desc auf \"\".";
}
function applyEnrich(b, o, cfg) {
  if (!o || typeof o !== "object") return false;
  if (typeof o.title === "string" && o.title.trim()) b.question = o.title.trim();
  if (typeof o.cat === "string" && cfg.cats.includes(o.cat.trim()) && (b.autoCat || !b.cat)) b.cat = o.cat.trim();
  if (typeof o.desc === "string" && o.desc.trim()) b.desc = o.desc.trim();
  b.enriched = true;
  return true;
}

// Einzelner Eintrag – läuft still im Hintergrund nach dem Hinzufügen
async function enrichMedia(b) {
  const cfg = MEDIA[b.media] || MEDIA.book;
  if (!getApiKey()) return;
  b.busy = true; renderMedia();
  try {
    const r = await callClaude({
      system: enrichSystem(cfg, b.eng),
      userText: b.question,
      maxTokens: 220
    });
    if (r) {
      applyEnrich(b, jsonFrom(r.text), cfg);
      b.cost = (b.cost || 0) + r.cost;
    }
  } catch {
    // still bleiben – der Eintrag steht ja schon
  } finally {
    delete b.busy;
    save(); renderMedia();
  }
}

// Sammel-Knopf: alle Einträge ohne Autor/Beschreibung in einem Aufruf nachtragen
function needsEnrich(b) { return !b.enriched || !b.desc; }
async function enrichAllMissing(btn) {
  const cfg = M();
  const todo = itemsOfMedia().filter(needsEnrich);
  if (!todo.length) { alert("Alles schon vollständig."); return; }
  if (!getApiKey()) { alert("Dafür brauchst du deinen API-Schlüssel in den Einstellungen."); return; }
  const label = btn.textContent;
  btn.disabled = true;
  try {
    // in Portionen, damit die Antwort nicht abgeschnitten wird
    const CHUNK = 12;
    for (let i = 0; i < todo.length; i += CHUNK) {
      const part = todo.slice(i, i + CHUNK);
      btn.textContent = "Claude arbeitet … " + Math.min(i + CHUNK, todo.length) + "/" + todo.length;
      const list = part.map((b, n) => (n + 1) + ". " + b.question).join("\n");
      const r = await callClaude({
        system: enrichSystem(cfg, part[0] && part[0].eng).replace(
          'Antworte AUSSCHLIESSLICH mit JSON, ohne Code-Fences, im Format: {"title"',
          'Du bekommst eine nummerierte Liste. Antworte AUSSCHLIESSLICH mit einem JSON-Array in genau dieser Reihenfolge und Länge, ohne Code-Fences, Elemente im Format: {"title"'
        ),
        userText: list,
        maxTokens: 180 * part.length + 200
      });
      if (!r) break;
      const arr = jsonFrom(r.text);
      if (Array.isArray(arr)) part.forEach((b, n) => applyEnrich(b, arr[n], cfg));
      save(); renderMedia();
    }
    alert("Fertig – " + todo.length + " " + (todo.length === 1 ? cfg.one : cfg.many) + " nachgetragen.");
  } catch (err) {
    alert("Das hat nicht geklappt: " + err.message);
  } finally {
    btn.disabled = false; btn.textContent = label;
    save(); renderMedia();
  }
}

/* „englisch" aus der Eingabe ziehen – das Wort selbst fliegt aus dem Titel */
function parseEnglish(input) {
  const m = String(input).match(/\s*\b(auf\s+)?(englisch|english|eng)\b\s*$/i);
  if (!m) return { text: String(input).trim(), eng: false };
  return { text: String(input).slice(0, m.index).trim(), eng: true };
}

/* ---- Ganze Reihe: „Der Herr der Ringe 1-“ oder „… 1-3“ ---- */
function parseSeries(input) {
  const m = String(input).match(/^(.*?[^\d\s])\s*(\d+)\s*-\s*(\d+)?\s*$/);
  if (!m) return null;
  const from = parseInt(m[2], 10);
  const to = m[3] ? parseInt(m[3], 10) : null;
  if (!from || (to && to < from)) return null;
  return { base: m[1].trim(), from, to };
}

async function askSeries(base, from, to, cfg, eng) {
  const range = to ? ("Band " + from + " bis " + to) : ("ab Band " + from + " alle erschienenen Bände");
  const r = await callClaude({
    system: "Du bist ein sorgfältiger Katalog für " + cfg.things + ". Der Nutzer nennt eine Reihe, oft falsch geschrieben. "
      + "Erkenne die Reihe und liste die einzelnen Bände in Erscheinungsreihenfolge auf. "
      + (eng ? "Die Titel in der englischen Originalfassung. " : "Jeder Titel offiziell deutsch geschrieben. ")
      + "Hinten mit „ – “ den " + cfg.who + " angehängt. "
      + "Antworte AUSSCHLIESSLICH mit JSON, ohne Code-Fences: "
      + '{"series":"<Reihenname>","items":[{"title":"<Bandtitel> – <' + cfg.who + '>","cat":"<Kategorie>","desc":"<genau ein Satz, max. 20 Wörter>"}]}. '
      + "cat ist genau eine dieser Kategorien: " + cfg.cats.join(", ") + ". "
      + "Höchstens 20 Einträge. Wenn du keine Reihe erkennst, gib \"items\": [] zurück.",
    userText: "Reihe: " + base + "\nGewünscht: " + range,
    maxTokens: 2000
  });
  if (!r) return null;
  const o = jsonFrom(r.text);
  if (!o || !Array.isArray(o.items) || !o.items.length) return null;
  return o;
}

function openSeriesConfirm(o, cfg, eng) {
  const have = new Set(itemsOfMedia().map(b => b.question.toLowerCase()));
  const rows = o.items.map((it, i) => {
    const dup = have.has(String(it.title || "").toLowerCase());
    return `<div class="row ${dup ? "" : "sel"}" data-i="${i}" style="cursor:pointer">
      <button class="ring-check" style="${dup ? "" : "background:var(--media);border-color:var(--media)"}">${dup ? "" : "✓"}</button>
      <div class="grow"><div class="t">${esc(it.title || "")}</div>
        ${dup ? '<div class="s"><span>schon eingetragen</span></div>'
              : (it.desc ? '<div class="s"><span class="prev">' + esc(it.desc) + "</span></div>" : "")}
      </div></div>`;
  }).join("");
  const { sheet, close } = openSheet(`
    <h3>${esc(o.series || "Reihe gefunden")}</h3>
    <div class="sub">${o.items.length} ${o.items.length === 1 ? "Band" : "Bände"} gefunden. Tippe an, was du eintragen willst.</div>
    ${rows}
    <div class="sheet-actions">
      <button class="quiet" data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="add">Eintragen</button>
    </div>`, { accent: "var(--media)" });

  sheet.querySelectorAll(".row").forEach(row => row.addEventListener("click", () => {
    const on = row.classList.toggle("sel");
    const c = row.querySelector(".ring-check");
    c.textContent = on ? "✓" : "";
    c.style.cssText = on ? "background:var(--media);border-color:var(--media)" : "";
  }));
  sheet.querySelector('[data-act="cancel"]').addEventListener("click", close);
  sheet.querySelector('[data-act="add"]').addEventListener("click", () => {
    const picked = [...sheet.querySelectorAll(".row.sel")].map(r => o.items[parseInt(r.dataset.i, 10)]);
    if (!picked.length) { close(); return; }
    picked.forEach(it => {
      data.books.push({
        id: uid(), media: mediaView, question: String(it.title || "").trim(), eng: !!eng, reading: false, created: Date.now(),
        cat: cfg.cats.includes(it.cat) ? it.cat : "", autoCat: true,
        desc: typeof it.desc === "string" ? it.desc.trim() : "",
        answer: "", cost: 0, tier: "", enriched: true
      });
    });
    booksView = null;
    save(); close(); renderMedia();
  });
}

function openMediaSheet() {
  const cfg = M();
  const catOpts = cfg.cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
  const tierBtns = TIERS.map(t => `<button data-tier="${t}">${t}</button>`).join("");
  const { sheet, close } = openSheet(`
    <h3>${esc(cfg.label)}: Neuer Eintrag</h3>
    <div class="sub">Tipp einfach drauflos – Claude korrigiert den Titel, hängt den ${esc(cfg.who)} an und sortiert ein.</div>
    <input type="text" id="sh-media-title" placeholder="${esc(cfg.placeholder)}" autocomplete="off">
    <div class="hint" style="margin-top:8px">Ganze Reihe: „Titel 1-“ für alle Bände. Auf Englisch gelesen? Schreib „englisch“ dahinter.</div>
    <label>Kategorie</label>
    <select id="sh-media-cat">
      <option value="Auto" selected>Auto (Claude wählt)</option>${catOpts}
    </select>
    <label>Meine Wertung (optional)</label>
    <div class="tier-row" id="sh-add-tier">${tierBtns}</div>
    <label>Meine Notizen (optional)</label>
    <textarea id="sh-add-notes" placeholder="Was du dazu festhalten willst …"></textarea>
    <div class="toggle-row"><span>${esc(cfg.activeSwitch)}</span>
      <span class="switch"><input type="checkbox" id="sh-add-reading"><span class="knob"></span></span>
    </div>
    <div class="sheet-actions">
      <button class="quiet" data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="save">Hinzufügen</button>
    </div>`, { accent: "var(--media)" });

  let chosenTier = "";
  sheet.querySelectorAll("#sh-add-tier button").forEach(bt => bt.addEventListener("click", () => {
    chosenTier = (chosenTier === bt.dataset.tier) ? "" : bt.dataset.tier;
    sheet.querySelectorAll("#sh-add-tier button").forEach(x => {
      const on = x.dataset.tier === chosenTier;
      x.classList.toggle("on", on);
      x.style.background = on ? TIER_COLOR[x.dataset.tier] : "";
    });
  }));

  sheet.querySelector('[data-act="cancel"]').addEventListener("click", close);
  sheet.querySelector('[data-act="save"]').addEventListener("click", async ev => {
    const raw = sheet.querySelector("#sh-media-title").value.trim();
    if (!raw) return;
    const { text: title, eng } = parseEnglish(raw);
    if (!title) return;
    const sel = sheet.querySelector("#sh-media-cat").value;
    const reading = sheet.querySelector("#sh-add-reading").checked;

    // Reihen-Schreibweise erkannt? Dann erst Bände holen und nachfragen.
    const ser = parseSeries(title);
    if (ser && getApiKey()) {
      ev.target.disabled = true; ev.target.textContent = "Claude sucht die Bände …";
      try {
        const o = await askSeries(ser.base, ser.from, ser.to, cfg, eng);
        if (o) { close(); openSeriesConfirm(o, cfg, eng); return; }
        alert("Dazu habe ich keine Reihe gefunden – ich trage es als einzelnen Eintrag ein.");
      } catch (err) {
        alert("Das hat nicht geklappt: " + err.message);
      }
      ev.target.disabled = false; ev.target.textContent = "Hinzufügen";
    }

    const b = {
      id: uid(), media: mediaView, question: title, eng, reading, created: Date.now(),
      cat: sel === "Auto" ? "" : sel, autoCat: sel === "Auto",
      desc: "", answer: sheet.querySelector("#sh-add-notes").value.trim(),
      cost: 0, tier: chosenTier
    };
    data.books.push(b);
    booksView = null;
    save(); close(); renderMedia();
    enrichMedia(b);
  });
  setTimeout(() => sheet.querySelector("#sh-media-title").focus(), 350);
}

function openMediaDetail(b) {
  const tierBtns = TIERS.map(t =>
    `<button data-tier="${t}" class="${b.tier === t ? "on" : ""}" style="${b.tier === t ? "background:" + TIER_COLOR[t] : ""}">${t}</button>`).join("");
  const { sheet, close } = openSheet(`
    <h3>${esc(b.question)}</h3>
    <div class="sub">${esc(catOf(b))}${b.eng ? " · Englisch" : ""}</div>
    <div class="toggle-row"><span>${esc((MEDIA[b.media] || MEDIA.book).activeSwitch)}</span>
      <span class="switch"><input type="checkbox" id="sh-reading" ${b.reading ? "checked" : ""}><span class="knob"></span></span>
    </div>
    <label>Meine Wertung</label>
    <div class="tier-row" id="sh-tier">${tierBtns}</div>
    <div class="hint" style="margin-top:8px">S = Highlight · D = gefällt mir nicht · nochmal tippen = entfernen</div>
    <label>Worum es geht</label>
    <div class="answer ${b.desc ? "" : "blank"}" id="sh-desc">${b.desc ? esc(b.desc) : "Noch keine Beschreibung."}</div>
    <button class="btn btn-secondary" id="sh-redesc" style="margin-top:10px">${ico("wand")}<span>${b.desc ? "Neu holen" : "Von Claude holen"}</span></button>
    <label>Meine Notizen</label>
    <textarea id="sh-notes" placeholder="Was du dazu festhalten willst …">${esc(b.answer || "")}</textarea>
    <div class="hint" style="margin-top:8px">Wird automatisch gespeichert.</div>
    <div class="sheet-actions">
      <button class="danger" data-act="del">🗑</button>
      <button class="primary" data-act="done">Fertig</button>
    </div>`, { accent: "var(--media)" });

  sheet.querySelector("#sh-redesc").addEventListener("click", async e => {
    const lbl = e.target.textContent;
    e.target.disabled = true; e.target.textContent = "Claude schlägt nach …";
    b.enriched = false;
    await enrichMedia(b);
    e.target.disabled = false; e.target.textContent = lbl;
    const d = sheet.querySelector("#sh-desc");
    d.textContent = b.desc || "Noch keine Beschreibung.";
    d.classList.toggle("blank", !b.desc);
    sheet.querySelector("h3").textContent = b.question;
  });

  sheet.querySelectorAll("#sh-tier button").forEach(bt => bt.addEventListener("click", () => {
    const t = bt.dataset.tier;
    b.tier = (b.tier === t) ? "" : t;   // gleicher Tier nochmal = entfernen
    save();
    sheet.querySelectorAll("#sh-tier button").forEach(x => {
      const on = x.dataset.tier === b.tier;
      x.classList.toggle("on", on);
      x.style.background = on ? TIER_COLOR[x.dataset.tier] : "";
    });
    renderMedia();
  }));

  sheet.querySelector("#sh-reading").addEventListener("change", e => {
    b.reading = e.target.checked; save(); renderMedia();
  });

  // Notizen: direkt tippen, automatisch speichern
  sheet.querySelector("#sh-notes").addEventListener("input", e => {
    b.answer = e.target.value;
    save();
  });

  sheet.querySelector('[data-act="done"]').addEventListener("click", () => {
    b.answer = (b.answer || "").trim();
    save(); renderMedia(); close();
  });
  sheet.querySelector('[data-act="del"]').addEventListener("click", () => {
    if (!confirm("„" + b.question + "“ löschen?")) return;
    data.books = data.books.filter(x => x.id !== b.id);
    save(); close(); renderMedia();
  });
}

async function fetchTips() {
  const cfg = M();
  const items = itemsOfMedia();
  const hasTiers = items.some(b => b.tier);
  let userText;
  if (hasTiers) {
    const list = items.map(b => b.question + (b.cat ? " [" + b.cat + "]" : "") + (b.tier ? " – Tier " + b.tier : " – ohne Wertung")).join("; ");
    userText = cfg.known + " (mit meiner Tier-Wertung: S = absolutes Highlight, A = sehr gut, B = okay, C = schwach, D = gefällt mir nicht): " + list
      + ". Berücksichtige die Wertungen stark: empfiehl vor allem Ähnliches zu S- und A-Titeln und meide Ähnliches zu C- und D-Titeln. " + cfg.tipsAsk;
  } else {
    userText = cfg.tipsIntro + ": " + items.map(b => b.question + (b.cat ? " [" + b.cat + "]" : "")).join("; ") + ". " + cfg.tipsAsk;
  }
  const r = await callClaude({
    system: "Du gibst Empfehlungen für " + cfg.label + ". Antworte auf Deutsch, ohne Vorwort und ohne Abschluss.",
    userText, maxTokens: 500
  });
  if (r) {
    data.mediaTips[mediaView] = { text: r.text, cost: r.cost, date: fmtDate(todayStr()) };
    save();
  }
}

function tipsCardsHtml(tips) {
  const lines = tips.text.split("\n").map(l => l.trim()).filter(Boolean);
  return lines.map((line, i) => {
    const clean = line.replace(/^\s*\d+[.)]\s*/, "");
    const parts = clean.split("|").map(s => s.trim());
    return `<div class="tip-card">
      <div class="tt">${i + 1}. ${esc(parts[0] || clean)}</div>
      ${parts[1] ? '<div class="ta">' + esc(parts[1]) + "</div>" : ""}
      ${parts[2] ? '<div class="tr">' + esc(parts.slice(2).join(" – ")) + "</div>" : ""}
    </div>`;
  }).join("");
}

async function openTipsSheet() {
  const cfg = M();
  if (!data.mediaTips[mediaView]) {
    const { sheet, close } = openSheet(`<h3>${esc(cfg.tipsTitle)}</h3><div class="sub">Claude sucht passende Vorschläge…</div>`, { accent: "var(--media)" });
    try { await fetchTips(); close(); }
    catch (err) { close(); alert("Das hat nicht geklappt: " + err.message); return; }
    if (!data.mediaTips[mediaView]) return;
  }
  const tips = data.mediaTips[mediaView];
  const { sheet, close } = openSheet(`
    <h3>${esc(cfg.tipsTitle)}</h3>
    <div class="sub">${esc(tips.date || "")} · Kosten: ${fmtCost(tips.cost || 0)}</div>
    ${tipsCardsHtml(tips)}
    <div class="sheet-actions">
      <button class="quiet" data-act="close">Schließen</button>
      <button class="primary" data-act="refresh">Neue Vorschläge</button>
    </div>`, { accent: "var(--media)" });
  sheet.querySelector('[data-act="close"]').addEventListener("click", close);
  sheet.querySelector('[data-act="refresh"]').addEventListener("click", async ev => {
    ev.target.disabled = true; ev.target.textContent = "Claude sucht…";
    try { await fetchTips(); close(); openTipsSheet(); }
    catch (err) { alert("Das hat nicht geklappt: " + err.message); ev.target.disabled = false; ev.target.textContent = "Neue Vorschläge"; }
  });
}

/* ================================================================
   VOKABELN — englische Wörter beim Lesen sammeln und wiederholen
   ================================================================ */
let vocabFilter = "";   // "" = alle, sonst Buchtitel

function vocabDue() {
  const t = todayStr();
  return data.vocab.filter(v => v.due && v.due <= t);   // ohne Termin = fertig gelernt
}

/* ---- Lernstand eines Worts ---- */
function vocabReverse(v) { return !v.learned && v.hits >= VOCAB_STEPS; }   // fehlt nur noch „andersrum"
function vocabAskReverse(v) { return vocabReverse(v) || (v.learned && v.refresh === 1); }   // 2. Auffrischung auch andersrum
function vocabStage(v) {
  if (v.learned) return v.due ? "Sitzt ✓ · Auffrischung " + (v.refresh + 1) + " von " + VOCAB_REFRESH.length + " steht noch aus"
    : "Sitzt ✓ · alle Auffrischungen geschafft";
  if (vocabReverse(v)) return "Als Nächstes: " + (v.kind === "term" ? "Bedeutung → Begriff" : "Deutsch → Englisch");
  return v.hits + " von " + VOCAB_STEPS + " in Folge gewusst";
}
function vocabBadge(v) { return v.learned ? "✓" : vocabReverse(v) ? "⇄" : v.hits + "/" + VOCAB_STEPS; }
function vocabSteps(v) {
  let dots = "";
  for (let i = 0; i < VOCAB_STEPS; i++) dots += `<i class="${v.learned || i < v.hits ? "on" : ""}"></i>`;
  return `<span class="vc-steps" title="${esc(vocabStage(v))}">${dots}<b class="${v.learned ? "on" : vocabReverse(v) ? "next" : ""}">⇄</b></span>`;
}
function gradeVocab(v, ok) {
  const today = todayStr();
  if (v.learned) {                            // Auffrischung
    if (ok) {
      v.refresh = (v.refresh || 0) + 1;
      if (v.refresh < VOCAB_REFRESH.length) v.due = addDaysIso(today, VOCAB_REFRESH[v.refresh]);
      else delete v.due;                      // fertig – kommt nicht mehr
    } else {
      v.learned = false; v.hits = 0;          // vergessen: wie jedes „Falsch" – von vorn
      delete v.refresh; delete v.learnedAt;
      v.due = addDaysIso(today, 1);
    }
    return;
  }
  if (vocabReverse(v)) {
    if (ok) { v.learned = true; v.learnedAt = today; v.refresh = 0; v.due = addDaysIso(today, VOCAB_REFRESH[0]); }
    else v.due = addDaysIso(today, 1);        // andersrum klappt noch nicht: morgen wieder andersrum
  } else if (ok) {
    v.hits = Math.min(VOCAB_STEPS, v.hits + 1);
    v.due = addDaysIso(today, VOCAB_GAPS[v.hits - 1]);
  } else {
    v.hits = 0;                               // Serie beginnt von vorn
    v.due = addDaysIso(today, 1);             // morgen wieder – heute ist die Runde für dieses Wort vorbei
  }
}
/* ---- Serie: Tage in Folge, an denen du geübt hast ----
   Ein Tag ohne Übung bricht die Serie nur, wenn an dem Tag auch etwas fällig war. */
function vocabPracticed() {
  const today = todayStr();
  // Wann wird nach dieser Runde wieder etwas fällig? (Heute noch Offenes zählt nicht – heute ist ja geübt.)
  const next = data.vocab.map(v => v.due).filter(d => d && d > today).sort()[0] || "9999-12-31";
  data.vocabLog[today] = next;
}
function vocabStreak() {
  const log = data.vocabLog;
  const days = Object.keys(log).sort();
  if (!days.length) return 0;
  const today = todayStr();
  let streak = 0;
  for (let d = today, i = 0; i < 1000 && d >= days[0]; i++, d = addDaysIso(d, -1)) {
    if (log[d]) { streak++; continue; }
    if (d === today) continue;                       // heute ist noch nicht vorbei
    const before = days.filter(x => x < d).pop();    // letzter Übungstag davor
    if (before && log[before] > d) continue;         // an dem Tag war nichts fällig – zählt nicht, bricht nicht
    break;
  }
  return streak;
}
function vocabPracticedToday() { return !!data.vocabLog[todayStr()]; }

function bookTitlesWithVocab() {
  return [...new Set(data.vocab.map(v => v.book).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de"));
}

async function lookupWord(word, sentence, book) {
  return callClaude({
    system: "Du hilfst einem deutschen Leser bei einem Wort aus seiner Lektüre. "
      + "Entscheide selbst, was gebraucht wird:\n"
      + "· Fremdsprachiges Wort (meist Englisch) → übersetzen. kind = \"word\".\n"
      + "· Deutscher Fachbegriff aus Philosophie, Wissenschaft o.ä. → in normalem Deutsch erklären, NICHT übersetzen. "
      + "trans ist dann eine kurze Umschreibung in zwei bis vier Wörtern. kind = \"term\".\n"
      + "Korrigiere Tippfehler und gib die Grundform an. "
      + "Antworte AUSSCHLIESSLICH mit JSON, ohne Code-Fences: "
      + '{"word":"<Wort, Grundform>","kind":"word"|"term","type":"<Wortart auf Deutsch>","trans":"<Übersetzung bzw. kurze Umschreibung>","meaning":"<ein bis zwei kurze deutsche Sätze: was es bedeutet>","example":"<ein kurzer Beispielsatz>","ipa":"<Lautschrift in IPA, ohne Schrägstriche>","say":"<Lesehilfe mit deutschen Buchstaben, Silben mit Bindestrich, betonte Silbe in GROSSBUCHSTABEN, z.B. ri-LAK-tent>"}. '
      + "Wenn ein Satz mitgeliefert wird, beziehe dich auf DIESE Bedeutung im Satz, nicht auf die häufigste. "
      + "Aussprache englischer Wörter " + (data.vocabAccent === "en-US" ? "amerikanisch" : "britisch") + "."
      + (book ? " Der Begriff stammt aus „" + book + "“ – erkläre ihn so, wie dieser Autor ihn verwendet." : ""),
    userText: sentence ? word + "\n\nIm Satz: " + sentence : word,
    maxTokens: 400
  });
}
function applyWord(v, o) {
  if (!o) return;
  if (o.word) v.word = String(o.word).trim();
  v.kind = o.kind === "term" ? "term" : "word";
  v.trans = String(o.trans || "").trim();
  v.type = String(o.type || "").trim();
  v.meaning = String(o.meaning || "").trim();
  v.example = String(o.example || "").trim();
  v.ipa = String(o.ipa || "").replace(/^\/|\/$/g, "").trim();
  v.say = String(o.say || "").trim();
}
function kindTag(v) {
  return v.kind === "term"
    ? '<span class="k-tag k-de">Fachbegriff</span>'
    : '<span class="k-tag k-eng">Englisch</span>';
}

/* ---- Aussprache: Vorlesen über die Stimme des Geräts ---- */
function speechSupported() { return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window; }
function speechLang(v) { return v.kind === "term" ? "de-DE" : data.vocabAccent; }
function pickVoice(lang) {
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return null;
  const norm = s => String(s).replace("_", "-").toLowerCase();
  const exact = voices.filter(x => norm(x.lang) === lang.toLowerCase());
  const same = exact.length ? exact : voices.filter(x => norm(x.lang).startsWith(lang.slice(0, 2).toLowerCase()));
  // Bessere Stimmen zuerst (iOS: „Erweitert"/„Premium", Android/Chrome: Google)
  const good = same.find(x => /premium|enhanced|erweitert|google|natural/i.test(x.name));
  return good || same.find(x => x.localService) || same[0] || null;
}
if (speechSupported()) speechSynthesis.getVoices();   // lädt die Stimmen schon mal vor

let lastSpoken = { word: "", at: 0 };
function speak(v, btn) {
  if (!speechSupported()) { alert("Dein Browser kann leider nicht vorlesen."); return; }
  const word = String(v.word || "").trim();
  if (!word) return;
  // Zweimal kurz hintereinander getippt → langsam und deutlich
  const slow = lastSpoken.word === word && Date.now() - lastSpoken.at < 4000;
  lastSpoken = { word: slow ? "" : word, at: Date.now() };
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.lang = speechLang(v);
  const voice = pickVoice(u.lang);
  if (voice) u.voice = voice;
  u.rate = slow ? 0.55 : 0.9;
  if (btn) {
    btn.classList.add("talking");
    const off = () => btn.classList.remove("talking");
    u.onend = off; u.onerror = off;
    setTimeout(off, 4000);
  }
  speechSynthesis.speak(u);
}
function sayBtn(extra = "") {
  return `<button class="say-btn ${extra}" title="Vorlesen (zweimal tippen = langsam)" aria-label="Vorlesen">${ico("speaker")}</button>`;
}

/* Lautschrift für ältere Wörter nachholen – ein Aufruf für viele Wörter */
async function fillPronunciations(btn) {
  const missing = data.vocab.filter(v => !v.ipa).slice(0, 40);
  if (!missing.length) return;
  const lbl = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = "<span>Claude holt die Lautschrift …</span>";
  try {
    const r = await callClaude({
      system: "Du gibst für Wörter die Aussprache an – für einen deutschen Muttersprachler. "
        + "Englische Wörter in " + (data.vocabAccent === "en-US" ? "amerikanischer" : "britischer") + " Aussprache, deutsche Begriffe auf Deutsch. "
        + "Antworte AUSSCHLIESSLICH mit JSON, ohne Code-Fences: "
        + '{"items":[{"word":"<genau wie angefragt>","ipa":"<IPA ohne Schrägstriche>","say":"<Lesehilfe mit deutschen Buchstaben, Silben mit Bindestrich, betonte Silbe in GROSSBUCHSTABEN>"}]}',
      userText: missing.map(v => v.word).join("\n"),
      maxTokens: 2500
    });
    const o = r && jsonFrom(r.text);
    const items = o && Array.isArray(o.items) ? o.items : [];
    items.forEach(it => {
      const v = missing.find(x => x.word.toLowerCase() === String(it.word || "").toLowerCase());
      if (v) { v.ipa = String(it.ipa || "").replace(/^\/|\/$/g, "").trim(); v.say = String(it.say || "").trim(); }
    });
    save(); renderVocab();
    if (items.length) cheer("Lautschrift für " + items.length + (items.length === 1 ? " Wort" : " Wörter") + " ergänzt");
  } catch (err) {
    alert("Das hat nicht geklappt: " + err.message);
    btn.disabled = false; btn.innerHTML = lbl;
  }
}

function vocabStreakLine() {
  const n = vocabStreak();
  const done = vocabPracticedToday();
  const txt = n === 0 ? "Übe heute, dann startet deine Serie."
    : done ? "🔥 " + n + (n === 1 ? " Tag" : " Tage") + " in Folge geübt – heute erledigt."
    : "🔥 " + n + (n === 1 ? " Tag" : " Tage") + " in Folge – heute noch üben, sonst reißt die Serie.";
  return '<div class="hint vc-streak" style="margin:-2px 2px 12px">' + txt + "</div>";
}

function renderVocab() {
  const box = $("media-body");
  box.innerHTML = "";
  const all = data.vocab;
  const due = vocabDue();

  if (!all.length) {
    box.innerHTML = '<div class="empty-state">Noch keine Vokabeln.<br>Beim Lesen ein unbekanntes Wort über + eintragen – Claude erklärt es dir.</div>';
    return;
  }

  const learned = all.filter(v => v.learned).length;
  box.insertAdjacentHTML("beforeend", `
    <div class="stat-grid">
      <div class="stat"><div class="v">${all.length}</div><div class="l">Wörter</div></div>
      <div class="stat"><div class="v" style="color:${due.length ? "var(--media)" : "var(--muted)"}">${due.length}</div><div class="l">fällig</div></div>
      <div class="stat"><div class="v" style="color:var(--todo)">${learned}</div><div class="l">sitzen</div></div>
    </div>
    ${vocabStreakLine()}
    ${btnHTML("primary", "vc-quiz", "play",
      due.length ? "Abfrage · " + due.length + " fällig" : "Heute nichts fällig",
      { accent: "var(--media)", disabled: !due.length })}
    ${btnHTML("secondary", "vc-photo", "camera", "Seite fotografieren")}
    <div class="hint vc-how">Jedes Wort einmal pro Runde · 3× in Folge gewusst, dann 1× andersrum ⇄ → sitzt. Auffrischung nach 1 und 3 Monaten. Falsch: 1× abschreiben, 2× aus dem Kopf, morgen wieder.</div>`);
  $("vc-photo").addEventListener("click", () => $("vocab-photo").click());
  if (due.length) $("vc-quiz").addEventListener("click", () => startQuiz(due));
  const noIpa = all.filter(v => !v.ipa).length;
  if (noIpa && getApiKey()) {
    box.insertAdjacentHTML("beforeend", btnHTML("quiet", "vc-ipa-fill", "",
      "Lautschrift für " + Math.min(noIpa, 40) + (noIpa === 1 ? " Wort" : " Wörter") + " nachholen"));
    $("vc-ipa-fill").addEventListener("click", e => fillPronunciations(e.currentTarget));
  }

  // Filter nach Buch
  const books = bookTitlesWithVocab();
  if (books.length > 1 || (books.length === 1 && all.some(v => !v.book))) {
    const f = document.createElement("div");
    f.className = "vc-filter";
    const chips = [["", "Alle"]].concat(books.map(b => [b, b.split(" – ")[0]]));
    if (all.some(v => !v.book)) chips.push(["__none", "Ohne Buch"]);
    f.innerHTML = chips.map(([k, l]) =>
      `<button class="vc-chip ${vocabFilter === k ? "on" : ""}" data-f="${esc(k)}">${esc(l)}</button>`).join("");
    f.querySelectorAll(".vc-chip").forEach(c => c.addEventListener("click", () => {
      vocabFilter = c.dataset.f; renderVocab();
    }));
    box.appendChild(f);
  }

  let list = all;
  if (vocabFilter === "__none") list = all.filter(v => !v.book);
  else if (vocabFilter) list = all.filter(v => v.book === vocabFilter);
  list = [...list].sort((a, b) => (b.created || 0) - (a.created || 0));

  box.insertAdjacentHTML("beforeend", '<div class="hint">Antippen für Details · nach links wischen = löschen</div>');
  const today = todayStr();
  list.forEach((v, i) => {
    const row = document.createElement("div");
    row.className = "row";
    row.style.cursor = "pointer";
    row.style.animationDelay = (i * .03) + "s";
    const ripe = !!v.due && v.due <= today;
    row.innerHTML = `
      <div class="grow">
        <div class="vc-word">${esc(v.word)}${v.ipa ? '<span class="vc-ipa">/' + esc(v.ipa) + "/</span>" : ""}</div>
        <div class="vc-trans">${v.busy ? "Claude schlägt nach …" : esc(v.trans || "")}</div>
      </div>
      ${speechSupported() ? sayBtn() : ""}
      <span class="vc-box ${ripe ? "ripe" : ""} ${v.learned ? "done" : ""}" title="${esc(vocabStage(v))}">${vocabBadge(v)}</span>
      <span style="color:var(--faint)">›</span>`;
    row.addEventListener("click", () => openVocabDetail(v));
    const sb = row.querySelector(".say-btn");
    if (sb) sb.addEventListener("click", e => { e.stopPropagation(); speak(v, sb); });
    enableSwipe(row, {
      onDelete: () => { data.vocab = data.vocab.filter(x => x.id !== v.id); save(); renderVocab(); }
    });
    box.appendChild(row);
  });
}

function openVocabSheet() {
  // Laufende Bücher zuerst, das zuletzt benutzte vorausgewählt
  const reading = data.books.filter(b => b.reading);
  const last = data.vocab.length ? data.vocab[data.vocab.length - 1].book : "";
  let picked = reading.some(b => b.question === last) ? last : (reading[0] ? reading[0].question : "");
  const chips = reading.map(b =>
    `<span class="vc-chip ${b.question === picked ? "on" : ""}" data-book="${esc(b.question)}">${esc(bookLabel(b.question, 20))}</span>`).join("")
    + `<span class="vc-chip ${picked ? "" : "on"}" data-book="">Kein Buch</span>`;

  const { sheet, close } = openSheet(`
    <h3>Neues Wort</h3>
    <div class="sub">Englische Wörter werden übersetzt, deutsche Fachbegriffe erklärt.</div>
    <input type="text" id="vc-word" placeholder="z.B. reluctant oder Apperzeption" autocomplete="off" autocapitalize="none" spellcheck="false">
    <label>Satz aus dem Buch (optional)</label>
    <textarea id="vc-sent" placeholder="„She was reluctant to leave the house.“" style="min-height:80px"></textarea>
    <div class="hint" style="margin-top:8px">Lohnt sich bei Wörtern mit mehreren Bedeutungen.</div>
    <label>Buch</label>
    <div class="vc-filter" id="vc-books">${chips}</div>
    <div class="sheet-actions">
      <button class="quiet" data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="save">Nachschlagen</button>
    </div>`, { accent: "var(--media)" });

  sheet.querySelectorAll("#vc-books .vc-chip").forEach(c => c.addEventListener("click", () => {
    picked = c.dataset.book;
    sheet.querySelectorAll("#vc-books .vc-chip").forEach(x => x.classList.toggle("on", x === c));
  }));

  sheet.querySelector('[data-act="cancel"]').addEventListener("click", close);
  sheet.querySelector('[data-act="save"]').addEventListener("click", async ev => {
    const word = sheet.querySelector("#vc-word").value.trim();
    if (!word) return;
    const sentence = sheet.querySelector("#vc-sent").value.trim();
    const book = picked;
    const v = {
      id: uid(), word, sentence, book, kind: "word",
      trans: "", type: "", meaning: "", example: "",
      hits: 0, learned: false, due: todayStr(), created: Date.now()
    };
    data.vocab.push(v);
    save(); close(); renderVocab();

    if (!getApiKey()) return;
    v.busy = true; renderVocab();
    try {
      const r = await lookupWord(word, sentence, book);
      if (r) applyWord(v, jsonFrom(r.text));
    } catch {
      // Wort bleibt drin, Übersetzung kann man später nachholen
    } finally {
      delete v.busy;
      save(); renderVocab();
    }
  });
  setTimeout(() => sheet.querySelector("#vc-word").focus(), 350);
}

function openVocabDetail(v) {
  const { sheet, close } = openSheet(`
    <h3>${esc(v.word)} ${kindTag(v)}</h3>
    <div class="sub">${esc(v.type || "")}${v.book ? (v.type ? " · " : "") + esc(bookLabel(v.book, 24)) : ""}</div>
    <label>${v.kind === "term" ? "Kurz gesagt" : "Übersetzung"}</label>
    <div class="answer ${v.trans ? "" : "blank"}" id="vc-d-trans">${v.trans ? esc(v.trans) : "Noch nicht nachgeschlagen."}</div>
    <label>Aussprache</label>
    <div class="say-row">
      ${speechSupported() ? sayBtn("big") : ""}
      <div class="grow">
        ${v.ipa ? '<div class="say-ipa">/' + esc(v.ipa) + "/</div>" : ""}
        ${v.say ? '<div class="say-de">sprich: ' + esc(v.say) + "</div>" : ""}
        ${!v.ipa && !v.say ? '<div class="say-de">' + (speechSupported() ? "Antippen zum Anhören · zweimal = langsam." : "") + (getApiKey() ? " Lautschrift gibt es über „Neu nachschlagen“." : "") + "</div>" : ""}
      </div>
    </div>
    ${v.meaning ? '<label>Bedeutung</label><div class="answer" id="vc-d-mean">' + esc(v.meaning) + "</div>" : ""}
    ${v.example ? '<label>Beispiel</label><div class="answer" style="font-style:italic" id="vc-d-ex">' + esc(v.example) + "</div>" : ""}
    ${v.sentence ? '<label>Dein Satz</label><div class="answer" style="font-style:italic">' + esc(v.sentence) + "</div>" : ""}
    <label>Lernstand</label>
    <div class="kv"><span class="k">${vocabSteps(v)}</span><span class="v">${esc(vocabStage(v))}</span></div>
    <div class="kv"><span class="k">${v.learned ? "Auffrischung" : "Nächste Abfrage"}</span><span class="v">${!v.due ? "keine mehr" : v.due <= todayStr() ? "jetzt fällig" : fmtNice(v.due)}</span></div>
    ${v.learned ? '<button class="btn btn-quiet" id="vc-relearn"><span>Doch nochmal lernen</span><span>›</span></button>' : ""}
    <button class="btn btn-secondary" id="vc-again" style="margin-top:12px">${ico("wand")}<span>${v.trans ? "Neu nachschlagen" : "Jetzt nachschlagen"}</span></button>
    <div class="sheet-actions">
      <button class="danger" data-act="del">🗑</button>
      <button class="primary" data-act="done">Fertig</button>
    </div>`, { accent: "var(--media)" });

  const rl = sheet.querySelector("#vc-relearn");
  if (rl) rl.addEventListener("click", () => {
    v.learned = false; v.hits = 0; v.due = todayStr(); delete v.learnedAt; delete v.refresh;
    save(); renderVocab(); close(); openVocabDetail(v);
  });
  const dsb = sheet.querySelector(".say-row .say-btn");
  if (dsb) dsb.addEventListener("click", () => speak(v, dsb));
  sheet.querySelector("#vc-again").addEventListener("click", async e => {
    const lbl = e.target.textContent;
    e.target.disabled = true; e.target.textContent = "Claude schlägt nach …";
    try {
      const r = await lookupWord(v.word, v.sentence, v.book);
      const o = r && jsonFrom(r.text);
      if (o) {
        applyWord(v, o);
        save(); renderVocab();
        close(); openVocabDetail(v);
        return;
      }
    } catch (err) { alert("Das hat nicht geklappt: " + err.message); }
    e.target.disabled = false; e.target.textContent = lbl;
  });
  sheet.querySelector('[data-act="done"]').addEventListener("click", close);
  sheet.querySelector('[data-act="del"]').addEventListener("click", () => {
    if (!confirm("„" + v.word + "“ löschen?")) return;
    data.vocab = data.vocab.filter(x => x.id !== v.id);
    save(); close(); renderVocab();
  });
}

/* ---- Seite fotografieren: Claude sucht die schweren Wörter heraus ---- */
$("vocab-photo").addEventListener("change", async e => {
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  if (file) await readPage(file);
});

async function readPage(file) {
  if (!getApiKey()) { alert("Dafür brauchst du deinen API-Schlüssel in den Einstellungen."); return; }
  let loading = null;
  try {
    const dataUrl = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file);
    });
    const [, mediaType, base64] = /^data:(.+);base64,(.*)$/.exec(dataUrl) || [];
    if (!base64) { alert("Das Bild konnte nicht gelesen werden."); return; }

    loading = openSheet('<h3>📷 Seite wird gelesen…</h3><div class="sub">Claude sucht die schwierigen Wörter heraus.</div>',
      { accent: "var(--media)" });

    const bekannt = data.vocab.map(v => v.word.toLowerCase());
    const r = await callClaude({
      system: "Du siehst das Foto einer Buchseite. Der Leser ist deutscher Muttersprachler. "
        + "Suche die 8 schwierigsten Wörter heraus – seltene englische Vokabeln oder deutsche Fachbegriffe, "
        + "die ein normaler Leser vermutlich nicht kennt. Alltagswörter überspringst du. "
        + "Für jedes: kind \"word\" (fremdsprachig, übersetzen) oder \"term\" (deutscher Fachbegriff, erklären). "
        + "Antworte AUSSCHLIESSLICH mit JSON, ohne Code-Fences: "
        + '{"items":[{"word":"…","kind":"word"|"term","type":"<Wortart>","trans":"<Übersetzung bzw. kurze Umschreibung>","meaning":"<ein kurzer deutscher Satz>","example":"<Satz von der Seite, in dem es vorkommt>","ipa":"<Lautschrift in IPA, ohne Schrägstriche>","say":"<Lesehilfe mit deutschen Buchstaben, betonte Silbe in GROSSBUCHSTABEN>"}]}. '
        + "Wenn du nichts Schwieriges findest, gib \"items\": [] zurück.",
      userText: "Welche Wörter dieser Seite könnten mir Probleme machen?"
        + (bekannt.length ? "\nDiese kenne ich schon, lass sie weg: " + bekannt.slice(-60).join(", ") : ""),
      image: { mediaType, data: base64 },
      maxTokens: 2000
    });
    loading.close(); loading = null;
    if (!r) return;
    const o = jsonFrom(r.text);
    const items = (o && Array.isArray(o.items) ? o.items : Array.isArray(o) ? o : []).filter(x => x && x.word);
    if (!items.length) { alert("Auf der Seite habe ich nichts Schwieriges gefunden."); return; }
    openPagePick(items);
  } catch (err) {
    if (loading) loading.close();
    alert("Das hat nicht geklappt: " + err.message);
  }
}

function openPagePick(items) {
  const reading = data.books.filter(b => b.reading);
  const last = data.vocab.length ? data.vocab[data.vocab.length - 1].book : "";
  let picked = reading.some(b => b.question === last) ? last : (reading[0] ? reading[0].question : "");
  const chips = reading.map(b =>
    `<span class="vc-chip ${b.question === picked ? "on" : ""}" data-book="${esc(b.question)}">${esc(bookLabel(b.question, 20))}</span>`).join("")
    + `<span class="vc-chip ${picked ? "" : "on"}" data-book="">Kein Buch</span>`;

  const have = new Set(data.vocab.map(v => v.word.toLowerCase()));
  const rows = items.map((it, i) => {
    const dup = have.has(String(it.word).toLowerCase());
    return `<div class="row ${dup ? "" : "sel"}" data-i="${i}" style="cursor:pointer">
      <button class="ring-check" style="${dup ? "" : "background:var(--media);border-color:var(--media)"}">${dup ? "" : "✓"}</button>
      <div class="grow"><div class="t">${esc(it.word)} ${it.kind === "term" ? '<span class="k-tag k-de">Begriff</span>' : ""}</div>
        <div class="s"><span class="prev">${dup ? "schon gesammelt" : esc(it.trans || "")}</span></div>
      </div></div>`;
  }).join("");

  const { sheet, close } = openSheet(`
    <h3>${items.length} Wörter gefunden</h3>
    <div class="sub">Tipp an, was du behalten willst.</div>
    <label>Buch</label>
    <div class="vc-filter" id="pp-books">${chips}</div>
    <div style="margin-top:12px">${rows}</div>
    <div class="sheet-actions">
      <button class="quiet" data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="add">Übernehmen</button>
    </div>`, { accent: "var(--media)" });

  sheet.querySelectorAll("#pp-books .vc-chip").forEach(c => c.addEventListener("click", () => {
    picked = c.dataset.book;
    sheet.querySelectorAll("#pp-books .vc-chip").forEach(x => x.classList.toggle("on", x === c));
  }));
  sheet.querySelectorAll('.row[data-i]').forEach(row => row.addEventListener("click", () => {
    const on = row.classList.toggle("sel");
    const c = row.querySelector(".ring-check");
    c.textContent = on ? "✓" : "";
    c.style.cssText = on ? "background:var(--media);border-color:var(--media)" : "";
  }));
  sheet.querySelector('[data-act="cancel"]').addEventListener("click", close);
  sheet.querySelector('[data-act="add"]').addEventListener("click", () => {
    const chosen = [...sheet.querySelectorAll(".row.sel")].map(r => items[parseInt(r.dataset.i, 10)]);
    chosen.forEach(it => {
      data.vocab.push({
        id: uid(), word: String(it.word).trim(), sentence: "", book: picked,
        kind: it.kind === "term" ? "term" : "word",
        trans: String(it.trans || "").trim(), type: String(it.type || "").trim(),
        meaning: String(it.meaning || "").trim(), example: String(it.example || "").trim(),
        ipa: String(it.ipa || "").replace(/^\/|\/$/g, "").trim(), say: String(it.say || "").trim(),
        hits: 0, learned: false, due: todayStr(), created: Date.now()
      });
    });
    save(); close(); renderVocab();
    if (chosen.length) cheer(chosen.length + (chosen.length === 1 ? " Wort" : " Wörter") + " übernommen");
  });
}

/* ---- Abfrage ---- */
/* Abschreiben prüfen: Groß/klein, Satzzeichen, Klammerzusätze und „to …" bei Verben sind egal.
   Bei mehreren Übersetzungen („widerwillig, zögernd") reicht eine davon.
   Ein einzelner Tippfehler bei längeren Wörtern geht durch. */
function normWord(s) {
  return String(s).toLowerCase().normalize("NFC")
    .replace(/[’`´]/g, "'").replace(/[.,!?;:"“”„()]/g, " ")
    .replace(/^\s*to\s+/, "").replace(/\s+/g, " ").trim();
}
function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function copyMatches(typed, answer) {
  const a = normWord(typed);
  if (!a) return false;
  const variants = [answer, String(answer).replace(/\([^)]*\)/g, " ")].concat(String(answer).split(/[,;\/]| oder /));
  return variants.some(x => {
    const b = normWord(x);
    return b && (a === b || (b.length >= 5 && editDistance(a, b) <= 1));
  });
}

function startQuiz(words) {
  // Jedes fällige Wort genau einmal – egal ob gewusst oder nicht
  const queue = [...words].sort(() => Math.random() - 0.5);
  const total = queue.length;
  let done = 0, right = 0, learnedNow = 0;

  const el = document.createElement("div");
  el.className = "quiz";
  el.innerHTML = `
    <div class="quiz-top">
      <span class="quiz-count" id="q-count"></span>
      <button class="sheet-x" style="position:static" id="q-close">✕</button>
    </div>
    <div class="quiz-bar"><span id="q-bar" style="width:0%"></span></div>
    <div class="quiz-mid">
      <div id="q-steps"></div>
      <div class="quiz-w" id="q-word"></div>
      <div class="quiz-src" id="q-src"></div>
      <div id="q-say"></div>
      <div class="quiz-a" id="q-answer"></div>
    </div>
    <div class="quiz-btns" id="q-btns"></div>`;
  document.body.appendChild(el);

  const close = () => {
    if (speechSupported()) speechSynthesis.cancel();
    el.remove();
    if (currentTab === "media" && mediaView === "vocab") renderVocab();
    rerenderAll();
  };
  $("q-close").addEventListener("click", close);

  const show = () => {
    if (!queue.length) { finish(); return; }
    const v = queue[0];
    el.classList.remove("open");
    $("q-count").textContent = done + " von " + total;
    $("q-bar").style.width = (total ? done / total * 100 : 0) + "%";

    // Erst dreimal Englisch → Deutsch, dann einmal andersrum; Auffrischung: erst vorwärts, dann andersrum
    const reverse = vocabAskReverse(v);
    const front = reverse ? (v.trans || v.meaning || v.word) : v.word;
    const back = reverse ? v.word : (v.trans || v.meaning || "–");

    $("q-steps").innerHTML = vocabSteps(v);
    $("q-word").textContent = front;
    $("q-word").style.fontSize = front.length > 22 ? "27px" : "";
    const askEn = v.kind === "term" ? "Wie heißt der Begriff?" : "Wie heißt es auf Englisch?";
    $("q-src").textContent = v.learned
      ? "Auffrischung " + (v.refresh + 1) + " von " + VOCAB_REFRESH.length + " · " + (reverse ? askEn : "Weißt du's noch?")
      : reverse ? "Letzter Schritt: " + askEn
      : (v.book ? bookLabel(v.book, 22) : "");
    // Vorlese-Knopf: vorwärts gleich da, andersrum erst nach dem Aufdecken (sonst verrät er die Lösung)
    const canSay = speechSupported();
    $("q-say").innerHTML = canSay && !reverse ? sayBtn("big") : "";
    $("q-answer").innerHTML = `
      <div class="quiz-t">${esc(back)}</div>
      ${v.ipa ? '<div class="quiz-ipa">/' + esc(v.ipa) + "/" + (v.say ? " · " + esc(v.say) : "") + "</div>" : ""}
      ${canSay && reverse ? '<div style="margin-top:12px">' + sayBtn("big") + "</div>" : ""}
      ${v.meaning && !reverse ? '<div class="quiz-m">' + esc(v.meaning) + "</div>" : ""}
      ${v.example ? '<div class="quiz-e">„' + esc(v.example) + "“</div>" : ""}`;
    el.querySelectorAll("#q-say .say-btn, #q-answer .say-btn").forEach(b => b.addEventListener("click", () => speak(v, b)));
    $("q-btns").innerHTML = '<button class="quiz-reveal" id="q-reveal">Aufdecken</button>';
    $("q-reveal").addEventListener("click", () => {
      el.classList.add("open");
      if (canSay && data.vocabSpeak) speak(v, el.querySelector("#q-say .say-btn, #q-answer .say-btn"));
      $("q-btns").innerHTML = '<button class="quiz-again" id="q-wrong">Falsch</button><button class="quiz-got" id="q-right">Richtig</button>';
      $("q-wrong").addEventListener("click", () => grade(false));
      $("q-right").addEventListener("click", () => grade(true));
    });
  };

  const next = () => { queue.shift(); done++; show(); };

  const grade = ok => {
    const v = queue[0];
    const reverse = vocabAskReverse(v);
    const wasLearned = v.learned;
    gradeVocab(v, ok);          // sofort speichern – auch wenn du danach abbrichst
    vocabPracticed();
    save();
    if (ok) {
      right++;
      if (!wasLearned && v.learned) { learnedNow++; cheer("„" + v.word + "“ sitzt jetzt!"); }
      next();
    } else {
      startCopy(v, reverse);
    }
  };

  /* Falsch → Abschreiben, Abdecken, Vergleichen:
     1× mit sichtbarer Lösung abschreiben, dann 2× aus dem Kopf. Wer's nicht mehr weiß (falsch oder leer),
     sieht die Lösung zum Vergleichen – sobald wieder getippt wird, ist sie wieder verdeckt. */
  const startCopy = (v, reverse) => {
    const answer = reverse ? v.word : (v.trans || v.meaning || "");
    if (!answer.trim()) { next(); return; }
    let copies = 0, peek = false;
    const canSay = speechSupported();
    const dots = () => Array.from({ length: VOCAB_COPIES }, (_, k) => `<i class="${k < copies ? "on" : ""}"></i>`).join("");
    $("q-steps").innerHTML = vocabSteps(v);
    $("q-say").innerHTML = "";
    $("q-answer").innerHTML = `
      <div class="copy-box" id="q-box">
        <div class="quiz-t copy-answer">${esc(answer)}</div>
        ${reverse && v.ipa ? '<div class="quiz-ipa">/' + esc(v.ipa) + "/" + (v.say ? " · " + esc(v.say) : "") + "</div>" : ""}
        ${reverse && canSay ? '<div style="margin-top:10px">' + sayBtn() + "</div>" : ""}
        <div class="copy-cover">verdeckt</div>
      </div>
      <input type="text" class="quiz-input" id="q-input" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="done">
      <div class="copy-dots" id="q-dots"></div>
      <div class="copy-hint" id="q-hint"></div>`;
    el.classList.add("open");
    const box = $("q-box"), input = $("q-input"), hint = $("q-hint");
    const sb = box.querySelector(".say-btn");
    if (sb) sb.addEventListener("click", () => speak(v, sb));
    const paint = () => {
      const fromMemory = copies > 0;
      box.classList.toggle("covered", fromMemory && !peek);
      $("q-src").textContent = fromMemory ? "Jetzt aus dem Kopf" : "Falsch – schreib die Lösung ab";
      input.placeholder = (fromMemory ? "Aus dem Kopf" : "Abschreiben") + " (" + (copies + 1) + " von " + VOCAB_COPIES + ")";
      $("q-dots").innerHTML = dots();
    };
    paint();
    $("q-btns").innerHTML = '<button class="quiz-reveal" id="q-ok">OK</button>';
    setTimeout(() => input.focus(), 50);

    const showToCompare = text => { peek = true; paint(); hint.textContent = text; };
    const check = () => {
      if (copies >= VOCAB_COPIES) return;
      const fromMemory = copies > 0;
      if (!input.value.trim()) {
        if (fromMemory) showToCompare("So heißt es. Präg es dir ein – beim Tippen wird es wieder verdeckt.");
        input.focus();
        return;
      }
      if (!copyMatches(input.value, answer)) {
        input.classList.remove("bad"); void input.offsetWidth; input.classList.add("bad");
        if (fromMemory) showToCompare("Nicht ganz – vergleiche. Beim Tippen wird es wieder verdeckt.");
        else hint.textContent = "Nicht ganz – schau genau hin.";
        input.select();
        return;
      }
      copies++;
      peek = false;
      input.classList.remove("bad");
      input.value = "";
      if (copies < VOCAB_COPIES) {
        hint.textContent = copies === 1 ? "Gut. Jetzt ist es verdeckt – schreib es aus dem Kopf." : "";
        paint(); input.focus();
        return;
      }
      $("q-dots").innerHTML = dots();
      box.classList.remove("covered");        // zum Abschluss noch einmal zeigen
      hint.textContent = "Eingeprägt. Morgen kommt es wieder.";
      input.disabled = true;
      $("q-ok").disabled = true;
      setTimeout(next, 800);
    };
    input.addEventListener("input", () => { if (peek) { peek = false; paint(); } });
    $("q-ok").addEventListener("click", check);
    input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); check(); } });
  };

  const finish = () => {
    el.classList.remove("open");
    $("q-count").textContent = "fertig";
    $("q-bar").style.width = "100%";
    const wrong = total - right;
    el.querySelector(".quiz-mid").innerHTML = `
      <div class="quiz-done">
        <div class="qd-big">${right} von ${total}</div>
        <div class="quiz-m">${wrong === 0 ? "Alles gewusst. Stark." : wrong + (wrong === 1 ? " Wort kommt" : " Wörter kommen") + " morgen wieder."}</div>
        ${learnedNow ? '<div class="quiz-m" style="color:var(--todo);font-weight:700">' + learnedNow + (learnedNow === 1 ? " Wort sitzt" : " Wörter sitzen") + " jetzt.</div>" : ""}
      </div>`;
    $("q-btns").innerHTML = '<button class="quiz-got" id="q-fin">Fertig</button>';
    $("q-fin").addEventListener("click", close);
  };

  show();
}

/* ================================================================
   SPORT
   ================================================================ */
const SPORT_EX = [
  { name: "Dips", unit: "Wdh" },
  { name: "Liegestütze", unit: "Wdh" },
  { name: "Klimmzüge", unit: "Wdh" },
  { name: "Plank", unit: "Sek" }
];
function allEx() {
  return SPORT_EX.filter(e => !data.sport.removedEx.includes(e.name)).concat(data.sport.customEx);
}
function isCustomEx(name) { return data.sport.customEx.some(e => e.name === name); }
function splitOf(name) { return data.sport.splits.find(sp => sp.ex.includes(name)) || null; }
function daysForEx(name) {
  const sp = splitOf(name);
  if (sp) return sp.days;
  const d = data.sport.exDays[name];
  return Array.isArray(d) ? d : data.sport.trainingDays;
}
function exOnDay(dow) { return allEx().filter(e => daysForEx(e.name).includes(dow)); }
function splitsOnDay(dow) { return data.sport.splits.filter(sp => sp.days.includes(dow) && sp.ex.length); }
let sportWeek = 0;   // 0 = diese Woche, -1 = vorige …

document.querySelectorAll("#sport-seg button").forEach(b => {
  b.addEventListener("click", () => {
    sportView = b.dataset.sview;
    renderSport(); updateFab();
  });
});

function renderSport() {
  document.querySelectorAll("#sport-seg button").forEach(x => x.classList.toggle("on", x.dataset.sview === sportView));
  const box = $("sport-body");
  box.innerHTML = "";
  if (sportView === "training") renderTraining(box);
  else if (sportView === "runs") renderRuns(box);
  else renderSkills(box);
}

/* ---- Training ---- */
function mondayOf(d) { const x = new Date(d); const off = (x.getDay() + 6) % 7; x.setDate(x.getDate() - off); x.setHours(0, 0, 0, 0); return x; }
function addD(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function weekTotal(exName, weeksAgo) {
  const mon = mondayOf(new Date()); mon.setDate(mon.getDate() - 7 * weeksAgo);
  let sum = 0;
  for (let i = 0; i < 7; i++) { const day = data.sport.log[isoDate(addD(mon, i))]; if (day && day[exName]) sum += day[exName]; }
  return sum;
}
function monthTotal(exName, y, m) {
  let sum = 0;
  for (const iso in data.sport.log) { const [yy, mm] = iso.split("-").map(Number); if (yy === y && mm === m + 1 && data.sport.log[iso][exName]) sum += data.sport.log[iso][exName]; }
  return sum;
}
function statFor(exName) {
  const today = todayStr();
  let last = null, lastDate = "", best = 0;
  for (const iso in data.sport.log) {
    if (iso === today) continue;
    const v = data.sport.log[iso][exName];
    if (!v) continue;
    if (v > best) best = v;
    if (iso > lastDate) { lastDate = iso; last = v; }
  }
  return { last, best: best || null };
}

let showAllEx = false;

function renderTraining(box) {
  const todayIso = todayStr();
  const todayLog = data.sport.log[todayIso] || {};
  const dow = new Date().getDay();
  const planned = exOnDay(dow);
  const heute = showAllEx ? allEx() : planned;
  const isTrain = planned.length > 0;
  const arten = splitsOnDay(dow).map(sp => sp.name).join(" · ");

  box.insertAdjacentHTML("beforeend", `
    <div class="btn-row">
      ${btnHTML("secondary", "btn-progress", "chart", "Fortschritt")}
      ${btnHTML("secondary", "btn-week", "cal", sportWeek === 0 ? "Diese Woche" : "Woche")}
    </div>
    <div id="week-slot"></div>
    <div class="sect"><span class="tick" style="background:var(--sport)"></span>
      <h2>${arten ? esc(arten) : "Heute"} · ${fmtNice(todayIso)}</h2>
      ${isTrain ? "" : '<span class="chip-badge">Ruhetag</span>'}
    </div>`);

  heute.forEach((ex, i) => {
    const val = todayLog[ex.name] || "";
    const done = val !== "" && val > 0;
    const row = document.createElement("div");
    row.className = "row ex-row" + (done ? " done-ex" : "");
    row.style.animationDelay = (i * .04) + "s";
    row.innerHTML = `
      <span class="ring-check">${done ? "✓" : ""}</span>
      <div class="grow"><div class="t">${esc(ex.name)}</div>
        ${statLine(ex)}</div>
      ${ex.unit === "Sek" ? '<button class="ex-timer" title="Stoppuhr">' + ico("stop") + "</button>" : ""}
      <input class="val" type="number" inputmode="numeric" min="0" value="${val}" placeholder="0">
      <span class="unit">${ex.unit}</span>`;
    row.querySelector(".val").addEventListener("change", e => {
      const v = parseInt(e.target.value, 10);
      const before = statFor(ex.name).best;
      if (!data.sport.log[todayIso]) data.sport.log[todayIso] = {};
      if (v > 0) data.sport.log[todayIso][ex.name] = v; else delete data.sport.log[todayIso][ex.name];
      if (Object.keys(data.sport.log[todayIso]).length === 0) delete data.sport.log[todayIso];
      save();
      if (v > 0 && before != null && v > before) cheer(ex.name + ": neuer Bestwert! " + v + " " + ex.unit);
      renderSport();
    });
    const tb = row.querySelector(".ex-timer");
    if (tb) tb.addEventListener("click", ev => { ev.stopPropagation(); openTimer(ex); });
    // Jede Übung: nach links wischen = entfernen (Standards lassen sich über + zurückholen)
    enableSwipe(row, {
      onDelete: () => {
        if (isCustomEx(ex.name)) data.sport.customEx = data.sport.customEx.filter(e2 => e2.name !== ex.name);
        else data.sport.removedEx.push(ex.name);
        save(); renderSport();
      }
    });
    box.appendChild(row);
  });
  if (!allEx().length) {
    box.insertAdjacentHTML("beforeend", '<div class="empty-state">Keine Übungen.<br>Füge über + welche hinzu.</div>');
  } else if (!heute.length) {
    box.insertAdjacentHTML("beforeend", '<div class="empty-state">Heute steht nichts an.<br>Trotzdem Lust? Zeig dir alle Übungen.</div>');
  } else {
    box.insertAdjacentHTML("beforeend", '<div class="hint">Nach links wischen = Übung entfernen · neue über +</div>');
  }

  if (allEx().length > heute.length || showAllEx) {
    box.insertAdjacentHTML("beforeend", btnHTML("quiet", "btn-all",
      "", showAllEx ? "Nur heutige Übungen" : "Alle Übungen zeigen"));
    $("btn-all").addEventListener("click", () => { showAllEx = !showAllEx; renderSport(); });
  }
  box.insertAdjacentHTML("beforeend", btnHTML("quiet", "btn-days", "", "Trainingsplan"));

  $("btn-progress").addEventListener("click", openProgressSheet);
  $("btn-week").addEventListener("click", () => { sportWeek = 0; renderSport(); });
  $("btn-days").addEventListener("click", openPlanSheet);
  renderSportWeek($("week-slot"));
}

/* Stoppuhr für Übungen in Sekunden – groß, weil du dabei auf dem Boden liegst */
function openTimer(ex) {
  const todayIso = todayStr();
  const before = statFor(ex.name).best;
  const el = document.createElement("div");
  el.className = "timer";
  el.innerHTML = `
    <div class="tm-top">
      <span class="tm-name">${esc(ex.name)}</span>
      <button class="sheet-x" style="position:static" id="tm-x">✕</button>
    </div>
    <div class="tm-mid">
      <div class="tm-num" id="tm-num">0</div>
      <div class="tm-unit">Sekunden</div>
      <div class="tm-best">${before != null ? "Bestwert " + before + " Sek" : "noch kein Bestwert"}</div>
    </div>
    <div class="tm-foot">
      <button class="btn btn-primary" id="tm-go" style="--accent: var(--sport)">Start</button>
      <button class="btn btn-secondary" id="tm-save" disabled>Übernehmen</button>
    </div>`;
  document.body.appendChild(el);

  let start = 0, iv = null, secs = 0, running = false;
  const num = el.querySelector("#tm-num");
  const go = el.querySelector("#tm-go");
  const saveBtn = el.querySelector("#tm-save");

  const tick = () => {
    secs = Math.floor((Date.now() - start) / 1000);
    num.textContent = secs;
    if (before != null && secs === before + 1) num.classList.add("record");
  };
  const stop = () => {
    running = false; clearInterval(iv); iv = null;
    go.textContent = "Weiter";
    saveBtn.disabled = secs <= 0;
  };
  go.addEventListener("click", () => {
    if (running) { stop(); return; }
    running = true;
    start = Date.now() - secs * 1000;
    go.textContent = "Stopp";
    saveBtn.disabled = true;
    iv = setInterval(tick, 200);
    tick();
  });
  saveBtn.addEventListener("click", () => {
    if (secs <= 0) return;
    if (!data.sport.log[todayIso]) data.sport.log[todayIso] = {};
    data.sport.log[todayIso][ex.name] = secs;
    save();
    clearInterval(iv);
    el.remove();
    if (before != null && secs > before) cheer(ex.name + ": neuer Bestwert! " + secs + " Sek");
    renderSport();
  });
  el.querySelector("#tm-x").addEventListener("click", () => { clearInterval(iv); el.remove(); });
}

/* Kurze Rückmeldung, wenn ein Rekord fällt */
function cheer(text) {
  const el = document.createElement("div");
  el.className = "cheer";
  el.textContent = "🎉 " + text;
  document.body.appendChild(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 400); }, 2400);
}

/* Die Woche als Zeile je Übung – echte Zahlen statt Häkchen */
function renderSportWeek(el) {
  const todayIso = todayStr();
  const mon = mondayOf(new Date());
  mon.setDate(mon.getDate() + sportWeek * 7);
  const days = [];
  for (let i = 0; i < 7; i++) days.push(isoDate(addD(mon, i)));
  const ex = allEx();

  if (!ex.length) { el.innerHTML = ""; return; }

  const label = sportWeek === 0 ? "Diese Woche"
    : sportWeek === -1 ? "Vorige Woche"
    : fmtShort(days[0]) + " – " + fmtShort(days[6]);

  const rows = ex.map(e => {
    let sum = 0;
    const cells = days.map(iso => {
      const v = (data.sport.log[iso] || {})[e.name];
      if (v) sum += v;
      const d = new Date(iso + "T00:00:00");
      const isTrainDay = daysForEx(e.name).includes(d.getDay());
      const cls = ["", v ? "on" : "", (!v && !isTrainDay) ? "rest" : "", iso === todayIso ? "today" : ""]
        .filter(Boolean).join(" ");
      return `<i class="${cls}">${v ? v : "·"}</i>`;
    }).join("");
    return `<div class="spw-row">
      <span class="spw-name">${esc(e.name)}</span>
      <span class="spw-week">${cells}</span>
      <span class="spw-sum">${sum || "–"}</span>
    </div>`;
  }).join("");

  el.innerHTML = `
    <div class="rev-head">
      <button class="rev-nav" data-nav="-1">‹</button>
      <span class="rev-title">${esc(label)}</span>
      <button class="rev-nav" data-nav="1" ${sportWeek >= 0 ? "disabled" : ""}>›</button>
    </div>
    <div class="spw">
      <div class="spw-dow"><span class="spw-pad"></span>${days.map(iso => {
        const d = new Date(iso + "T00:00:00");
        return "<span>" + WD_SHORT[d.getDay()] + "</span>";
      }).join("")}<span style="width:42px"></span></div>
      ${rows}
    </div>`;
  el.querySelectorAll(".rev-nav").forEach(b => b.addEventListener("click", () => {
    if (b.disabled) return;
    sportWeek += parseInt(b.dataset.nav, 10);
    if (sportWeek > 0) sportWeek = 0;
    renderSportWeek(el);
  }));
}

/* Eigene Übung hinzufügen */
function openExerciseSheet(vorbelegt, einheit) {
  const { sheet, close } = openSheet(`
    <h3>Neue Übung</h3>
    <div class="sub">Erscheint ab sofort in deinem Training – mit Bestwert und Fortschritt.</div>
    <input type="text" id="sh-ex-name" placeholder="z.B. Pistol Squats" autocomplete="off" value="${esc(vorbelegt || "")}">
    <label>Einheit</label>
    <select id="sh-ex-unit">
      <option value="Wdh" ${einheit === "Sek" ? "" : "selected"}>Wiederholungen</option>
      <option value="Sek" ${einheit === "Sek" ? "selected" : ""}>Sekunden</option>
    </select>
    <div class="sheet-actions">
      <button class="quiet" data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="save">Hinzufügen</button>
    </div>`, { accent: "var(--sport)" });
  sheet.querySelector('[data-act="cancel"]').addEventListener("click", close);
  sheet.querySelector('[data-act="save"]').addEventListener("click", () => {
    const name = sheet.querySelector("#sh-ex-name").value.trim();
    if (!name) return;
    if (allEx().some(e => e.name.toLowerCase() === name.toLowerCase())) { alert("Diese Übung gibt es schon."); return; }
    // Entfernte Standard-Übung mit gleichem Namen? Dann wiederherstellen.
    const ri = data.sport.removedEx.findIndex(n => n.toLowerCase() === name.toLowerCase());
    if (ri >= 0) data.sport.removedEx.splice(ri, 1);
    else data.sport.customEx.push({ name, unit: sheet.querySelector("#sh-ex-unit").value });
    save(); close(); sportView = "training"; renderSport();
  });
  setTimeout(() => sheet.querySelector("#sh-ex-name").focus(), 350);
}
function statLine(ex) {
  const { last, best } = statFor(ex.name);
  if (last == null && best == null) return "";
  return `<div class="s">${last != null ? "<span>Zuletzt " + last + "</span>" : ""}${best != null ? "<span>Best " + best + "</span>" : ""}</div>`;
}

function trainStreak() {
  // Aufeinanderfolgende geplante Trainingstage mit Eintrag – Ruhetage brechen nichts
  const today = new Date(); today.setHours(0,0,0,0);
  let cur = 0, best = 0, run = 0, gapDone = false;
  for (let i = 0; i < 400; i++) {
    const d = addD(today, -i), iso = isoDate(d);
    const planned = exOnDay(d.getDay()).length > 0;
    if (!planned) continue;
    const did = data.sport.log[iso] && Object.keys(data.sport.log[iso]).length > 0;
    if (did) {
      run++;
      if (!gapDone) cur = run;
      if (run > best) best = run;
    } else {
      // Heute darf noch offen sein, ohne die Serie zu beenden
      if (i === 0) { gapDone = false; continue; }
      gapDone = true; run = 0;
    }
  }
  return { cur, best };
}

function weekSums(name, weeks) {
  const out = [];
  for (let w = weeks - 1; w >= 0; w--) out.push(weekTotal(name, w));
  return out;
}

function openProgressSheet() {
  const st = trainStreak();
  const WEEKS = 8;

  const cards = allEx().map(ex => {
    const sums = weekSums(ex.name, WEEKS);
    const max = Math.max(1, ...sums);
    const bars = sums.map((v, i) => {
      const h = Math.round(6 + (v / max) * 52);
      const last = i === sums.length - 1;
      return `<span class="pg-bar" title="${v}"><i style="height:${h}px;${last ? "background:var(--sport)" : ""}"></i></span>`;
    }).join("");
    const tw = sums[sums.length - 1], lw = sums[sums.length - 2] || 0;
    const delta = tw - lw;
    const dcls = delta > 0 ? "pp-up" : delta < 0 ? "pp-down" : "";
    const dtxt = delta === 0 ? "±0" : (delta > 0 ? "+" + delta : "" + delta);
    const { best, bestDate } = bestFor(ex.name);

    return `<div class="pg-card">
      <div class="pg-head">
        <span class="pg-name">${esc(ex.name)}</span>
        <span class="pg-best">${best != null ? best + " <small>" + ex.unit + "</small>" : "–"}</span>
      </div>
      <div class="pg-sub">${best != null ? "Bestwert" + (bestDate ? " · " + fmtNice(bestDate) : "") : "noch kein Wert"}</div>
      <div class="pg-chart">${bars}</div>
      <div class="pg-foot">
        <span>${WEEKS} Wochen</span>
        <span>Diese Woche <b>${tw}</b> <span class="${dcls}">${dtxt}</span></span>
      </div>
    </div>`;
  }).join("");

  const { sheet, close } = openSheet(`
    <h3>Fortschritt</h3>
    <div class="sub">Die letzten ${WEEKS} Wochen, Übung für Übung.</div>
    <div class="pg-streak">
      <div class="pg-flame">🔥</div>
      <div>
        <div class="pg-streak-n">${st.cur} ${st.cur === 1 ? "Trainingstag" : "Trainingstage"} in Folge</div>
        <div class="pg-streak-s">${st.best > st.cur ? "Beste Serie: " + st.best : st.cur > 0 && st.cur === st.best ? "Das ist deine beste Serie." : "Fang heute an."}</div>
      </div>
    </div>
    ${cards || '<div class="answer blank">Noch keine Übungen.</div>'}
    <div class="sheet-actions"><button class="primary" data-act="close">Fertig</button></div>`,
    { accent: "var(--sport)" });
  sheet.querySelector('[data-act="close"]').addEventListener("click", close);
}

/* Bestwert samt Datum */
function bestFor(name) {
  let best = null, bestDate = "";
  for (const iso in data.sport.log) {
    const v = data.sport.log[iso][name];
    if (!v) continue;
    if (best == null || v > best) { best = v; bestDate = iso; }
  }
  return { best, bestDate };
}

function openPlanSheet() {
  const WD = [["Mo",1],["Di",2],["Mi",3],["Do",4],["Fr",5],["Sa",6],["So",0]];
  const { sheet, close } = openSheet(`
    <h3>Trainingsplan</h3>
    <div class="sub">Stell je Übung ein, an welchen Tagen sie dran ist – oder fasse mehrere zu einer Trainingsart zusammen.</div>
    <label>Trainingsarten</label>
    <div id="pl-splits"></div>
    ${btnHTML("secondary", "pl-add-split", "plus", "Trainingsart anlegen")}
    <label>Übungen</label>
    <div id="pl-ex"></div>
    <div class="hint" style="margin-top:10px">Übungen ohne eigene Tage folgen den allgemeinen Trainingstagen.</div>
    <label>Allgemeine Trainingstage</label>
    <div class="wd-row" id="pl-base"></div>
    <div class="sheet-actions"><button class="primary" data-act="done">Fertig</button></div>`,
    { accent: "var(--sport)" });

  const dayRow = (days, onToggle) => {
    const row = document.createElement("div");
    row.className = "wd-row";
    WD.forEach(([l, d]) => {
      const b = document.createElement("button");
      b.className = "wd" + (days.includes(d) ? " on" : "");
      b.textContent = l;
      b.addEventListener("click", () => { onToggle(d); });
      row.appendChild(b);
    });
    return row;
  };

  const paint = () => {
    // Trainingsarten
    const sp = sheet.querySelector("#pl-splits");
    sp.innerHTML = "";
    if (!data.sport.splits.length) {
      sp.innerHTML = '<div class="hint" style="margin:0 2px 10px">Noch keine – Übungen laufen einzeln.</div>';
    }
    data.sport.splits.forEach(spl => {
      const card = document.createElement("div");
      card.className = "plan-card";
      card.innerHTML = `
        <div class="plan-top">
          <input type="text" class="plan-name" value="${esc(spl.name)}" placeholder="Name">
          <span class="plan-cnt">${spl.ex.length} ${spl.ex.length === 1 ? "Übung" : "Übungen"}</span>
          <button class="small-btn danger" data-del>✕</button>
        </div>`;
      card.querySelector(".plan-name").addEventListener("input", e => { spl.name = e.target.value; save(); });
      card.querySelector("[data-del]").addEventListener("click", () => {
        data.sport.splits = data.sport.splits.filter(x => x !== spl);
        save(); paint(); renderSport();
      });
      card.appendChild(dayRow(spl.days, d => {
        const k = spl.days.indexOf(d);
        if (k > -1) spl.days.splice(k, 1); else spl.days.push(d);
        save(); paint(); renderSport();
      }));
      sp.appendChild(card);
    });

    // Übungen
    const ex = sheet.querySelector("#pl-ex");
    ex.innerHTML = "";
    if (!allEx().length) {
      ex.innerHTML = '<div class="hint" style="margin:0 2px">Noch keine Übungen.</div>';
    }
    allEx().forEach(e => {
      const mine = splitOf(e.name);
      const card = document.createElement("div");
      card.className = "plan-card";
      const opts = ['<option value="">Einzeln</option>']
        .concat(data.sport.splits.map(x =>
          `<option value="${x.id}" ${mine && mine.id === x.id ? "selected" : ""}>${esc(x.name || "Ohne Namen")}</option>`))
        .join("");
      card.innerHTML = `
        <div class="plan-top">
          <span class="plan-name-static">${esc(e.name)}</span>
          <select class="plan-sel">${opts}</select>
        </div>`;
      card.querySelector(".plan-sel").addEventListener("change", ev => {
        data.sport.splits.forEach(x => { x.ex = x.ex.filter(n => n !== e.name); });
        const target = data.sport.splits.find(x => x.id === ev.target.value);
        if (target) target.ex.push(e.name);
        save(); paint(); renderSport();
      });
      if (!mine) {
        card.appendChild(dayRow(daysForEx(e.name), d => {
          const cur = Array.isArray(data.sport.exDays[e.name])
            ? data.sport.exDays[e.name].slice() : data.sport.trainingDays.slice();
          const k = cur.indexOf(d);
          if (k > -1) cur.splice(k, 1); else cur.push(d);
          data.sport.exDays[e.name] = cur;
          save(); paint(); renderSport();
        }));
      }
      ex.appendChild(card);
    });

    // Allgemeine Tage
    const base = sheet.querySelector("#pl-base");
    base.innerHTML = "";
    WD.forEach(([l, d]) => {
      const b = document.createElement("button");
      b.className = "wd" + (data.sport.trainingDays.includes(d) ? " on" : "");
      b.textContent = l;
      b.addEventListener("click", () => {
        const k = data.sport.trainingDays.indexOf(d);
        if (k > -1) data.sport.trainingDays.splice(k, 1); else data.sport.trainingDays.push(d);
        save(); paint(); renderSport();
      });
      base.appendChild(b);
    });
  };
  paint();

  sheet.querySelector("#pl-add-split").addEventListener("click", () => {
    data.sport.splits.push({ id: uid(), name: "Neue Art", days: [], ex: [] });
    save(); paint();
  });
  sheet.querySelector('[data-act="done"]').addEventListener("click", () => { renderSport(); close(); });
}


function openDaySheet(iso) {
  const day = data.sport.log[iso] || {};
  const runs = data.sport.runs.filter(r => r.date === iso);
  const exRows = allEx().filter(ex => day[ex.name]).map(ex =>
    `<div class="kv"><span class="k">${esc(ex.name)}</span><span class="v" style="color:var(--sport)">${day[ex.name]} ${ex.unit}</span></div>`).join("");
  const runRows = runs.map(r =>
    `<div class="kv"><span class="k">🏃 Lauf</span><span class="v" style="color:var(--run)">${r.km.toFixed(2).replace(".", ",")} km · ${fmtDur(r.durSec)} · ${fmtPace(r.durSec, r.km)}</span></div>`).join("");
  const { sheet, close } = openSheet(`
    <h3>${fmtNice(iso)}</h3>
    <div class="sub">${fmtDate(iso)}</div>
    ${(exRows + runRows) || '<div class="answer blank">Nichts eingetragen.</div>'}
    <div class="sheet-actions"><button class="quiet" data-act="close">Schließen</button></div>`, { accent: "var(--sport)" });
  sheet.querySelector('[data-act="close"]').addEventListener("click", close);
}

/* ---- Laufen ---- */
function fmtDur(sec) {
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h > 0) return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  return m + ":" + String(s).padStart(2, "0");
}
function fmtPace(sec, km) {
  if (!km || km <= 0 || !sec) return "–";
  const p = sec / km, m = Math.floor(p / 60), s = Math.round(p % 60);
  const mm = s === 60 ? m + 1 : m, ss = s === 60 ? 0 : s;
  return mm + ":" + String(ss).padStart(2, "0") + " /km";
}
function parseDurInput(str) {
  str = (str || "").trim();
  if (!str) return 0;
  if (str.includes(":")) {
    const parts = str.split(":").map(n => parseInt(n, 10) || 0);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
  }
  return Math.round((parseFloat(str.replace(",", ".")) || 0) * 60);
}

function renderRuns(box) {
  const runs = [...data.sport.runs].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  const now = new Date();
  const month = runs.filter(r => { const [yy, mm] = r.date.split("-").map(Number); return yy === now.getFullYear() && mm === now.getMonth() + 1; });
  const mKm = month.reduce((s, r) => s + r.km, 0);
  const mSec = month.reduce((s, r) => s + r.durSec, 0);

  box.insertAdjacentHTML("beforeend", `
    ${btnHTML("primary", "run-add", "plus", "Lauf eintragen", { accent: "var(--run)" })}
    ${btnHTML("secondary", "run-import", "camera", "Aus Screenshot lesen")}
    <div class="stat-grid">
      <div class="stat"><div class="v">${month.length}</div><div class="l">Läufe</div></div>
      <div class="stat"><div class="v">${mKm.toFixed(1).replace(".", ",")}</div><div class="l">km / Monat</div></div>
      <div class="stat"><div class="v" style="color:var(--run)">${fmtPace(mSec, mKm)}</div><div class="l">Ø Pace</div></div>
    </div>`);

  if (!runs.length) {
    box.insertAdjacentHTML("beforeend", '<div class="empty-state">Noch keine Läufe.<br>Trag einen ein – oder importiere einen Screenshot aus deiner Lauf-App.</div>');
  } else {
    box.insertAdjacentHTML("beforeend", '<div class="hint">Antippen = bearbeiten · nach links wischen = löschen</div>');
    runs.forEach((r, i) => {
      const row = document.createElement("div");
      row.className = "row";
      row.style.cursor = "pointer";
      row.style.animationDelay = (i * .03) + "s";
      row.innerHTML = `
        <div class="grow">
          <div class="s" style="margin:0 0 2px">${fmtNice(r.date)}</div>
          <div class="t" style="font-family:var(--serif);font-size:19px">${r.km.toFixed(2).replace(".", ",")} km</div>
          <div class="s">${fmtDur(r.durSec)} · <span style="color:var(--run);font-weight:700">${fmtPace(r.durSec, r.km)}</span></div>
        </div>`;
      row.addEventListener("click", () => openRunSheet(r));
      enableSwipe(row, {
        onRight: () => openRunSheet(r),
        onDelete: () => { data.sport.runs = data.sport.runs.filter(x => x.id !== r.id); save(); rerenderAll(); }
      });
      box.appendChild(row);
    });
  }
  $("run-add").addEventListener("click", () => openRunSheet(null));
  $("run-import").addEventListener("click", () => $("run-photo").click());
}

function openRunSheet(run) {
  const isEdit = !!run && run.id != null;
  const cur = run || { date: todayStr(), km: "", durSec: 0 };
  const { sheet, close } = openSheet(`
    <h3>${isEdit ? "Lauf bearbeiten" : "Lauf eintragen"}</h3>
    <label>Datum</label>
    <div class="pick set" style="justify-content:flex-start;padding-left:16px"><span>📅</span><span id="sh-run-datel">${fmtNice(cur.date)}</span><input type="date" id="sh-run-date" value="${cur.date}"></div>
    <label>Distanz (km)</label>
    <input type="text" id="sh-run-km" inputmode="decimal" placeholder="z.B. 5,2" value="${cur.km !== "" && cur.km != null ? String(cur.km).replace(".", ",") : ""}">
    <label>Dauer (mm:ss oder h:mm:ss)</label>
    <input type="text" id="sh-run-dur" inputmode="numeric" placeholder="z.B. 28:45" value="${cur.durSec ? fmtDur(cur.durSec) : ""}">
    <div class="pace-live" id="sh-run-pace"></div>
    <div class="sheet-actions">
      ${isEdit ? '<button class="danger" data-act="del">🗑</button>' : ""}
      <button class="quiet" data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="save">Speichern</button>
    </div>`, { accent: "var(--run)" });

  const dateI = sheet.querySelector("#sh-run-date"), kmI = sheet.querySelector("#sh-run-km"), durI = sheet.querySelector("#sh-run-dur");
  dateI.addEventListener("change", () => { sheet.querySelector("#sh-run-datel").textContent = dateI.value ? fmtNice(dateI.value) : "Datum"; });
  const upd = () => {
    const km = parseFloat((kmI.value || "").replace(",", ".")) || 0;
    const sec = parseDurInput(durI.value);
    sheet.querySelector("#sh-run-pace").textContent = (km && sec) ? "Pace: " + fmtPace(sec, km) : "";
  };
  kmI.addEventListener("input", upd); durI.addEventListener("input", upd); upd();

  sheet.querySelector('[data-act="cancel"]').addEventListener("click", close);
  const del = sheet.querySelector('[data-act="del"]');
  if (del) del.addEventListener("click", () => {
    data.sport.runs = data.sport.runs.filter(x => x.id !== run.id);
    save(); close(); rerenderAll();
  });
  sheet.querySelector('[data-act="save"]').addEventListener("click", () => {
    const km = parseFloat((kmI.value || "").replace(",", ".")) || 0;
    const sec = parseDurInput(durI.value);
    const date = dateI.value || todayStr();
    if (km <= 0) { alert("Bitte eine Distanz eintragen."); return; }
    if (isEdit) { run.date = date; run.km = km; run.durSec = sec; }
    else data.sport.runs.push({ id: Date.now(), date, km, durSec: sec });
    save(); close(); rerenderAll();
  });
}

$("run-photo").addEventListener("change", async e => {
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!file) return;
  await importRunFromImage(file);
});

async function importRunFromImage(file) {
  if (!getApiKey()) { alert("Bitte trage zuerst in den Einstellungen deinen API-Schlüssel ein."); return; }
  let loading = null;
  try {
    const dataUrl = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file);
    });
    const [, mediaType, base64] = /^data:(.+);base64,(.*)$/.exec(dataUrl) || [];
    if (!base64) { alert("Das Bild konnte nicht gelesen werden."); return; }
    loading = openSheet('<h3>📷 Lauf wird gelesen…</h3><div class="sub">Claude wertet den Screenshot aus.</div>', { accent: "var(--run)" });
    const r = await callClaude({
      system: 'Du liest Screenshots von Lauf-Apps (z.B. Adidas Running). Gib AUSSCHLIESSLICH ein JSON-Objekt zurück, kein Vorwort, keine Code-Fences. Format: {"km": <Zahl>, "durationSeconds": <Ganzzahl>, "date": "YYYY-MM-DD" | null}. km ist die Distanz in Kilometern (Dezimalpunkt). durationSeconds ist die gesamte Laufdauer in Sekunden. date nur wenn im Bild erkennbar, sonst null. Wenn ein Wert nicht erkennbar ist, setze ihn auf null.',
      userText: "Lies Distanz, Dauer und Datum aus diesem Lauf-Screenshot.",
      image: { mediaType, data: base64 },
      maxTokens: 200
    });
    loading.close(); loading = null;
    if (!r) return;
    let parsed;
    try { parsed = JSON.parse(r.text.replace(/```json|```/g, "").trim()); }
    catch { alert("Konnte die Werte nicht auslesen. Antwort: " + r.text); return; }
    const km = parseFloat(parsed.km) || "";
    const durSec = parseInt(parsed.durationSeconds, 10) || 0;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(parsed.date || "") ? parsed.date : todayStr();
    openRunSheet({ id: null, date, km, durSec });
  } catch (err) {
    if (loading) loading.close();
    alert("Import fehlgeschlagen: " + err.message);
  }
}

/* ---- Skills (KI-generierte Trainingspläne) ---- */
function renderSkills(box) {
  const skills = data.sport.skillList;
  if (!skills.length) {
    box.insertAdjacentHTML("beforeend", '<div class="empty-state">Noch keine Skills.<br>Füge über + einen hinzu – Claude erstellt dir den Etappenplan.</div>');
    return;
  }
  skills.forEach(sk => {
    const doneCount = sk.steps.filter((_, i) => sk.done[i]).length;
    const sect = document.createElement("div");
    sect.className = "sect skill-head" + (sk.collapsed ? "" : " open");
    sect.innerHTML = `<span class="tick" style="background:var(--skill)"></span>
      <h2>${esc((sk.emoji ? sk.emoji + " " : "") + sk.name)}</h2>
      <span class="chip-badge">${doneCount}/${sk.steps.length}</span>
      <button class="sect-act" data-del>✕</button>
      <span class="skill-chev">›</span>`;
    sect.addEventListener("click", () => {
      sk.collapsed = !sk.collapsed; save(); renderSport();
    });
    sect.querySelector("[data-del]").addEventListener("click", e => {
      e.stopPropagation();
      if (!confirm("Skill „" + sk.name + "“ samt Fortschritt löschen?")) return;
      data.sport.skillList = data.sport.skillList.filter(x => x !== sk);
      save(); renderSport();
    });
    box.appendChild(sect);

    if (sk.collapsed) return;

    sk.steps.forEach((step, i) => {
      const row = document.createElement("div");
      row.className = "row step-row" + (sk.done[i] ? " done" : "");
      row.style.animationDelay = (i * .04) + "s";
      const kurz = stepName(step);
      const drin = allEx().some(e => e.name === kurz);
      row.innerHTML = `<span class="ring-check">${sk.done[i] ? "✓" : ""}</span>
        <div class="grow"><div class="t" style="font-size:15px">${esc(step)}</div></div>
        <button class="step-add ${drin ? "on" : ""}" title="${drin ? "Ist im Training" : "Ins Training übernehmen"}">${drin ? "✓" : "+"}</button>`;
      row.addEventListener("click", () => { sk.done[i] = !sk.done[i]; save(); renderSport(); });
      row.querySelector(".step-add").addEventListener("click", ev => {
        ev.stopPropagation();
        if (drin) { sportView = "training"; renderSport(); return; }
        openExerciseSheet(kurz, /Sek|Sekunden|halten/i.test(step) ? "Sek" : "Wdh");
      });
      box.appendChild(row);
    });

    const btn = document.createElement("button");
    btn.className = "btn btn-secondary";
    btn.style.marginTop = "6px";
    btn.innerHTML = ico("bulb") + "<span>Claude-Tipp zur Etappe</span>";
    btn.addEventListener("click", () => skillTip(sk, btn));
    box.appendChild(btn);
  });
}

/* Aus „Pike Push-ups 3×8 – baut die Schulterkraft auf" wird „Pike Push-ups" */
function stepName(step) {
  let t = String(step).split(" – ")[0].split(", ")[0].split(":")[0];
  t = t.replace(/\s*\d+\s*[×x]\s*\d+.*$/i, "")      // 3×8
       .replace(/\s*\d+\s*[×x]\s*\d+\s*Sek.*$/i, "")
       .replace(/\s*\(.*?\)\s*$/, "")
       .trim();
  return t.length > 28 ? t.slice(0, 27).trimEnd() + "…" : t;
}

/* Neuen Skill per KI anlegen: Claude erstellt den Etappenplan */
function openSkillSheet() {
  const { sheet, close } = openSheet(`
    <h3>Neuer Skill</h3>
    <div class="sub">Sag mir, was du lernen willst – Claude baut dir den Etappenplan.</div>
    <input type="text" id="sh-skill-name" placeholder="z.B. Muscle-Up, Front Lever, Spagat" autocomplete="off">
    <div class="sheet-actions">
      <button class="quiet" data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="create">Plan erstellen</button>
    </div>`, { accent: "var(--skill)" });
  sheet.querySelector('[data-act="cancel"]').addEventListener("click", close);
  sheet.querySelector('[data-act="create"]').addEventListener("click", async ev => {
    const name = sheet.querySelector("#sh-skill-name").value.trim();
    if (!name) return;
    if (data.sport.skillList.some(x => x.name.toLowerCase() === name.toLowerCase())) { alert("Diesen Skill gibt es schon."); return; }
    ev.target.disabled = true; ev.target.textContent = "Claude erstellt den Plan…";
    try {
      const r = await callClaude({
        system: 'Du bist ein Trainer für Calisthenics und Körperbeherrschung. Gib AUSSCHLIESSLICH ein JSON-Objekt zurück, kein Vorwort, keine Code-Fences. Format: {"emoji": "<ein passendes Emoji>", "steps": ["Etappe 1", "Etappe 2", ...]}. 6 bis 8 aufeinander aufbauende Trainings-Etappen auf Deutsch, von den Grundlagen bis zum fertigen Skill. Jede Etappe kurz und konkret (max. 12 Wörter) mit Sätzen/Wiederholungen bzw. Haltezeiten.',
        userText: "Skill, den ich lernen will: " + name,
        maxTokens: 500
      });
      if (!r) { ev.target.disabled = false; ev.target.textContent = "Plan erstellen"; return; }
      let parsed;
      try { parsed = JSON.parse(r.text.replace(/```json|```/g, "").trim()); }
      catch { throw new Error("Der Plan kam in einem unerwarteten Format zurück. Versuch es noch einmal."); }
      if (!Array.isArray(parsed.steps) || !parsed.steps.length) throw new Error("Es kamen keine Etappen zurück. Versuch es noch einmal.");
      data.sport.skillList.push({
        id: uid(), name,
        emoji: typeof parsed.emoji === "string" ? parsed.emoji.slice(0, 4) : "🎯",
        steps: parsed.steps.map(String).slice(0, 10),
        done: []
      });
      save(); close(); renderSport();
    } catch (err) {
      alert("Das hat nicht geklappt: " + err.message);
      ev.target.disabled = false; ev.target.textContent = "Plan erstellen";
    }
  });
  setTimeout(() => sheet.querySelector("#sh-skill-name").focus(), 350);
}

async function skillTip(sk, btn) {
  let nextIdx = -1;
  for (let i = 0; i < sk.steps.length; i++) { if (!sk.done[i]) { nextIdx = i; break; } }
  const stufe = nextIdx === -1
    ? "Ich beherrsche den Skill schon – gib mir einen Tipp zum Verfeinern."
    : "Meine aktuelle Etappe: " + sk.steps[nextIdx];
  btn.disabled = true; btn.innerHTML = "<span>Claude denkt nach…</span>";
  try {
    const r = await callClaude({
      system: "Du bist ein Coach für den Skill „" + sk.name + "“ (Calisthenics/Körperbeherrschung). Gib einen kurzen, konkreten Tipp auf Deutsch (maximal 4 Sätze): eine passende Übung oder Technik, worauf man achten sollte, und ein häufiger Fehler. Kein Vorwort.",
      userText: stufe + " Gib mir einen konkreten Tipp, wie ich weiterkomme.",
      maxTokens: 300
    });
    if (r) {
      const { sheet, close } = openSheet(`<h3>💡 ${esc(sk.name)}-Tipp</h3><div class="answer">${esc(r.text)}</div>
        <div class="sheet-actions"><button class="quiet" data-act="close">Schließen</button></div>`, { accent: "var(--skill)" });
      sheet.querySelector('[data-act="close"]').addEventListener("click", close);
    }
  } catch (err) {
    alert("Das hat nicht geklappt: " + err.message);
  } finally {
    btn.disabled = false; btn.innerHTML = ico("bulb") + "<span>Claude-Tipp zur Etappe</span>";
  }
}

/* ================================================================
   ERINNERUNGEN — Mitteilungen, Badge und das schlechte Gewissen
   ================================================================ */

/* Was ist gerade offen? Sortiert nach Dringlichkeit. */
function pendingItems() {
  const today = todayStr();
  const now = new Date();
  const out = [];

  data.todos.forEach(t => {
    if (t.done) return;
    if (t.deadline && t.deadline > today) return;      // liegt noch in der Zukunft
    const days = t.deadline ? daysBetweenIso(t.deadline, today) : 0;
    // Heute fällig mit Uhrzeit: erst ab der Uhrzeit nerven
    if (days === 0 && t.deadlineTime) {
      const [h, m] = t.deadlineTime.split(":").map(Number);
      if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return;
    }
    out.push({ key: "todo:" + t.id, kind: "todo", title: t.title, days, ref: t });
  });

  data.dailies.forEach(h => {
    const st = habitState(h);
    if (!st.due) return;
    out.push({ key: "habit:" + h.id, kind: "habit", title: h.title, days: 0, streak: st.streak, ref: h });
  });

  // Training erst ab dem Nachmittag anmahnen
  const isTrainDay = data.sport.trainingDays.includes(now.getDay()) && allEx().length > 0;
  const trained = data.sport.log[today] && Object.keys(data.sport.log[today]).length > 0;
  if (isTrainDay && !trained && now.getHours() >= 15) {
    out.push({ key: "training:" + today, kind: "training", title: "Training", days: 0 });
  }

  // Vokabeln: ab 17 Uhr, wenn heute noch nicht geübt wurde
  if (data.vocabRemind && now.getHours() >= 17 && !vocabPracticedToday()) {
    const n = vocabDue().length;
    if (n) out.push({ key: "vocab:" + today, kind: "vocab", title: n + (n === 1 ? " Vokabel" : " Vokabeln"), days: 0, streak: vocabStreak() });
  }

  return out.sort((a, b) => b.days - a.days);
}

/* Der Ton wird mit der Stufe rauer. */
function nagLine(item, level) {
  const t = item.title, d = item.days;
  const overdue = d > 0 ? (d === 1 ? "seit gestern" : "seit " + d + " Tagen") : "";
  const M = {
    sanft: {
      todo: [`„${t}“ steht noch offen.`],
      habit: [`Heute dran: ${t}`],
      training: [`Heute ist Trainingstag.`],
      vocab: [`${t} warten auf dich.`]
    },
    normal: {
      todo: [`„${t}“ wartet noch auf dich.`, `Noch nicht erledigt: „${t}“.`],
      habit: [`${t} steht heute an.`, `Dranbleiben: ${t}`],
      training: [`Dein Training wartet noch.`, `Trainingstag – noch nichts eingetragen.`],
      vocab: [`${t} sind heute fällig.`, item.streak > 0 ? `Deine Vokabel-Serie: ${item.streak} Tage. Halt sie am Leben.` : `Ein paar Minuten Vokabeln?`]
    },
    penetrant: {
      todo: [`„${t}“. Immer noch.`, `Wir beide wissen, dass „${t}“ offen ist.`, `„${t}“ – jetzt wäre ein guter Moment.`],
      habit: [`${t}. Heute. Nicht morgen.`, `Deine Streak bei „${t}“ steht auf dem Spiel.`],
      training: [`Trainingstag, null Wiederholungen. Auffällig.`, `Dein Körper wartet. Immer noch.`],
      vocab: [`${t}. Fünf Minuten. Los.`, item.streak > 0 ? `${item.streak} Tage Vokabel-Serie – heute noch nichts.` : `Die Wörter vergessen sich nicht von allein. Doch, tun sie.`]
    },
    gnadenlos: {
      todo: [
        `„${t}“ ist offen. Ich frage in 10 Minuten wieder.`,
        `Du liest das hier. „${t}“ erledigt sich davon nicht.`,
        overdue ? `„${t}“ – ${overdue} überfällig. Das ist eine Entscheidung, die du triffst.` : `„${t}“. Heute. Jetzt.`
      ],
      habit: [`„${t}“. Jeden Tag dieselbe Diskussion.`, `${item.streak > 0 ? item.streak + " Tage Streak. Heute wirfst du sie weg?" : "„" + t + "“. Wieder nicht."}`],
      training: [`Kein Training eingetragen. Der Tag läuft ab.`, `Dips machen sich nicht von allein.`],
      vocab: [item.streak > 0 ? `${item.streak} Tage Serie. Heute wirfst du sie weg?` : `${t}. Immer noch.`, `Du hast Zeit, das hier zu lesen. Also auch für ${t}.`]
    }
  };
  const arr = (M[level] || M.normal)[item.kind] || [t];
  // Rotiert, damit nicht immer derselbe Satz kommt
  const n = Math.floor(Date.now() / 60000);
  return arr[n % arr.length];
}
const NAG_TITLE = {
  sanft: "Erinnerung", normal: "Noch offen",
  penetrant: "Hey.", gnadenlos: "Ernsthaft jetzt."
};

function notifySupported() { return "Notification" in window; }
function notifyGranted() { return notifySupported() && Notification.permission === "granted"; }
function isQuietHour() {
  if (!data.notify.night) return false;
  const h = new Date().getHours();
  return h >= 22 || h < 7;
}

async function fireNote(title, body, tag) {
  if (!notifyGranted()) return;
  const opts = {
    body, tag, renotify: true,
    icon: "icon-192.png", badge: "icon-192.png",
    requireInteraction: data.notify.level === "gnadenlos",
    data: { url: location.href }
  };
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg && reg.showNotification) { await reg.showNotification(title, opts); return; }
  } catch {}
  try { new Notification(title, opts); } catch {}
}

/* Badge auf dem App-Icon – das Einzige, was auch bei geschlossener App sichtbar bleibt. */
function updateBadge() {
  const n = pendingItems().length;
  try {
    if (n > 0 && navigator.setAppBadge) navigator.setAppBadge(n);
    else if (navigator.clearAppBadge) navigator.clearAppBadge();
  } catch {}
}

let nagTimer = null;
function runNagCheck() {
  updateBadge();
  if (!data.notify.on || !notifyGranted() || isQuietHour()) return;
  const lvl = NAG_LEVELS[data.notify.level] || NAG_LEVELS.normal;
  const items = pendingItems();
  if (!items.length) return;
  const now = Date.now();
  let fired = 0;
  for (const it of items) {
    if (fired >= lvl.max) break;
    const last = data.notify.lastFire[it.key] || 0;
    if (now - last < lvl.everyMin * 60000) continue;
    data.notify.lastFire[it.key] = now;
    fireNote(NAG_TITLE[data.notify.level], nagLine(it, data.notify.level), it.key);
    fired++;
  }
  // Sammelmeldung, wenn deutlich mehr offen ist als einzeln gemeldet wurde
  if (items.length > lvl.max && fired > 0) {
    fireNote("Tagwerk", "Insgesamt " + items.length + " Punkte offen.", "summary");
  }
  // Aufgeräumt halten: alte Einträge entfernen
  const live = new Set(items.map(i => i.key));
  Object.keys(data.notify.lastFire).forEach(k => { if (!live.has(k)) delete data.notify.lastFire[k]; });
  if (fired) save();
}
function startNagLoop() {
  clearInterval(nagTimer);
  nagTimer = setInterval(runNagCheck, 60000);
}

/* Der In-App-Vorhalter: beim Öffnen erst mal Rechenschaft. */
function maybeShowNagWall() {
  if (!data.notify.on) return;
  const lvl = NAG_LEVELS[data.notify.level] || NAG_LEVELS.normal;
  if (!lvl.wall || isQuietHour()) return;
  const items = pendingItems();
  if (!items.length) return;
  const last = data.notify.lastWall || 0;
  if (Date.now() - last < 60 * 60000) return;   // höchstens 1x pro Stunde
  data.notify.lastWall = Date.now(); save();
  openNagWall(items);
}

function openNagWall(items) {
  const worst = items[0];
  const head = worst.days > 0
    ? (worst.days === 1 ? "Seit gestern offen." : "Seit " + worst.days + " Tagen offen.")
    : (items.length === 1 ? "Ein Punkt steht heute noch aus." : items.length + " Punkte stehen heute noch aus.");
  const rows = items.map((it, i) => `
    <div class="row" data-i="${i}">
      <button class="ring-check"></button>
      <div class="grow"><div class="t">${esc(it.title)}</div>
        <div class="s"><span>${it.kind === "todo" ? "Aufgabe" : it.kind === "habit" ? "Gewohnheit" : it.kind === "vocab" ? "Vokabeln" : "Sport"}${it.days > 0 ? " · " + it.days + (it.days === 1 ? " Tag" : " Tage") + " überfällig" : ""}</span></div>
      </div>
    </div>`).join("");
  const { sheet, close } = openSheet(`
    <h3>Kurz mal ehrlich.</h3>
    <div class="sub">${esc(head)} Hak ab, was erledigt ist.</div>
    ${rows}
    <div class="sheet-actions">
      <button class="quiet" data-act="later">Später</button>
      <button class="primary" data-act="ok">Ich kümmere mich</button>
    </div>`, { accent: "var(--avoid)" });

  sheet.querySelectorAll(".row").forEach(row => {
    row.querySelector(".ring-check").addEventListener("click", () => {
      const it = items[parseInt(row.dataset.i, 10)];
      if (it.kind === "todo") { markTodo(it.ref, true); save(); }
      else if (it.kind === "habit") toggleDailyHabit(it.ref);
      else if (it.kind === "vocab") { close(); goVocab(); startQuiz(vocabDue()); return; }
      else { sportView = "training"; switchTab("sport"); close(); return; }
      row.classList.add("done");
      row.querySelector(".ring-check").textContent = "✓";
      row.querySelector(".ring-check").style.cssText = "background:var(--todo);border-color:var(--todo)";
      rerenderAll(); updateBadge();
    });
  });
  sheet.querySelector('[data-act="later"]').addEventListener("click", close);
  sheet.querySelector('[data-act="ok"]').addEventListener("click", close);
}

async function enableNotify() {
  if (!notifySupported()) {
    alert("Dieser Browser kennt keine Mitteilungen. Auf dem iPhone musst du Tagwerk zum Home-Bildschirm hinzufügen und von dort öffnen.");
    return false;
  }
  let perm = Notification.permission;
  if (perm === "default") {
    try { perm = await Notification.requestPermission(); } catch { perm = "denied"; }
  }
  if (perm !== "granted") {
    alert("Mitteilungen sind nicht erlaubt. Du kannst sie in den iPhone-Einstellungen unter „Tagwerk“ wieder freigeben.");
    return false;
  }
  data.notify.on = true; save();
  startNagLoop(); updateBadge();
  fireNote("Erinnerungen sind an.", "Ab jetzt hake ich nach. Du hast es so gewollt.", "welcome");
  return true;
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") { runNagCheck(); maybeShowNagWall(); }
  else updateBadge();
});

/* ================================================================
   SUCHE — über Aufgaben, Bücher, Spiele, Vokabeln und Notizen
   ================================================================ */
$("btn-search").addEventListener("click", openSearch);

function openSearch() {
  const { sheet, close } = openSheet(`
    <h3>Suchen</h3>
    <div class="sub">Aufgaben, Bücher, Spiele, Vokabeln und Tagesnotizen.</div>
    <input type="text" id="se-q" placeholder="Wonach suchst du?" autocomplete="off" autocapitalize="none">
    <div id="se-res" style="margin-top:16px"></div>`, { accent: "var(--text)" });

  const box = sheet.querySelector("#se-res");
  const hit = (t, needle) => String(t || "").toLowerCase().includes(needle);

  const run = () => {
    const q = sheet.querySelector("#se-q").value.trim().toLowerCase();
    box.innerHTML = "";
    if (q.length < 2) {
      box.innerHTML = '<div class="hint">Mindestens zwei Buchstaben.</div>';
      return;
    }
    const groups = [];

    const todos = data.todos.filter(t => hit(t.title, q));
    if (todos.length) groups.push(["Aufgaben", todos.map(t => ({
      title: t.title, sub: t.done ? "erledigt" : (t.deadline ? "bis " + fmtNice(t.deadline) : "offen"),
      go: () => { close(); switchTab("todo"); }
    }))]);

    const habits = data.dailies.filter(h => hit(h.title, q));
    if (habits.length) groups.push(["Gewohnheiten", habits.map(h => ({
      title: h.title, sub: freqLabel(h),
      go: () => { close(); habitView = "daily"; switchTab("habits"); }
    }))]);

    ["book", "game"].forEach(m => {
      const found = data.books.filter(b => (b.media || "book") === m && (hit(b.question, q) || hit(b.desc, q) || hit(b.answer, q)));
      if (found.length) groups.push([MEDIA[m].label, found.map(b => ({
        title: titleOnly(b.question), sub: catOf(b) + (b.tier ? " · " + b.tier : ""),
        go: () => { close(); mediaView = m; booksView = null; switchTab("media"); openMediaDetail(b); }
      }))]);
    });

    const words = data.vocab.filter(v => hit(v.word, q) || hit(v.trans, q) || hit(v.meaning, q));
    if (words.length) groups.push(["Vokabeln", words.map(v => ({
      title: v.word, sub: v.trans || (v.kind === "term" ? "Fachbegriff" : "Wort"),
      go: () => { close(); mediaView = "vocab"; switchTab("media"); openVocabDetail(v); }
    }))]);

    const notes = Object.keys(data.journal).filter(d => hit(data.journal[d], q)).sort().reverse();
    if (notes.length) groups.push(["Notizen", notes.map(d => ({
      title: fmtNice(d), sub: shorten(data.journal[d].replace(/\n/g, " "), 46),
      go: () => { close(); openReviewDay(d); }
    }))]);

    if (!groups.length) {
      box.innerHTML = '<div class="answer blank">Nichts gefunden.</div>';
      return;
    }
    groups.forEach(([name, items]) => {
      const h = document.createElement("div");
      h.className = "sect";
      h.innerHTML = '<span class="tick" style="background:var(--muted)"></span><h2>' + esc(name) + '</h2><span class="chip-badge">' + items.length + "</span>";
      box.appendChild(h);
      items.slice(0, 8).forEach(it => {
        const row = document.createElement("div");
        row.className = "row";
        row.style.cursor = "pointer";
        row.innerHTML = `<div class="grow"><div class="t">${esc(it.title)}</div><div class="s"><span>${esc(it.sub)}</span></div></div><span style="color:var(--faint)">›</span>`;
        row.addEventListener("click", it.go);
        box.appendChild(row);
      });
    });
  };

  sheet.querySelector("#se-q").addEventListener("input", run);
  run();
  setTimeout(() => sheet.querySelector("#se-q").focus(), 350);
}

/* ================================================================
   EINSTELLUNGEN
   ================================================================ */
$("btn-settings").addEventListener("click", () => {
  const { sheet, close } = openSheet(`
    <h3>Einstellungen</h3>
    <div class="sub">Tagwerk – dein Tag als Werk.</div>
    <label>API-Schlüssel</label>
    <input type="password" id="sh-key" placeholder="Anthropic API-Schlüssel (sk-ant-…)" value="${esc(getApiKey())}">
    <div class="hint" style="margin-top:8px">Wird nur lokal in diesem Browser gespeichert und direkt an Anthropic geschickt – sonst nirgendwohin.</div>

    <label>Erinnerungen</label>
    <div class="toggle-row"><span>Nachhaken erlauben</span>
      <span class="switch"><input type="checkbox" id="sh-notify" ${data.notify.on && notifyGranted() ? "checked" : ""}><span class="knob"></span></span>
    </div>
    <div class="hint" id="sh-notify-status"></div>
    <div class="lvl-list" id="sh-levels" style="margin-top:12px">
      ${Object.entries(NAG_LEVELS).map(([k, v]) => `
        <button class="lvl ${data.notify.level === k ? "on" : ""}" data-lvl="${k}">
          <span class="dot-sel"></span>
          <span><span class="n">${v.label}</span><span class="d">${esc(v.desc)}</span></span>
        </button>`).join("")}
    </div>
    <div class="toggle-row"><span>Nachtruhe (22–7 Uhr)</span>
      <span class="switch"><input type="checkbox" id="sh-night" ${data.notify.night ? "checked" : ""}><span class="knob"></span></span>
    </div>
    <button class="btn btn-secondary" id="sh-notify-test" style="margin-top:12px">${ico("bell")}<span>Testmitteilung senden</span></button>

    <label>Design</label>
    <div class="seg" id="sh-theme" style="--seg-accent: var(--text)">
      ${[["dark", "Dunkel"], ["light", "Hell"], ["auto", "Wie System"]].map(([k, l]) =>
        `<button data-theme-mode="${k}" class="${themeMode() === k ? "on" : ""}">${l}</button>`).join("")}
    </div>

    <label>Vokabeln</label>
    <div class="toggle-row"><span>Abends an fällige Vokabeln erinnern</span>
      <span class="switch"><input type="checkbox" id="sh-vremind" ${data.vocabRemind ? "checked" : ""}><span class="knob"></span></span>
    </div>
    <div class="hint">Ab 17 Uhr, wenn du heute noch nicht geübt hast. Kommt über „Erinnerungen“ oben.</div>
    <div class="toggle-row"><span>Beim Aufdecken vorlesen</span>
      <span class="switch"><input type="checkbox" id="sh-autospeak" ${data.vocabSpeak ? "checked" : ""}><span class="knob"></span></span>
    </div>
    <div class="lvl-list" id="sh-accent" style="margin-top:12px">
      ${[["en-GB", "Britisch", "Aussprache wie in England."], ["en-US", "Amerikanisch", "Aussprache wie in den USA."]].map(([k, n, d]) => `
        <button class="lvl ${data.vocabAccent === k ? "on" : ""}" data-accent="${k}">
          <span class="dot-sel"></span>
          <span><span class="n">${n}</span><span class="d">${d}</span></span>
        </button>`).join("")}
    </div>
    <div class="hint" style="margin-top:8px">${speechSupported() ? "Die Stimme kommt von deinem Gerät – klappt auch ohne API-Schlüssel und offline." : "Dieser Browser kann leider nicht vorlesen."}</div>
    <label>KI-Verbrauch</label>
    <div class="kv"><span class="k">Kosten insgesamt</span><span class="v">${fmtCost(data.usage.cost)}</span></div>
    <div class="kv"><span class="k">Tokens</span><span class="v">${data.usage.input} rein · ${data.usage.output} raus</span></div>
    <label>Backup</label>
    <div class="sheet-actions" style="margin-top:6px">
      <button class="quiet" data-act="export-file">Als Datei sichern</button>
      <button class="quiet" data-act="import-file">Datei laden</button>
    </div>
    <div class="sheet-actions" style="margin-top:6px">
      <button class="quiet" data-act="export">Kopieren</button>
      <button class="quiet" data-act="import">Einfügen</button>
    </div>
    <div class="hint" style="margin-top:8px">${storageHint()}</div>
    <div class="sheet-actions">
      <button class="primary" data-act="done">Fertig</button>
    </div>`, { accent: "var(--text)" });

  /* --- Erinnerungen --- */
  const statusEl = sheet.querySelector("#sh-notify-status");
  const notifyBox = sheet.querySelector("#sh-notify");
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const paintStatus = () => {
    let s;
    if (!notifySupported()) s = standalone
      ? "Dieser Browser unterstützt keine Mitteilungen."
      : "Nur als installierte App: Teilen → „Zum Home-Bildschirm“, dann von dort öffnen.";
    else if (Notification.permission === "denied") s = "In den Systemeinstellungen blockiert – dort unter „Tagwerk“ wieder erlauben.";
    else if (data.notify.on && notifyGranted()) s = "Aktiv. " + pendingItems().length + " Punkte offen.";
    else s = "Aus. Beim Einschalten fragt dein iPhone einmal nach Erlaubnis.";
    statusEl.textContent = s;
  };
  paintStatus();

  notifyBox.addEventListener("change", async e => {
    if (e.target.checked) {
      const ok = await enableNotify();
      e.target.checked = ok;
    } else {
      data.notify.on = false; save();
      clearInterval(nagTimer);
      try { navigator.clearAppBadge && navigator.clearAppBadge(); } catch {}
    }
    paintStatus();
  });
  sheet.querySelectorAll("#sh-levels .lvl").forEach(b => b.addEventListener("click", () => {
    data.notify.level = b.dataset.lvl; save();
    sheet.querySelectorAll("#sh-levels .lvl").forEach(x => x.classList.toggle("on", x === b));
  }));
  sheet.querySelector("#sh-night").addEventListener("change", e => {
    data.notify.night = e.target.checked; save();
  });
  sheet.querySelector("#sh-notify-test").addEventListener("click", async () => {
    if (!notifyGranted()) { const ok = await enableNotify(); notifyBox.checked = ok; paintStatus(); if (!ok) return; }
    const items = pendingItems();
    const it = items[0];
    fireNote(NAG_TITLE[data.notify.level],
      it ? nagLine(it, data.notify.level) : "Nichts offen. Diesmal.", "test");
  });

  sheet.querySelectorAll("#sh-theme [data-theme-mode]").forEach(b => b.addEventListener("click", () => {
    localStorage.setItem(THEME_KEY, b.dataset.themeMode);
    applyTheme();
    sheet.querySelectorAll("#sh-theme [data-theme-mode]").forEach(x => x.classList.toggle("on", x === b));
  }));
  sheet.querySelector("#sh-vremind").addEventListener("change", e => {
    data.vocabRemind = e.target.checked; save(); updateBadge();
  });
  sheet.querySelector("#sh-autospeak").addEventListener("change", e => {
    data.vocabSpeak = e.target.checked; save();
  });
  sheet.querySelectorAll("#sh-accent .lvl").forEach(b => b.addEventListener("click", () => {
    data.vocabAccent = b.dataset.accent; save();
    sheet.querySelectorAll("#sh-accent .lvl").forEach(x => x.classList.toggle("on", x === b));
    speak(data.vocab.length ? data.vocab[data.vocab.length - 1] : { word: "pronunciation", kind: "word" });
  }));
  // Schlüssel sofort merken – auch wenn das Fenster weggewischt statt mit „Fertig“ geschlossen wird
  sheet.querySelector("#sh-key").addEventListener("change", e => {
    const val = e.target.value.trim();
    if (val) localStorage.setItem(KEY_STORE, val);
    else localStorage.removeItem(KEY_STORE);
  });
  sheet.querySelector('[data-act="export"]').addEventListener("click", async () => {
    if (await copyBackup()) alert("Alle Daten wurden kopiert!");
  });
  sheet.querySelector('[data-act="import"]').addEventListener("click", () => {
    const text = prompt("Füge hier deine gesicherten Daten ein:");
    if (text && importBackup(text)) close();
  });
  sheet.querySelector('[data-act="export-file"]').addEventListener("click", () => {
    downloadBackup();
    alert("Die Sicherungsdatei wurde gespeichert.");
  });
  sheet.querySelector('[data-act="import-file"]').addEventListener("click", () => $("backup-file").click());
  sheet.querySelector('[data-act="done"]').addEventListener("click", () => {
    const val = sheet.querySelector("#sh-key").value.trim();
    if (val) localStorage.setItem(KEY_STORE, val);
    else localStorage.removeItem(KEY_STORE);
    close();
  });
});

/* ================================================================
   Start
   ================================================================ */
renderToday();
updateFab();
updateBadge();

/* Einstieg über das App-Symbol (lange drücken) oder einen Link: ?go=vokabeln | abfrage | wort */
(() => {
  const go = new URLSearchParams(location.search).get("go");
  if (!go) return;
  history.replaceState(null, "", location.pathname);   // beim Neuladen nicht nochmal springen
  if (go === "vokabeln") goVocab();
  else if (go === "wort") { goVocab(); openVocabSheet(); }
  else if (go === "abfrage") {
    goVocab();
    const due = vocabDue();
    if (due.length) startQuiz(due); else cheer("Heute ist keine Vokabel fällig");
  }
})();
if (data.notify.on && notifyGranted()) {
  startNagLoop();
  setTimeout(() => { runNagCheck(); maybeShowNagWall(); }, 1200);
}

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

/* ================================================================
   Tagwerk – gemeinsamer Kern der drei Apps
   (Aufgaben, Gewohnheiten, Vokabeln). Alles bleibt auf dem Gerät.
   ================================================================ */
"use strict";

const TW = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------- Datum (immer als "JJJJ-MM-TT" in Ortszeit) ---------- */
  const pad = n => String(n).padStart(2, "0");
  const iso = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const today = () => iso(new Date());
  const parse = s => new Date(s + "T00:00:00");
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const addMonths = (s, n) => {
    const d = parse(s), day = d.getDate();
    d.setDate(1); d.setMonth(d.getMonth() + n);
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
    return iso(d);
  };
  const between = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
  const monday = s => addDays(s, -((parse(s).getDay() + 6) % 7));
  const WD = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const WD_S = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const MON = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const MON_S = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];
  const longDate = s => { const d = parse(s); return WD[d.getDay()] + ", " + d.getDate() + ". " + MON[d.getMonth()]; };
  const shortDate = s => { const d = parse(s); return WD_S[d.getDay()] + ", " + d.getDate() + ". " + MON_S[d.getMonth()]; };
  const relDay = s => {
    const t = today();
    if (s === t) return "heute";
    if (s === addDays(t, 1)) return "morgen";
    if (s === addDays(t, -1)) return "gestern";
    return shortDate(s);
  };

  /* ---------- Speicher ---------- */
  function load(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { toast("Speichern hat nicht geklappt – ist der Speicher voll?"); return false; }
  }
  // Den Browser bitten, die Daten nicht von selbst zu löschen
  try {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persisted().then(p => p || navigator.storage.persist()).catch(() => {});
    }
  } catch {}

  /* ---------- Hell / Dunkel ---------- */
  const THEME = "tw.theme";
  const darkQuery = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  function themeMode() {
    let m = localStorage.getItem(THEME);
    if (!m) {   // Einstellung aus dem alten Tagwerk übernehmen
      const old = localStorage.getItem("meinTagTheme");
      m = old === "light" ? "light" : old === "dark" ? "dark" : "system";
    }
    return m === "light" || m === "dark" ? m : "system";
  }
  function applyTheme() {
    const m = themeMode();
    if (m === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", m);
    const dark = m === "dark" || (m === "system" && !!darkQuery && darkQuery.matches);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#000000" : "#ffffff");
  }
  function setTheme(m) { try { localStorage.setItem(THEME, m); } catch {} applyTheme(); }
  applyTheme();
  if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener("change", applyTheme);

  /* ---------- Symbole (eine Strichstärke für alles) ---------- */
  const ICONS = {
    check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
    more: '<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    camera: '<rect x="3" y="6" width="18" height="14" rx="3"/><circle cx="12" cy="13" r="3.5"/><path d="M8.5 6l1.5-2.5h4L15.5 6"/>',
    speaker: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    repeat: '<path d="M17 2.5l3 3-3 3"/><path d="M4 11.5v-1a5 5 0 015-5h11"/><path d="M7 21.5l-3-3 3-3"/><path d="M20 12.5v1a5 5 0 01-5 5H4"/>',
    cal: '<rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9.5 2.5h5"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3"/>',
    play: '<path d="M7 5l11 7-11 7z"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    right: '<path d="M9 6l6 6-6 6"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3"/>',
    wand: '<path d="M15 4V2M15 10V8M12.5 6h-2M19.5 6h-2M4 20l9-9M13.5 4.5l1 1"/>'
  };
  const ico = name => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";

  /* ---------- Blatt von unten ---------- */
  function sheet(html, { onClose } = {}) {
    hideToast();     // eine alte Kurzmeldung soll nicht über den Knöpfen liegen
    const back = document.createElement("div");
    back.className = "sheet-back";
    back.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div><div class="sheet-in">'
      + '<button class="tw-icon-btn x" data-x aria-label="Schließen">' + ico("x") + "</button>" + html + "</div></div>";
    document.body.appendChild(back);
    const el = back.querySelector(".sheet");
    requestAnimationFrame(() => requestAnimationFrame(() => back.classList.add("open")));
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      el.style.transform = ""; back.style.opacity = "";
      back.classList.remove("open");
      setTimeout(() => back.remove(), 280);
      if (onClose) onClose();
    };
    back.addEventListener("click", e => { if (e.target === back) close(); });
    el.querySelector("[data-x]").addEventListener("click", close);

    // Runterwischen schließt – greift, solange das Blatt ganz oben steht
    let sy = 0, dy = 0, drag = false, pid = null, lastY = 0, lastT = 0, vel = 0;
    el.addEventListener("pointerdown", e => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const onGrab = !!e.target.closest(".grab");
      if (!onGrab && (el.scrollTop > 0 || e.target.closest("input, textarea, select, .no-drag"))) return;
      sy = lastY = e.clientY; lastT = e.timeStamp; dy = 0; vel = 0; drag = true; pid = e.pointerId;
      el.style.transition = "none";
    });
    el.addEventListener("pointermove", e => {
      if (!drag || e.pointerId !== pid) return;
      dy = e.clientY - sy;
      const dt = e.timeStamp - lastT;
      if (dt > 0) vel = (e.clientY - lastY) / dt;
      lastY = e.clientY; lastT = e.timeStamp;
      if (dy > 4) { try { el.setPointerCapture(pid); } catch {} }
      el.style.transform = "translateY(" + (dy < 0 ? dy / 5 : dy) + "px)";
    });
    const endDrag = () => {
      if (!drag) return;
      drag = false;
      el.style.transition = "";
      if (vel > 0.5 || dy > 120) { close(); return; }
      el.style.transform = "";
    };
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    return { el, close };
  }

  /* Auswahl als Liste (z.B. das ⋯-Menü) */
  function menu(title, items) {
    const s = sheet("<h2>" + esc(title) + '</h2><div class="stack">'
      + items.map((it, i) => '<button class="btn full' + (it.danger ? " danger" : "") + '" data-i="' + i + '" style="justify-content:flex-start">'
        + (it.icon ? ico(it.icon) : "") + "<span>" + esc(it.label) + "</span></button>").join("") + "</div>");
    s.el.querySelectorAll("[data-i]").forEach(b => b.addEventListener("click", () => { s.close(); items[+b.dataset.i].act(); }));
    return s;
  }

  /* ---------- Kurzmeldung mit „Rückgängig“ ---------- */
  let toastEl = null, toastTimer = null;
  function hideToast() {
    if (!toastEl) return;
    clearTimeout(toastTimer);
    toastEl.remove();
    toastEl = null;
  }
  function toast(text, { action = null, label = "Rückgängig", ms = 3200 } = {}) {
    if (toastEl) { toastEl.remove(); clearTimeout(toastTimer); }
    const t = document.createElement("div");
    t.className = "toast";
    t.setAttribute("role", "status");
    t.innerHTML = "<span>" + esc(text) + "</span>" + (action ? "<button>" + esc(label) + "</button>" : "");
    document.body.appendChild(t);
    toastEl = t;
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add("show")));
    const hide = () => {
      t.classList.remove("show");
      setTimeout(() => t.remove(), 250);
      if (toastEl === t) toastEl = null;
    };
    if (action) t.querySelector("button").addEventListener("click", () => { clearTimeout(toastTimer); hide(); action(); });
    toastTimer = setTimeout(hide, action ? Math.max(ms, 5000) : ms);
  }

  /* ---------- Wischen: rechts = grün (erledigt), links = rot (löschen) ---------- */
  function swipeRow(wrap, row, { right, left, rightLabel = "Erledigt", leftLabel = "Löschen" }) {
    if (right) wrap.insertAdjacentHTML("afterbegin", '<div class="tw-swipe-under right">' + esc(rightLabel) + "</div>");
    if (left) wrap.insertAdjacentHTML("afterbegin", '<div class="tw-swipe-under left">' + esc(leftLabel) + "</div>");
    const ur = wrap.querySelector(".tw-swipe-under.right"), ul = wrap.querySelector(".tw-swipe-under.left");
    let sx = 0, sy = 0, dx = 0, active = false, decided = false, horiz = false, pid = null, moved = false;
    row.addEventListener("pointerdown", e => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (e.target.closest("input, textarea, .no-swipe")) return;
      sx = e.clientX; sy = e.clientY; dx = 0; active = true; decided = false; horiz = false; pid = e.pointerId; moved = false;
      row.style.transition = "none";
    });
    row.addEventListener("pointermove", e => {
      if (!active || e.pointerId !== pid) return;
      const mx = e.clientX - sx, my = e.clientY - sy;
      if (!decided && (Math.abs(mx) > 8 || Math.abs(my) > 8)) {
        decided = true;
        horiz = Math.abs(mx) > Math.abs(my) * 1.2;
        if (horiz) { try { row.setPointerCapture(pid); } catch {} }
      }
      if (!horiz) return;
      moved = true;
      dx = (mx > 0 && !right) || (mx < 0 && !left) ? mx / 6 : mx;
      row.style.transform = "translateX(" + dx + "px)";
      if (ur) ur.style.opacity = dx > 0 ? Math.min(1, dx / 60) : 0;
      if (ul) ul.style.opacity = dx < 0 ? Math.min(1, -dx / 60) : 0;
    });
    const end = () => {
      if (!active) return;
      active = false;
      row.style.transition = "transform .2s ease";
      const TH = 84;
      if (horiz && dx >= TH && right) { row.style.transform = "translateX(105%)"; setTimeout(right, 170); }
      else if (horiz && dx <= -TH && left) { row.style.transform = "translateX(-105%)"; setTimeout(left, 170); }
      else {
        row.style.transform = "";
        if (ur) ur.style.opacity = 0;
        if (ul) ul.style.opacity = 0;
      }
    };
    row.addEventListener("pointerup", end);
    row.addEventListener("pointercancel", end);
    // Nach dem Wischen kein versehentlicher Tipp auf die Zeile
    row.addEventListener("click", e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
  }

  /* ---------- Punkte der letzten 7 Tage ---------- */
  function dots(isOn, { days = 7, end = today(), isOff = null } = {}) {
    let h = '<span class="tw-dots" aria-hidden="true">';
    for (let i = days - 1; i >= 0; i--) {
      const d = addDays(end, -i);
      h += '<i class="' + (isOn(d) ? "on" : "") + (d === today() ? " today" : "") + (isOff && isOff(d) ? " off" : "") + '"></i>';
    }
    return h + "</span>";
  }

  /* ---------- Sicherung als Datei ---------- */
  function download(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }
  function pickFile(accept = "application/json,.json,.txt") {
    return new Promise(resolve => {
      const i = document.createElement("input");
      i.type = "file"; i.accept = accept;
      i.addEventListener("change", async () => {
        const f = i.files && i.files[0];
        resolve(f ? await f.text() : null);
      });
      i.click();
    });
  }
  function parseJSON(text) {
    try { return JSON.parse(String(text || "").trim()); } catch { return null; }
  }

  /* ---------- Erinnerung über den Kalender ----------
     Eine Web-App ohne eigenen Server kann bei geschlossener App nicht zuverlässig erinnern.
     Ein Kalendertermin mit Alarm schon – den Alarm gibt dann das Handy selbst. */
  const icsEsc = s => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  function icsFold(line) {
    if (line.length <= 73) return line;
    const out = [];
    for (let i = 0; i < line.length; i += 72) out.push((i ? " " : "") + line.slice(i, i + 72));
    return out.join("\r\n");
  }
  function calendar({ title, day = today(), time = "19:00", repeat = "", note = "", minutes = 15 }) {
    const [h, m] = time.split(":").map(Number);
    const start = parse(day); start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + minutes * 60000);
    const stamp = d => iso(d).replace(/-/g, "") + "T" + pad(d.getHours()) + pad(d.getMinutes()) + "00";
    const rrule = { daily: "RRULE:FREQ=DAILY", weekly: "RRULE:FREQ=WEEKLY", monthly: "RRULE:FREQ=MONTHLY" }[repeat] || "";
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Tagwerk//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VEVENT", "UID:" + uid() + "@tagwerk",
      "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, ""),
      "DTSTART:" + stamp(start), "DTEND:" + stamp(end), rrule,
      "SUMMARY:" + icsEsc(title), note ? "DESCRIPTION:" + icsEsc(note) : "",
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsEsc(title), "TRIGGER:PT0M", "END:VALARM",
      "END:VEVENT", "END:VCALENDAR"
    ].filter(Boolean).map(icsFold);
    const text = lines.join("\r\n") + "\r\n";
    const name = "erinnerung-" + title.toLowerCase().replace(/[^a-z0-9äöüß]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) + ".ics";
    let file = null;
    try { file = new File([text], name || "erinnerung.ics", { type: "text/calendar" }); } catch {}
    if (file && navigator.canShare && navigator.canShare({ files: [file] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) {
      navigator.share({ files: [file], title }).catch(() => {});
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([text], { type: "text/calendar" }));
      a.download = name || "erinnerung.ics";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    }
    return text;
  }
  /* Blatt: Uhrzeit wählen → Kalenderdatei */
  function calendarSheet({ title, intro, day, repeat, defaultTime = "19:00", note = "" }) {
    const s = sheet("<h2>Erinnerung im Kalender</h2>"
      + '<p class="tw-hint" style="margin-top:6px">' + esc(intro) + "</p>"
      + '<label class="f-label">Uhrzeit</label><input class="f-input" type="time" id="cal-time" value="' + esc(defaultTime) + '">'
      + '<p class="tw-hint" style="margin-top:12px">Es öffnet sich eine Kalender-Datei. Dort „Hinzufügen“ bzw. „Zum Kalender“ wählen. '
      + "Den Alarm gibt dann dein Handy – auch wenn die App zu ist.</p>"
      + '<div class="actions"><button class="btn primary" id="cal-go">' + ico("cal") + "<span>Kalender-Datei öffnen</span></button></div>");
    s.el.querySelector("#cal-go").addEventListener("click", () => {
      const time = s.el.querySelector("#cal-time").value || defaultTime;
      calendar({ title, day: day || today(), time, repeat, note });
      s.close();
    });
    return s;
  }

  /* ---------- Übernahme aus dem alten Tagwerk ----------
     1. Gleicher Speicher (altes Symbol): Daten liegen direkt unter "meinTagData".
     2. Neues Symbol auf dem iPhone hat eigenen Speicher → Übergabe über den Cache
        (wird auf manchen Geräten geteilt), sonst Einfügen/Datei. */
  const LEGACY = "meinTagData";
  const API_KEY = "meinTagApiKey";
  function legacy() {
    const d = load(LEGACY, null);
    return d && typeof d === "object" && (Array.isArray(d.todos) || Array.isArray(d.dailies) || Array.isArray(d.vocab)) ? d : null;
  }
  const T_CACHE = "tw-transfer";
  const T_URL = "./__tagwerk-transfer.json";
  async function getTransfer() {
    try {
      if (!("caches" in window)) return null;
      const c = await caches.open(T_CACHE);
      const r = await c.match(new Request(T_URL));
      return r ? await r.json() : null;
    } catch { return null; }
  }
  async function putTransfer(payload) {
    try {
      if (!("caches" in window)) return false;
      const c = await caches.open(T_CACHE);
      await c.put(new Request(T_URL), new Response(JSON.stringify(payload), { headers: { "content-type": "application/json" } }));
      return true;
    } catch { return false; }
  }
  /* Was diese App gerade hat, für später installierte Symbole bereitlegen */
  let refreshTimer = null;
  function shareForOtherIcons(key, data) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(async () => {
      const t = (await getTransfer()) || { kind: "tagwerk-transfer", v: 1, legacy: legacy(), apps: {} };
      t.apps = t.apps || {};
      t.apps[key] = data;
      t.at = Date.now();
      const k = localStorage.getItem(API_KEY);
      if (k) t.apiKey = k;
      putTransfer(t);
    }, 1200);
  }
  /* Startdaten einer App: eigene → altes Tagwerk im selben Speicher → Übergabe → keine */
  async function boot(key, fromLegacy) {
    const own = load(key, null);
    if (own && typeof own === "object") return { data: own, source: "own" };
    const L = legacy();
    if (L) {
      const data = fromLegacy(L);
      save(key, data);
      return { data, source: "legacy" };
    }
    const T = await getTransfer();
    if (T && (T.apps && T.apps[key] || T.legacy)) {
      const data = T.apps && T.apps[key] ? T.apps[key] : fromLegacy(T.legacy);
      if (data) {
        save(key, data);
        if (T.apiKey && !localStorage.getItem(API_KEY)) { try { localStorage.setItem(API_KEY, T.apiKey); } catch {} }
        return { data, source: "transfer" };
      }
    }
    return { data: null, source: "none" };
  }
  /* Eingefügter Text oder Datei → Daten für diese App (oder null) */
  function dataFromAny(obj, key, fromLegacy) {
    if (!obj || typeof obj !== "object") return null;
    if (obj.kind === "tagwerk-transfer") {
      if (obj.apiKey && !localStorage.getItem(API_KEY)) { try { localStorage.setItem(API_KEY, obj.apiKey); } catch {} }
      return obj.apps && obj.apps[key] ? obj.apps[key] : obj.legacy ? fromLegacy(obj.legacy) : null;
    }
    if (obj.app === key && obj.data) return obj.data;                       // eigene Sicherung
    if (Array.isArray(obj.todos) || Array.isArray(obj.dailies) || Array.isArray(obj.vocab)) return fromLegacy(obj);   // altes Tagwerk
    return null;
  }
  /* Blatt „Daten übernehmen“: Einfügen oder Datei */
  function importSheet({ key, fromLegacy, onData, hasData }) {
    const s = sheet("<h2>Daten übernehmen</h2>"
      + '<p class="tw-hint" style="margin-top:6px">Im alten Tagwerk-Symbol auf der Startseite „Daten kopieren“ tippen, dann hier einfügen. Eine Sicherungs-Datei geht auch.'
      + (hasData ? " Ersetzt, was diese App gerade hat." : "") + "</p>"
      + '<div class="stack">'
      + '<button class="btn full" id="im-paste">' + ico("download") + "<span>Aus der Zwischenablage einfügen</span></button>"
      + '<button class="btn full" id="im-file">' + ico("upload") + "<span>Datei wählen</span></button>"
      + "</div>"
      + '<label class="f-label">oder hier einfügen</label><textarea class="f-area" id="im-text" placeholder="{ … }"></textarea>'
      + '<div class="actions"><button class="btn primary" id="im-go">Übernehmen</button></div>');
    const take = text => {
      const data = dataFromAny(parseJSON(text), key, fromLegacy);
      if (!data) { toast("Darin habe ich keine passenden Daten gefunden."); return; }
      if (hasData && !confirm("Die jetzigen Daten dieser App werden ersetzt. Weiter?")) return;
      s.close();
      onData(data);
    };
    s.el.querySelector("#im-paste").addEventListener("click", async () => {
      try { take(await navigator.clipboard.readText()); }
      catch { toast("Einfügen ging nicht – füge den Text unten ins Feld ein."); }
    });
    s.el.querySelector("#im-file").addEventListener("click", async () => { const t = await pickFile(); if (t) take(t); });
    s.el.querySelector("#im-go").addEventListener("click", () => take(s.el.querySelector("#im-text").value));
    return s;
  }
  /* „Übernehmen“ auf der leeren App: liegen passende Daten schon in der Zwischenablage,
     reicht ein Tipp – sonst das Blatt mit Anleitung */
  async function quickImport(opts) {
    let data = null;
    try { data = dataFromAny(parseJSON(await navigator.clipboard.readText()), opts.key, opts.fromLegacy); } catch {}
    if (data && (!opts.hasData || confirm("Die jetzigen Daten dieser App werden ersetzt. Weiter?"))) { opts.onData(data); return; }
    importSheet(opts);
  }

  /* ---------- „Warum so?“ – die Studien hinter einer App ---------- */
  function why(title, points) {
    return sheet("<h2>" + esc(title) + '</h2><div style="margin-top:6px">'
      + points.map(p => '<div class="f-row" style="display:block"><div class="k" style="font-weight:600">' + esc(p.t) + "</div>"
        + '<div class="tw-hint" style="margin-top:3px">' + esc(p.d || "") + (p.src ? " · " : "")
        + (p.url ? '<a href="' + esc(p.url) + '" target="_blank" rel="noopener" style="color:inherit">' + esc(p.src) + "</a>" : esc(p.src || "")) + "</div></div>").join("")
      + "</div>");
  }

  /* ---------- Design-Wahl (für die Einstellungen) ---------- */
  function themeChipsHtml() {
    const m = themeMode();
    return '<div class="chips" id="theme-chips">'
      + [["system", "Wie System"], ["light", "Hell"], ["dark", "Dunkel"]]
        .map(([k, l]) => '<button class="chip' + (m === k ? " on" : "") + '" data-theme-mode="' + k + '">' + l + "</button>").join("")
      + "</div>";
  }
  function wireThemeChips(root) {
    root.querySelectorAll("[data-theme-mode]").forEach(b => b.addEventListener("click", () => {
      setTheme(b.dataset.themeMode);
      root.querySelectorAll("[data-theme-mode]").forEach(x => x.classList.toggle("on", x === b));
    }));
  }

  /* ---------- Offline-Betrieb ---------- */
  function registerSW() {
    if ("serviceWorker" in navigator && location.protocol === "https:") {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  return {
    $, esc, uid, pad, iso, today, parse, addDays, addMonths, between, monday, longDate, shortDate, relDay, WD, WD_S, MON, MON_S,
    load, save, themeMode, setTheme, applyTheme, ico, sheet, menu, toast, hideToast, swipeRow, dots,
    download, pickFile, parseJSON, calendar, calendarSheet,
    legacy, getTransfer, putTransfer, shareForOtherIcons, boot, dataFromAny, importSheet, quickImport, LEGACY, API_KEY,
    why, themeChipsHtml, wireThemeChips, registerSW
  };
})();

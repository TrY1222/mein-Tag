/* ================================================================
   Aufgaben – Heute · Morgen · Später.
   Eintragen in einem Schritt, Wischen zum Erledigen, Rückgängig statt Rückfrage.
   ================================================================ */
"use strict";

(async () => {
  const { $, esc, ico, today, addDays, addMonths, between, relDay, shortDate, longDate, toast, sheet, menu, swipeRow } = TW;
  const KEY = "tw.aufgaben";
  const TABS = { heute: "Heute", morgen: "Morgen", spaeter: "Später" };
  const REPEAT = { "": "Nie", d: "Täglich", w: "Wöchentlich", "2w": "Alle 2 Wochen", m: "Monatlich" };
  const REPEAT_SHORT = { d: "täglich", w: "wöchentlich", "2w": "alle 2 Wochen", m: "monatlich" };
  const PLACEHOLDER = { heute: "Nächster kleiner Schritt …", morgen: "Was steht morgen an?", spaeter: "Irgendwann …" };

  /* ---------- Daten ---------- */
  const idTime = id => { const n = parseInt(String(id).slice(0, 8), 36); return n > 15e11 && n < 25e11 ? n : 0; };

  /* Altes Tagwerk → Aufgaben: offene Aufgaben (und heute erledigte) */
  function fromLegacy(L) {
    const t = today();
    const tasks = [];
    (L.todos || []).forEach(o => {
      if (!o || !String(o.title || "").trim()) return;
      const doneToday = !!o.done && o.doneAt === t;
      if (o.done && !doneToday) return;                         // Erledigtes von früher bleibt im Archiv
      tasks.push({
        id: o.id || TW.uid(), title: String(o.title).trim(), day: o.deadline || t, star: false,
        repeat: { 1: "d", 7: "w", 14: "2w", 28: "m", 30: "m" }[o.repeat] || "",
        done: doneToday ? t : null, doneAt: doneToday ? Date.now() : 0, created: idTime(o.id) || Date.now(),
        history: Array.isArray(o.doneDates) ? o.doneDates.slice(-50) : []
      });
    });
    return { v: 1, tasks, log: {}, from: "tagwerk" };
  }

  function normalize(d) {
    if (!d || typeof d !== "object") d = {};
    d.tasks = (Array.isArray(d.tasks) ? d.tasks : [])
      .filter(x => x && typeof x.title === "string" && x.title.trim())
      .map(x => ({
        id: x.id || TW.uid(), title: x.title.trim(),
        day: typeof x.day === "string" && x.day ? x.day : null,
        star: !!x.star, repeat: x.repeat in REPEAT ? x.repeat : "",
        done: typeof x.done === "string" ? x.done : null, doneAt: x.doneAt || 0,
        created: x.created || Date.now(), history: Array.isArray(x.history) ? x.history : []
      }));
    if (!d.log || typeof d.log !== "object") d.log = {};
    d.v = 1;
    return d;
  }

  const booted = await TW.boot(KEY, fromLegacy);
  let D = normalize(booted.data);
  let tab = "heute";

  function save() {
    TW.save(KEY, D);
    TW.shareForOtherIcons(KEY, D);
  }

  /* Was gestern erledigt wurde, verschwindet; Statistik bleibt 8 Wochen */
  function cleanup(t) {
    const before = D.tasks.length;
    D.tasks = D.tasks.filter(x => !x.done || x.done >= t);
    const cut = addDays(t, -56);
    Object.keys(D.log).forEach(k => { if (k < cut) delete D.log[k]; });
    if (D.tasks.length !== before) save();
  }

  function inTab(x, which, t) {
    const tm = addDays(t, 1);
    if (which === "heute") return x.done ? x.done === t : !!x.day && x.day <= t;
    if (x.done) return false;
    if (which === "morgen") return x.day === tm;
    return !x.day || x.day > tm;
  }
  const openIn = (which, t) => D.tasks.filter(x => !x.done && inTab(x, which, t));

  /* ---------- „morgen“, „Fr“, „17.10.“ am Ende des Textes verstehen ---------- */
  const WEEKDAYS = { so: 0, sonntag: 0, mo: 1, montag: 1, di: 2, dienstag: 2, mi: 3, mittwoch: 3, do: 4, donnerstag: 4, fr: 5, freitag: 5, sa: 6, samstag: 6 };
  function parseWhen(text) {
    let title = text.trim(), day, star = false;
    if (/\s*!+$/.test(title) && title.replace(/\s*!+$/, "")) { star = true; title = title.replace(/\s*!+$/, "").trim(); }
    const t = today();
    const m = title.match(/\s+(?:am\s+)?(heute|morgen|übermorgen|nächste woche|naechste woche|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|mo|di|mi|do|fr|sa|so|(\d{1,2})\.(\d{1,2})\.(\d{2,4})?)\.?$/i);
    // „so“ allein ist meist das Wort „so“ – als Sonntag nur mit „am so“
    if (m && /^so$/i.test(m[1]) && !/\sam\s+so\.?$/i.test(title)) return { title, day, star };
    if (m && title.length > m[0].length) {
      const w = m[1].toLowerCase();
      if (w === "heute") day = t;
      else if (w === "morgen") day = addDays(t, 1);
      else if (w === "übermorgen") day = addDays(t, 2);
      else if (w.startsWith("n")) day = addDays(TW.monday(t), 7);
      else if (w in WEEKDAYS) {
        const diff = (WEEKDAYS[w] - TW.parse(t).getDay() + 7) % 7 || 7;
        day = addDays(t, diff);
      } else if (m[2]) {
        const dd = +m[2], mm = +m[3];
        let yy = m[4] ? +m[4] : new Date().getFullYear();
        if (yy < 100) yy += 2000;
        if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
          let cand = yy + "-" + TW.pad(mm) + "-" + TW.pad(dd);
          if (!m[4] && cand < t) cand = (yy + 1) + "-" + TW.pad(mm) + "-" + TW.pad(dd);
          if (!isNaN(TW.parse(cand))) day = cand;
        }
      }
      if (day) title = title.slice(0, title.length - m[0].length).trim();
    }
    return { title, day, star };
  }

  /* ---------- Aktionen ---------- */
  function logDone(t, n) {
    D.log[t] = Math.max(0, (D.log[t] || 0) + n);
    if (!D.log[t]) delete D.log[t];
  }
  function step(day, r) {
    return r === "d" ? addDays(day, 1) : r === "w" ? addDays(day, 7) : r === "2w" ? addDays(day, 14) : addMonths(day, 1);
  }
  function nextDay(x, t) {
    let n = step(x.day && x.day > t ? x.day : t, x.repeat);
    while (n <= t) n = step(n, x.repeat);
    return n;
  }
  const snapshot = x => JSON.parse(JSON.stringify(x));
  const restore = (x, snap) => { Object.keys(x).forEach(k => delete x[k]); Object.assign(x, snap); };

  function complete(x, row) {
    const t = today();
    const snap = snapshot(x);
    logDone(t, 1);
    let msg = "Erledigt";
    if (x.repeat) {
      x.history = (x.history || []).concat(t).slice(-50);
      x.day = nextDay(x, t);
      msg = "Erledigt · wieder " + relDay(x.day);
    } else {
      x.done = t;
      x.doneAt = Date.now();
    }
    save();
    if (tab === "heute" && !openIn("heute", t).length) msg = "Alles für heute erledigt";
    if (row) {
      row.classList.add("done");
      const c = row.querySelector(".tw-check");
      if (c) c.classList.add("on");
      setTimeout(render, 260);
    } else render();
    toast(msg, { action: () => { restore(x, snap); logDone(t, -1); save(); render(); } });
  }
  function reopen(x) {
    logDone(today(), -1);
    x.done = null; x.doneAt = 0;
    save(); render();
  }
  function remove(x) {
    const i = D.tasks.indexOf(x);
    if (i < 0) return;
    D.tasks.splice(i, 1);
    save(); render();
    toast("Gelöscht", { action: () => { D.tasks.splice(Math.min(i, D.tasks.length), 0, x); save(); render(); } });
  }

  /* ---------- Darstellung ---------- */
  function makeRow(x, t) {
    const li = document.createElement("li");
    li.className = "tw-swipe-wrap";
    li.dataset.id = x.id;
    const meta = [];
    if (x.star) meta.push('<span class="star">★ Wichtig</span>');
    if (x.repeat) meta.push("<span>↻ " + REPEAT_SHORT[x.repeat] + "</span>");
    if (!x.done && tab === "heute" && x.day && x.day < t) {
      const n = between(x.day, t);
      meta.push('<span class="age">' + (n === 1 ? "von gestern" : "seit " + n + " Tagen") + "</span>");
    }
    if (!x.done && tab === "spaeter" && x.day) meta.push("<span>" + shortDate(x.day) + "</span>");
    li.innerHTML = '<div class="tw-row' + (x.done ? " done" : "") + '">'
      + '<button class="tw-check no-swipe' + (x.done ? " on" : "") + '" aria-label="' + (x.done ? "Wieder öffnen" : "Erledigt") + '">' + ico("check") + "</button>"
      + '<div class="tw-main"><div class="tw-text">' + esc(x.title) + "</div>"
      + (meta.length ? '<div class="tw-meta">' + meta.join("") + "</div>" : "") + "</div></div>";
    const row = li.querySelector(".tw-row");
    li.querySelector(".tw-check").addEventListener("click", () => (x.done ? reopen(x) : complete(x, row)));
    li.querySelector(".tw-main").addEventListener("click", () => edit(x));
    swipeRow(li, row, { right: x.done ? null : () => complete(x), left: () => remove(x) });
    return li;
  }

  function card(html) {
    const d = document.createElement("div");
    d.className = "tw-card";
    d.innerHTML = html;
    $("notes").appendChild(d);
    return d;
  }

  function render() {
    const t = today();
    cleanup(t);
    const hour = new Date().getHours();
    $("title").textContent = TABS[tab];
    $("date").textContent = tab === "heute" ? longDate(t) : tab === "morgen" ? longDate(addDays(t, 1)) : "Irgendwann – ohne Druck";
    document.querySelectorAll("#tabs button").forEach(b => {
      b.classList.toggle("on", b.dataset.tab === tab);
      const n = openIn(b.dataset.tab, t).length;
      b.querySelector(".n").textContent = n ? String(n) : "";
    });
    $("add-input").placeholder = PLACEHOLDER[tab];

    /* Hinweise – höchstens einer auf einmal, damit nichts überlädt */
    $("notes").innerHTML = "";
    const open = openIn(tab, t);
    const old = tab === "heute" ? open.filter(x => x.day && between(x.day, t) >= 7) : [];
    if (booted.source === "none" && !D.tasks.length && !D.importAsked) {
      const c = card('<div class="q">Schon Aufgaben im alten Tagwerk?</div>'
        + '<div class="tw-hint">Dort auf der Startseite „Daten kopieren“ tippen, dann hier „Übernehmen“.</div>'
        + '<div class="row"><button class="btn small primary" data-a="imp">Übernehmen</button><button class="btn small" data-a="new">Neu anfangen</button></div>');
      c.querySelector('[data-a="imp"]').addEventListener("click", () => openImport(true));
      c.querySelector('[data-a="new"]').addEventListener("click", () => { D.importAsked = true; save(); render(); });
    } else if (old.length && D.reviewHidden !== t) {
      const c = card('<div class="q">' + (old.length === 1 ? "Eine Aufgabe liegt" : old.length + " Aufgaben liegen") + " seit über einer Woche.</div>"
        + '<div class="tw-hint">Noch wichtig? Neu planen oder loslassen – beides macht den Kopf frei.</div>'
        + '<div class="row"><button class="btn small primary" data-a="go">Durchgehen</button><button class="btn small" data-a="later">Heute nicht</button></div>');
      c.querySelector('[data-a="go"]').addEventListener("click", () => triage("Noch wichtig?", "Plane neu oder lass los.", old,
        [["Heute", x => { x.day = today(); }], ["Später", x => { x.day = null; }], ["Löschen", x => { const i = D.tasks.indexOf(x); if (i >= 0) D.tasks.splice(i, 1); }]]));
      c.querySelector('[data-a="later"]').addEventListener("click", () => { D.reviewHidden = t; save(); render(); });
    } else if (tab === "heute" && open.length > 7 && D.manyHidden !== t) {
      const c = card('<div class="q">Viel für einen Tag (' + open.length + ").</div>"
        + '<div class="tw-hint">Wir planen fast immer zu viel ein. Was kann auf morgen oder später?</div>'
        + '<div class="row"><button class="btn small primary" data-a="go">Verteilen</button><button class="btn small" data-a="ok">Passt so</button></div>');
      c.querySelector('[data-a="go"]').addEventListener("click", () => triage("Verteilen", "Was muss nicht heute sein?", open,
        [["Morgen", x => { x.day = addDays(today(), 1); }], ["Später", x => { x.day = null; }]]));
      c.querySelector('[data-a="ok"]').addEventListener("click", () => { D.manyHidden = t; save(); render(); });
    } else if (tab === "morgen" && hour >= 17) {
      $("notes").innerHTML = '<p class="tw-hint" style="margin:8px 0 2px">Schreib auf, was morgen ansteht – je konkreter, desto leichter schläfst du ein.</p>';
    }

    /* Liste */
    const list = $("list");
    list.innerHTML = "";
    const sorted = open.slice().sort((a, b) =>
      (b.star - a.star) || ((a.day || "9999") < (b.day || "9999") ? -1 : (a.day || "9999") > (b.day || "9999") ? 1 : 0) || (a.created - b.created));
    sorted.forEach(x => list.appendChild(makeRow(x, t)));

    const after = $("after");
    after.innerHTML = "";
    const doneToday = tab === "heute" ? D.tasks.filter(x => x.done === t).sort((a, b) => a.doneAt - b.doneAt) : [];
    if (!sorted.length) {
      const empty = document.createElement("div");
      empty.className = "tw-empty";
      empty.innerHTML = tab === "heute"
        ? (doneToday.length ? "<b>Alles erledigt.</b>Gönn dir den Rest des Tages." : "<b>Nichts für heute.</b>Schreib oben, was ansteht – am besten den nächsten kleinen Schritt.")
        : tab === "morgen" ? "<b>Noch nichts für morgen.</b>Was du heute nicht schaffst, rutscht von selbst mit."
        : "<b>Hier ist Platz für Irgendwann.</b>Alles, was nicht diese Woche sein muss.";
      list.appendChild(empty);
    }
    if (doneToday.length) {
      after.insertAdjacentHTML("beforeend", '<div class="tw-section done-head">Erledigt · ' + doneToday.length + "</div>");
      const ul = document.createElement("ul");
      ul.className = "tw-list";
      doneToday.forEach(x => ul.appendChild(makeRow(x, t)));
      after.appendChild(ul);
    }
    if (tab === "heute" && hour >= 18) {
      after.insertAdjacentHTML("beforeend", '<button class="tw-link plan-link" id="plan-tomorrow"><span>Morgen planen · 2 Minuten</span><span>›</span></button>');
      $("plan-tomorrow").addEventListener("click", () => { tab = "morgen"; render(); window.scrollTo({ top: 0 }); $("add-input").focus(); });
    }
    const mon = TW.monday(t);
    let week = 0;
    for (let d = mon; d <= t; d = addDays(d, 1)) week += D.log[d] || 0;
    if (week) after.insertAdjacentHTML("beforeend", '<p class="week">Diese Woche erledigt: ' + week + "</p>");
  }

  /* ---------- Durchgehen: mehrere Aufgaben schnell verteilen ---------- */
  function triage(title, intro, tasks, actions) {
    const s = sheet("<h2>" + esc(title) + '</h2><p class="tw-hint" style="margin-top:6px">' + esc(intro) + '</p><ul class="tw-list triage" id="tri"></ul>'
      + '<div class="actions"><button class="btn primary" id="tri-done">Fertig</button></div>', { onClose: render });
    const ul = s.el.querySelector("#tri");
    tasks.forEach(x => {
      const li = document.createElement("li");
      li.className = "tw-row";
      li.innerHTML = '<div class="tw-main"><div class="tw-text" style="font-size:17px">' + esc(x.title) + "</div></div>"
        + '<div class="chips">' + actions.map(([l], i) => '<button class="chip" data-i="' + i + '">' + esc(l) + "</button>").join("") + "</div>";
      li.querySelectorAll("[data-i]").forEach(b => b.addEventListener("click", () => {
        actions[+b.dataset.i][1](x);
        save();
        li.style.opacity = ".35";
        li.querySelectorAll("button").forEach(y => { y.disabled = true; });
        b.classList.add("on");
      }));
      ul.appendChild(li);
    });
    s.el.querySelector("#tri-done").addEventListener("click", s.close);
  }

  /* ---------- Bearbeiten ---------- */
  function edit(x) {
    const t = today();
    const whenKey = () => (!x.day ? "spaeter" : x.day <= t ? "heute" : x.day === addDays(t, 1) ? "morgen" : "datum");
    const s = sheet('<input class="f-input f-big" id="e-title" value="' + esc(x.title) + '" aria-label="Aufgabe" enterkeyhint="done">'
      + '<label class="f-label">Wann</label><div class="chips" id="e-when">'
      + '<button class="chip" data-w="heute">Heute</button><button class="chip" data-w="morgen">Morgen</button>'
      + '<button class="chip" data-w="spaeter">Später</button>'
      + '<label class="chip date" data-w="datum"><span id="e-date-l">Datum</span><input type="date" id="e-date"></label></div>'
      + '<div class="f-row" style="margin-top:14px"><span class="k">★ Wichtig</span><label class="switch"><input type="checkbox" id="e-star"' + (x.star ? " checked" : "") + "><span></span></label></div>"
      + '<label class="f-label">Wiederholen</label><div class="chips" id="e-rep">'
      + Object.entries(REPEAT).map(([k, l]) => '<button class="chip' + (x.repeat === k ? " on" : "") + '" data-r="' + k + '">' + l + "</button>").join("") + "</div>"
      + '<div class="stack">'
      + '<button class="btn full" id="e-focus">' + ico("timer") + "<span>Fokus · 25 Minuten</span></button>"
      + '<button class="btn full" id="e-cal">' + ico("cal") + "<span>Termin mit Alarm (Kalender)</span></button>"
      + '<button class="btn full danger" id="e-del">' + ico("trash") + "<span>Löschen</span></button></div>",
      { onClose: () => { const v = s.el.querySelector("#e-title").value.trim(); if (v && v !== x.title) { x.title = v; save(); } render(); } });
    const paintWhen = () => {
      const k = whenKey();
      s.el.querySelectorAll("#e-when [data-w]").forEach(b => b.classList.toggle("on", b.dataset.w === k));
      s.el.querySelector("#e-date-l").textContent = k === "datum" ? shortDate(x.day) : "Datum";
    };
    paintWhen();
    s.el.querySelectorAll("#e-when button[data-w]").forEach(b => b.addEventListener("click", () => {
      const w = b.dataset.w;
      x.day = w === "heute" ? today() : w === "morgen" ? addDays(today(), 1) : null;
      save(); paintWhen();
    }));
    const dateIn = s.el.querySelector("#e-date");
    if (x.day) dateIn.value = x.day;
    dateIn.addEventListener("change", () => { if (dateIn.value) { x.day = dateIn.value; save(); paintWhen(); } });
    s.el.querySelector("#e-star").addEventListener("change", e => { x.star = e.target.checked; save(); });
    s.el.querySelectorAll("#e-rep [data-r]").forEach(b => b.addEventListener("click", () => {
      x.repeat = b.dataset.r;
      if (x.repeat && !x.day) x.day = today();
      save();
      s.el.querySelectorAll("#e-rep [data-r]").forEach(y => y.classList.toggle("on", y === b));
      paintWhen();
    }));
    s.el.querySelector("#e-title").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); s.close(); } });
    s.el.querySelector("#e-focus").addEventListener("click", () => { s.close(); focusMode(x); });
    s.el.querySelector("#e-cal").addEventListener("click", () => {
      s.close();
      TW.calendarSheet({
        title: x.title, day: x.day && x.day >= today() ? x.day : today(), defaultTime: "09:00",
        repeat: { d: "daily", w: "weekly", m: "monthly" }[x.repeat] || "",
        intro: "Für Dinge mit fester Uhrzeit. Der Termin landet im Kalender " + (x.day && x.day > today() ? "am " + shortDate(x.day) : "heute") + "."
      });
    });
    s.el.querySelector("#e-del").addEventListener("click", () => { s.close(); remove(x); });
  }

  /* ---------- Fokus: eine Sache, 25 Minuten ---------- */
  function focusMode(x) {
    const MIN = 25, PAUSE = 5;
    let end = Date.now() + MIN * 60000, paused = 0, phase = "work", tick = null, lock = null;
    const el = document.createElement("div");
    el.className = "overlay";
    el.innerHTML = '<div class="ov-top"><span class="count" id="f-phase">Fokus</span>'
      + '<button class="tw-icon-btn" id="f-x" aria-label="Schließen">' + ico("x") + "</button></div>"
      + '<div class="ov-mid"><div class="focus-title">' + esc(x.title) + '</div><div class="focus-time" id="f-time">25:00</div>'
      + '<div class="focus-note" id="f-note">Nur diese eine Sache. Danach 5 Minuten Pause.</div></div>'
      + '<div class="ov-btns"><button class="btn" id="f-pause">Pause</button><button class="btn primary" id="f-done">' + ico("check") + "<span>Erledigt</span></button></div>";
    TW.hideToast();
    document.body.appendChild(el);
    try { if (navigator.wakeLock) navigator.wakeLock.request("screen").then(l => { lock = l; }).catch(() => {}); } catch {}
    const beep = () => {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        const ac = new AC(), o = ac.createOscillator(), g = ac.createGain();
        o.frequency.value = 880; g.gain.value = .08;
        o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + .35);
      } catch {}
      try { navigator.vibrate && navigator.vibrate(300); } catch {}
    };
    const fmt = ms => { const s = Math.max(0, Math.round(ms / 1000)); return TW.pad(Math.floor(s / 60)) + ":" + TW.pad(s % 60); };
    const paint = () => {
      const left = paused ? paused : end - Date.now();
      el.querySelector("#f-time").textContent = fmt(left);
      if (!paused && left <= 0) {
        beep();
        if (phase === "work") {
          phase = "pause"; end = Date.now() + PAUSE * 60000;
          el.querySelector("#f-phase").textContent = "Pause";
          el.querySelector("#f-note").textContent = "Geschafft. 5 Minuten Pause – steh kurz auf.";
        } else {
          phase = "work"; end = Date.now() + MIN * 60000;
          el.querySelector("#f-phase").textContent = "Fokus";
          el.querySelector("#f-note").textContent = "Weiter geht’s – noch eine Runde.";
        }
      }
    };
    tick = setInterval(paint, 250);
    paint();
    const close = () => { clearInterval(tick); try { lock && lock.release(); } catch {} el.remove(); };
    el.querySelector("#f-x").addEventListener("click", close);
    el.querySelector("#f-pause").addEventListener("click", e => {
      if (paused) { end = Date.now() + paused; paused = 0; e.currentTarget.textContent = "Pause"; }
      else { paused = end - Date.now(); e.currentTarget.textContent = "Weiter"; }
      paint();
    });
    el.querySelector("#f-done").addEventListener("click", () => { close(); if (!x.done && D.tasks.includes(x)) complete(x); });
  }

  /* ---------- Menü ---------- */
  function openImport(quick) {
    (quick === true ? TW.quickImport : TW.importSheet)({
      key: KEY, fromLegacy, hasData: D.tasks.length > 0,
      onData: data => { D = normalize(data); D.importAsked = true; save(); render(); toast("Aufgaben übernommen"); }
    });
  }
  const WHY = [
    { t: "Ein Plan macht den Kopf frei", d: "Offene Aufgaben drängen sich in die Gedanken. Ein konkreter Plan beruhigt sie – auch ohne sie schon zu erledigen. Darum: alles hier rein, mit Tag.", src: "Masicampo & Baumeister 2011", url: "https://users.wfu.edu/masicaej/MasicampoBaumeister2011JPSP.pdf" },
    { t: "Abends kurz für morgen planen", d: "Fünf Minuten konkrete To-do-Liste für morgen vor dem Schlafen – damit schliefen Menschen im Schlaflabor schneller ein.", src: "Scullin u.a. 2018", url: "https://www.sciencedaily.com/releases/2018/01/180111224021.htm" },
    { t: "Wichtig markieren", d: "Ohne Markierung gewinnt meist das Dringende gegen das Wichtige.", src: "Zhu, Yang & Hsee 2018" },
    { t: "Klein formulieren", d: "Unangenehme, große, ferne Aufgaben schieben wir auf. Der nächste kleine Schritt fällt leichter – und zerlegt planen wir realistischer.", src: "Steel 2007; Kruger & Evans 2004" },
    { t: "Liegengebliebenes ausmisten", d: "Was seit einer Woche liegt, fragt einmal nach: neu planen oder loslassen. Beides entlastet.", src: "Masicampo & Baumeister 2011" },
    { t: "Fokus 25 Minuten", d: "Feste kurze Pausen machten weniger müde als selbst gewählte – bei gleicher Leistung in kürzerer Zeit.", src: "Biwer u.a. 2023", url: "https://pubmed.ncbi.nlm.nih.gov/36859717/" },
    { t: "Wenig Funktionen", d: "Vor dem Benutzen wirken viele Funktionen gut, im Alltag zählt, wie einfach es geht.", src: "Thompson, Hamilton & Rust 2005" },
    { t: "Erinnern über den Kalender", d: "Eine Web-App ohne Server kann bei geschlossener App nicht zuverlässig erinnern – dein Kalender schon." }
  ];
  $("menu").innerHTML = ico("more");
  $("menu").addEventListener("click", () => menu("Aufgaben", [
    { label: "Warum ist die App so?", icon: "info", act: () => TW.why("Warum so?", WHY) },
    { label: "Abends ans Planen erinnern", icon: "cal", act: () => TW.calendarSheet({ title: "Morgen planen (2 Minuten)", repeat: "daily", defaultTime: "20:30", intro: "Ein täglicher Termin am Abend: kurz aufschreiben, was morgen ansteht." }) },
    { label: "Design", icon: "more", act: () => { const s = sheet("<h2>Design</h2>" + '<label class="f-label">Hell oder dunkel</label>' + TW.themeChipsHtml()); TW.wireThemeChips(s.el); } },
    { label: "Sicherung als Datei", icon: "download", act: () => { TW.download("aufgaben-" + today() + ".json", { app: KEY, v: 1, at: Date.now(), data: D }); toast("Sicherung gespeichert"); } },
    { label: "Daten übernehmen", icon: "upload", act: openImport },
    { label: "Alle Tagwerk-Apps", icon: "right", act: () => { location.href = "index.html"; } }
  ]));

  /* ---------- Eingabe, Tabs, Tageswechsel ---------- */
  $("add").addEventListener("submit", e => {
    e.preventDefault();
    const input = $("add-input");
    const p = parseWhen(input.value);
    if (!p.title) return;
    const t = today();
    const day = p.day !== undefined ? p.day : tab === "heute" ? t : tab === "morgen" ? addDays(t, 1) : null;
    const x = { id: TW.uid(), title: p.title, day, star: p.star, repeat: "", done: null, doneAt: 0, created: Date.now(), history: [] };
    D.tasks.push(x);
    D.importAsked = true;
    save();
    input.value = "";
    render();
    if (!inTab(x, tab, t)) toast("Eingeplant für " + relDay(day));
  });
  document.querySelectorAll("#tabs button").forEach(b => b.addEventListener("click", () => {
    tab = b.dataset.tab;
    render();
    window.scrollTo({ top: 0 });
  }));
  let shownDay = today();
  const refreshIfNewDay = () => { if (today() !== shownDay) { shownDay = today(); render(); } };
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { shownDay = today(); render(); } });
  setInterval(refreshIfNewDay, 60000);

  render();
  if (booted.source === "legacy" || booted.source === "transfer") {
    D.importAsked = true; save();
    toast(D.tasks.length ? "Deine Aufgaben aus Tagwerk sind da" : "Tagwerk übernommen");
  }
  TW.registerSW();
})();

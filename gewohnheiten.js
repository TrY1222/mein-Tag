/* ================================================================
   Gewohnheiten – jede ist ein kleiner Wenn-dann-Plan.
   Ein Tipp am Tag. Keine Serie, die reißen kann. Nach ~8 Wochen die Frage,
   ob es schon von allein läuft – dann braucht es die App dafür nicht mehr.
   ================================================================ */
"use strict";

(async () => {
  const { $, esc, ico, today, addDays, between, longDate, shortDate, toast, sheet, menu, swipeRow } = TW;
  const KEY = "tw.gewohnheiten";
  const ASK_AFTER = 56;      // Tage bis zur Frage „Läuft es automatisch?“ (Lally 2010: Median 66)
  const PER = [[7, "Täglich"], [5, "5× pro Woche"], [4, "4× pro Woche"], [3, "3× pro Woche"], [2, "2× pro Woche"], [1, "1× pro Woche"]];
  const TEMPLATES = [
    { l: "📖 Lesen", name: "1 Seite lesen", cue: "nach dem Abendessen", per: 7, kind: "tun" },
    { l: "💪 Training", name: "5 Liegestütze", cue: "nach dem Aufstehen", per: 4, kind: "tun" },
    { l: "🗣 Vokabeln", name: "eine Vokabel-Runde", cue: "nach dem Mittagessen", per: 7, kind: "tun" },
    { l: "🚶 Raus", name: "10 Minuten spazieren", cue: "nach dem Mittagessen", per: 5, kind: "tun" },
    { l: "💧 Wasser", name: "ein Glas Wasser", cue: "nach dem Aufstehen", per: 7, kind: "tun" },
    { l: "📵 Handy weg", name: "Handy nicht mit ins Bett", cue: "beim Schlafengehen", per: 7, kind: "lassen" }
  ];

  /* ---------- Altes Tagwerk → Gewohnheiten ---------- */
  function fromLegacy(L) {
    const t = today();
    const isoOf = ts => TW.iso(new Date(ts));
    const habits = [];
    const firstDay = days => Object.keys(days).sort()[0] || t;
    (L.dailies || []).forEach(h => {
      if (!h || !String(h.title || "").trim()) return;
      let per = 7;
      if (h.mode === "week") per = h.perWeek || 3;
      else { const iv = h.interval || 1; per = iv <= 1 ? 7 : Math.round(7 / iv); }
      const days = {};
      (h.history || []).forEach(d => { if (typeof d === "string" && d <= t) days[d] = 1; });
      habits.push({ id: h.id || TW.uid(), name: String(h.title).trim(), cue: "", kind: "tun", per, days, created: firstDay(days) });
    });
    (L.avoids || []).forEach(a => {
      if (!a || !String(a.title || "").trim()) return;
      const since = isoOf(a.since || Date.now());
      const from = since > addDays(t, -60) ? since : addDays(t, -60);
      const days = {};
      for (let d = from; d < t; d = addDays(d, 1)) days[d] = 1;   // bisher geschafft (laut altem Zähler)
      habits.push({ id: a.id || TW.uid(), name: String(a.title).trim(), cue: "", kind: "lassen", per: 7, days, created: from });
    });
    // Wer zuletzt trainiert hat, bekommt das Training als Gewohnheit
    const sport = L.sport || {};
    const log = sport.log || {};
    const train = {};
    Object.keys(log).forEach(d => { if (d >= addDays(t, -60) && d <= t && Object.keys(log[d] || {}).length) train[d] = 1; });
    if (Object.keys(train).length && !habits.some(h => /training|sport/i.test(h.name))) {
      habits.push({ id: TW.uid(), name: "Training", cue: "", kind: "tun", per: (sport.trainingDays || []).length || 3, days: train, created: firstDay(train) });
    }
    const runs = {};
    (sport.runs || []).forEach(r => { if (r && r.date >= addDays(t, -60) && r.date <= t) runs[r.date] = 1; });
    if (Object.keys(runs).length && !habits.some(h => /lauf/i.test(h.name))) {
      habits.push({ id: TW.uid(), name: "Laufen", cue: "", kind: "tun", per: 2, days: runs, created: firstDay(runs) });
    }
    // Übernommene Gewohnheiten fragen frühestens in zwei Wochen nach der Automatik
    habits.forEach(h => { h.ask = addDays(t, 14); });
    return { v: 1, habits, from: "tagwerk" };
  }

  function normalize(d) {
    if (!d || typeof d !== "object") d = {};
    const t = today();
    d.habits = (Array.isArray(d.habits) ? d.habits : []).filter(h => h && String(h.name || "").trim()).map(h => ({
      id: h.id || TW.uid(),
      name: String(h.name).trim(),
      cue: String(h.cue || "").trim(),
      kind: h.kind === "lassen" ? "lassen" : "tun",
      per: Math.max(1, Math.min(7, Math.round(+h.per || 7))),
      days: h.days && typeof h.days === "object" ? h.days : {},
      created: typeof h.created === "string" ? h.created : t,
      ask: typeof h.ask === "string" ? h.ask : addDays(typeof h.created === "string" ? h.created : t, ASK_AFTER),
      adjust: typeof h.adjust === "string" ? h.adjust : null,
      done: typeof h.done === "string" ? h.done : null
    }));
    d.v = 1;
    return d;
  }

  const booted = await TW.boot(KEY, fromLegacy);
  let D = normalize(booted.data);
  function save() { TW.save(KEY, D); TW.shareForOtherIcons(KEY, D); }

  const active = () => D.habits.filter(h => !h.done);
  const countIn = (h, from, to) => Object.keys(h.days).filter(d => d >= from && d <= to).length;
  const weekCount = (h, t) => countIn(h, TW.monday(t), t);
  const total = h => Object.keys(h.days).length;
  const lastDone = h => Object.keys(h.days).sort().pop() || null;

  /* ---------- Abhaken ---------- */
  function toggle(h, row) {
    const t = today();
    if (h.days[t]) { delete h.days[t]; save(); render(); return; }
    const prev = lastDone(h);
    h.days[t] = 1;
    save();
    if (row) {
      row.querySelector(".tw-check").classList.add("on");
      setTimeout(render, 220);
    } else render();
    // Rückenwind statt Strenge – nur bei besonderen Momenten
    const n = total(h);
    const gap = prev ? between(prev, t) : 0;
    const comeback = prev && (h.per === 7 ? gap >= 2 : gap >= 8);
    const all = active().length > 1 && active().every(x => x.days[t]);
    let msg = "";
    if (n === 1) msg = "Der erste Haken. Gut gemacht.";
    else if (comeback) msg = "Stark, dass du wieder dran bist.";
    else if ([7, 21, 30, 50, 66, 100, 200, 365].includes(n)) msg = "Zum " + n + ". Mal – das wird langsam ein Teil von dir.";
    else if (all) msg = "Alles für heute geschafft.";
    if (msg) toast(msg);
  }

  /* ---------- Darstellung ---------- */
  function progressText(h, t) {
    if (h.per === 7) {
      const n = countIn(h, addDays(t, -6), t);
      return n + " von 7 Tagen";
    }
    return weekCount(h, t) + " von " + h.per + " diese Woche";
  }
  function nudge(h, t) {
    if (h.days[t]) return "";
    const y = addDays(t, -1);
    if (h.per === 7 && h.created < y && !h.days[y]) {
      return h.kind === "lassen" ? "Gestern nicht geklappt? Passiert. Heute zählt." : "Gestern ausgelassen – einmal ist kein Problem. Heute wieder?";
    }
    if (h.per < 7) {
      const left = h.per - weekCount(h, t);
      const daysLeft = 7 - ((TW.parse(t).getDay() + 6) % 7);
      if (left > 0 && left >= daysLeft) return "Diese Woche noch " + left + "× – heute passt gut.";
    }
    return "";
  }
  function makeRow(h, t) {
    const li = document.createElement("li");
    li.className = "tw-swipe-wrap";
    const doneToday = !!h.days[t];
    const nd = nudge(h, t);
    li.innerHTML = '<div class="tw-row">'
      + '<button class="tw-check big no-swipe' + (doneToday ? " on" : "") + '" aria-label="' + (h.kind === "lassen" ? "Heute geschafft" : "Heute gemacht") + '">' + ico("check") + "</button>"
      + '<div class="tw-main"><div class="tw-text">' + esc(h.name) + "</div>"
      + ((h.cue || h.kind === "lassen") ? '<div class="tw-meta">' + (h.kind === "lassen" ? '<span class="tag">Lassen</span>' : "") + (h.cue ? "<span>" + esc(h.cue) + "</span>" : "") + "</div>" : "")
      + '<div class="h-line">' + TW.dots(d => !!h.days[d], { isOff: d => d < h.created }) + "<span>" + progressText(h, t) + "</span></div>"
      + (nd ? '<div class="h-nudge">' + esc(nd) + "</div>" : "")
      + "</div></div>";
    const row = li.querySelector(".tw-row");
    li.querySelector(".tw-check").addEventListener("click", () => toggle(h, row));
    li.querySelector(".tw-main").addEventListener("click", () => edit(h));
    swipeRow(li, row, { right: doneToday ? null : () => toggle(h), rightLabel: h.kind === "lassen" ? "Geschafft" : "Gemacht" });
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
    const act = active();
    const doneN = act.filter(h => h.days[t]).length;
    $("sub").textContent = longDate(t) + (act.length ? " · " + doneN + " von " + act.length + " heute" : "");

    /* Hinweise – höchstens einer */
    $("notes").innerHTML = "";
    const askH = act.find(h => h.ask && h.ask <= t && between(h.created, t) >= ASK_AFTER);
    const hard = act.find(h => {
      if (between(h.created, t) < 21 || (h.adjust && h.adjust > t)) return false;
      const expected = h.per / 7 * 21;
      return countIn(h, addDays(t, -20), t) / expected < 0.35;
    });
    if (booted.source === "none" && !D.habits.length && !D.importAsked) {
      const c = card('<div class="q">Schon Gewohnheiten im alten Tagwerk?</div>'
        + '<div class="tw-hint">Dort auf der Startseite „Daten kopieren“ tippen, dann hier „Übernehmen“ – mit den letzten Wochen.</div>'
        + '<div class="row"><button class="btn small primary" data-a="imp">Übernehmen</button><button class="btn small" data-a="new">Neu anfangen</button></div>');
      c.querySelector('[data-a="imp"]').addEventListener("click", () => openImport(true));
      c.querySelector('[data-a="new"]').addEventListener("click", () => { D.importAsked = true; save(); render(); });
    } else if (askH) {
      const weeks = Math.round(between(askH.created, t) / 7);
      const c = card('<div class="q">„' + esc(askH.name) + "“ machst du seit " + weeks + " Wochen. Passiert es inzwischen von allein – ohne dass du dran denken musst?</div>"
        + '<div class="tw-hint">Dann braucht es die App dafür nicht mehr.</div>'
        + '<div class="row"><button class="btn small primary" data-a="yes">Ja, automatisch</button><button class="btn small" data-a="no">Noch nicht</button></div>');
      c.querySelector('[data-a="yes"]').addEventListener("click", () => graduate(askH));
      c.querySelector('[data-a="no"]').addEventListener("click", () => { askH.ask = addDays(t, 14); save(); render(); toast("Ich frag in zwei Wochen noch mal."); });
    } else if (hard) {
      const c = card('<div class="q">„' + esc(hard.name) + "“ klappt bisher selten.</div>"
        + '<div class="tw-hint">Kein Problem – oft ist sie nur zu groß oder der Auslöser passt nicht. Kleiner machen oder an eine andere Stelle im Tag hängen?</div>'
        + '<div class="row"><button class="btn small primary" data-a="fit">Anpassen</button><button class="btn small" data-a="keep">Weiter so</button></div>');
      c.querySelector('[data-a="fit"]').addEventListener("click", () => { hard.adjust = addDays(t, 21); save(); edit(hard, true); });
      c.querySelector('[data-a="keep"]').addEventListener("click", () => { hard.adjust = addDays(t, 21); save(); render(); });
    } else if (TW.parse(t).getDay() === 1 && act.length) {
      $("notes").innerHTML = '<p class="tw-hint" style="margin:8px 0 2px">Neue Woche – frischer Start.</p>';
    }

    /* Liste */
    const list = $("list");
    list.innerHTML = "";
    act.forEach(h => list.appendChild(makeRow(h, t)));
    if (!act.length) {
      const e = document.createElement("div");
      e.className = "tw-empty";
      e.innerHTML = "<b>Noch keine Gewohnheit.</b>Fang mit einer kleinen an – am besten hinter etwas, das du sowieso jeden Tag machst.";
      list.appendChild(e);
    }

    const after = $("after");
    after.innerHTML = '<button class="btn full new-btn" id="new">' + ico("plus") + "<span>Neue Gewohnheit</span></button>";
    $("new").addEventListener("click", () => create());
    const grads = D.habits.filter(h => h.done);
    if (grads.length) {
      after.insertAdjacentHTML("beforeend", '<button class="tw-link" id="grads" style="margin-top:10px"><span>Geschafft · ' + grads.length + "</span><span>›</span></button>");
      $("grads").addEventListener("click", showGraduated);
    }
  }

  /* ---------- „Läuft von allein“ ---------- */
  function graduate(h) {
    h.done = today();
    save(); render();
    toast("„" + h.name + "“ läuft jetzt von allein. Glückwunsch!", { action: () => { h.done = null; h.ask = addDays(today(), 14); save(); render(); } });
  }
  function showGraduated() {
    const grads = D.habits.filter(h => h.done);
    const s = sheet("<h2>Geschafft</h2>" + '<p class="tw-hint" style="margin-top:6px">Diese Gewohnheiten laufen von allein. Rutscht eine wieder weg, nimm sie einfach zurück.</p>'
      + '<ul class="tw-list">' + grads.map((h, i) => '<li class="tw-row"><div class="tw-main"><div class="tw-text" style="font-size:17px">' + esc(h.name) + '</div><div class="tw-meta"><span>seit ' + shortDate(h.done) + " · " + total(h) + "× gemacht</span></div></div>"
        + '<button class="chip" data-i="' + i + '">Zurück</button></li>').join("") + "</ul>", { onClose: render });
    s.el.querySelectorAll("[data-i]").forEach(b => b.addEventListener("click", () => {
      const h = grads[+b.dataset.i];
      h.done = null; h.ask = addDays(today(), 28);
      save();
      b.disabled = true; b.textContent = "Wieder aktiv";
    }));
  }

  /* ---------- Formular (neu und bearbeiten) ---------- */
  function formHtml(h, isNew) {
    return (isNew ? '<label class="f-label" style="margin-top:6px">Vorlage</label><div class="tpl">'
      + TEMPLATES.map((x, i) => '<button class="chip" data-tpl="' + i + '">' + esc(x.l) + "</button>").join("") + "</div>" : "")
      + '<label class="f-label">Was – so klein wie möglich</label><input class="f-input" id="f-name" placeholder="z.B. 1 Seite lesen" value="' + esc(h.name) + '">'
      + '<label class="f-label">Wann genau – nach welcher Sache?</label><input class="f-input" id="f-cue" placeholder="z.B. nach dem Abendessen" value="' + esc(h.cue) + '">'
      + '<p class="tw-hint" style="margin-top:8px">Häng sie an etwas, das du sowieso jeden Tag machst – immer an derselben Stelle im Tag.</p>'
      + '<label class="f-label">Wie oft</label><div class="chips" id="f-per">'
      + PER.map(([n, l]) => '<button class="chip' + (h.per === n ? " on" : "") + '" data-per="' + n + '">' + l + "</button>").join("") + "</div>"
      + '<label class="f-label">Art</label><div class="chips" id="f-kind">'
      + '<button class="chip' + (h.kind === "tun" ? " on" : "") + '" data-kind="tun">Etwas tun</button>'
      + '<button class="chip' + (h.kind === "lassen" ? " on" : "") + '" data-kind="lassen">Etwas lassen</button></div>';
  }
  function wireForm(root, h) {
    root.querySelectorAll("[data-per]").forEach(b => b.addEventListener("click", () => {
      h.per = +b.dataset.per;
      root.querySelectorAll("[data-per]").forEach(x => x.classList.toggle("on", x === b));
    }));
    root.querySelectorAll("[data-kind]").forEach(b => b.addEventListener("click", () => {
      h.kind = b.dataset.kind;
      root.querySelectorAll("[data-kind]").forEach(x => x.classList.toggle("on", x === b));
    }));
    root.querySelectorAll("[data-tpl]").forEach(b => b.addEventListener("click", () => {
      const x = TEMPLATES[+b.dataset.tpl];
      Object.assign(h, { name: x.name, cue: x.cue, per: x.per, kind: x.kind });
      root.querySelector("#f-name").value = x.name;
      root.querySelector("#f-cue").value = x.cue;
      root.querySelectorAll("[data-per]").forEach(y => y.classList.toggle("on", +y.dataset.per === x.per));
      root.querySelectorAll("[data-kind]").forEach(y => y.classList.toggle("on", y.dataset.kind === x.kind));
      root.querySelectorAll("[data-tpl]").forEach(y => y.classList.toggle("on", y === b));
    }));
  }
  function create() {
    const h = { id: TW.uid(), name: "", cue: "", kind: "tun", per: 7, days: {}, created: today(), ask: addDays(today(), ASK_AFTER), adjust: null, done: null };
    const n = active().length;
    const s = sheet("<h2>Neue Gewohnheit</h2>" + formHtml(h, true)
      + (n >= 3 ? '<p class="tw-hint" style="margin-top:14px">Du hast schon ' + n + " Gewohnheiten. Mit wenigen gleichzeitig klappt es meist leichter.</p>" : "")
      + '<div class="actions"><button class="btn primary" id="f-save">Anlegen</button></div>');
    wireForm(s.el, h);
    s.el.querySelector("#f-save").addEventListener("click", () => {
      h.name = s.el.querySelector("#f-name").value.trim();
      h.cue = s.el.querySelector("#f-cue").value.trim();
      if (!h.name) { s.el.querySelector("#f-name").focus(); return; }
      D.habits.push(h);
      D.importAsked = true;
      save(); s.close(); render();
      toast(h.cue ? "Angelegt: " + h.cue + " → " + h.name : "Angelegt. Tipp: Gib ihr noch einen Auslöser („nach dem …“).");
    });
  }
  function edit(h, adjusting = false) {
    const t = today();
    const copy = { ...h };
    const start = TW.monday(addDays(t, -28));       // 5 Wochen, montags beginnend
    let grid = '<div class="grid">' + TW.WD_S.slice(1).concat("So").map(w => '<span class="wd">' + w + "</span>").join("");
    for (let i = 0; i < 35; i++) {
      const d = addDays(start, i);
      grid += '<button data-d="' + d + '" class="' + (h.days[d] ? "on " : "") + (d === t ? "today " : "") + (d > t ? "future " : "") + '">' + TW.parse(d).getDate() + "</button>";
    }
    grid += "</div>";
    const s = sheet("<h2>" + esc(h.name) + "</h2>"
      + (adjusting ? '<p class="tw-hint" style="margin-top:6px">Mach sie kleiner (z.B. „2 Minuten“ statt „20“) oder häng sie an eine Sache, die du wirklich jeden Tag machst.</p>' : "")
      + formHtml(copy, false)
      + '<label class="f-label">Letzte 5 Wochen <span style="text-transform:none;letter-spacing:0;font-weight:500">· antippen zum Nachtragen</span></label>' + grid
      + '<p class="tw-hint" style="margin-top:8px">Insgesamt ' + total(h) + "× · " + progressText(h, t) + "</p>"
      + '<div class="stack">'
      + '<button class="btn full" id="e-cal">' + ico("cal") + "<span>Erinnerung im Kalender (Starthilfe)</span></button>"
      + '<button class="btn full" id="e-grad">' + ico("check") + "<span>Läuft schon von allein</span></button>"
      + '<button class="btn full danger" id="e-del">' + ico("trash") + "<span>Löschen</span></button></div>",
      { onClose: () => {
        const name = s.el.querySelector("#f-name").value.trim();
        if (name) h.name = name;
        h.cue = s.el.querySelector("#f-cue").value.trim();
        h.per = copy.per; h.kind = copy.kind;
        save(); render();
      } });
    wireForm(s.el, copy);
    s.el.querySelectorAll("[data-d]").forEach(b => b.addEventListener("click", () => {
      const d = b.dataset.d;
      if (d > t) return;
      if (h.days[d]) delete h.days[d]; else h.days[d] = 1;
      if (d < h.created) h.created = d;
      b.classList.toggle("on", !!h.days[d]);
      save();
    }));
    s.el.querySelector("#e-cal").addEventListener("click", () => {
      const title = (h.cue ? h.cue.charAt(0).toUpperCase() + h.cue.slice(1) + ": " : "") + h.name;
      s.close();
      TW.calendarSheet({
        title, repeat: "daily", defaultTime: "19:00",
        intro: "Ein täglicher Termin hilft am Anfang. Die eigentliche Gewohnheit baut aber der Auslöser im Alltag – die Erinnerung kannst du später wieder löschen."
      });
    });
    s.el.querySelector("#e-grad").addEventListener("click", () => { s.close(); graduate(h); });
    s.el.querySelector("#e-del").addEventListener("click", () => {
      const i = D.habits.indexOf(h);
      s.close();
      if (i < 0) return;
      D.habits.splice(i, 1);
      save(); render();
      toast("Gelöscht", { action: () => { D.habits.splice(Math.min(i, D.habits.length), 0, h); save(); render(); } });
    });
  }

  /* ---------- Menü ---------- */
  function openImport(quick) {
    (quick === true ? TW.quickImport : TW.importSheet)({
      key: KEY, fromLegacy, hasData: D.habits.length > 0,
      onData: data => { D = normalize(data); D.importAsked = true; save(); render(); toast("Gewohnheiten übernommen"); }
    });
  }
  const WHY = [
    { t: "Wenn-dann statt Vorsatz", d: "„Nach dem Abendessen lese ich 1 Seite“ wirkt deutlich besser als „mehr lesen“ – über 94 Studien hinweg.", src: "Gollwitzer & Sheeran 2006", url: "https://kops.uni-konstanz.de/handle/123456789/10973" },
    { t: "Hinter eine bestehende Routine hängen", d: "Zahnseide nach dem Zähneputzen wurde eher zur Gewohnheit als davor. Am besten immer an derselben Stelle im Tag.", src: "Judah, Gardner & Aunger 2013; Judah u.a. 2018", url: "https://link.springer.com/article/10.1186/s40359-018-0270-z" },
    { t: "Klein anfangen", d: "Einfache Handlungen werden schneller automatisch als aufwendige. Klein ist leicht – und leicht passiert.", src: "Lally u.a. 2010; Fogg 2009" },
    { t: "Einmal auslassen ist ok", d: "Ein verpasster Tag hat die Gewohnheitsbildung nicht messbar gebremst.", src: "Lally u.a. 2010", url: "https://onlinelibrary.wiley.com/doi/abs/10.1002/ejsp.674" },
    { t: "Keine Serie, die reißt", d: "Eine gerissene Serie senkt die Lust weiterzumachen. Darum zeigt die App Punkte der letzten 7 Tage statt eines Zählers.", src: "Silverman & Barasch 2023" },
    { t: "Zurückkommen zählt am meisten", d: "In einer Studie mit 61.293 Menschen und 54 Ideen wirkte am besten: Belohnung fürs Weitermachen nach einer Lücke.", src: "Milkman u.a. 2021 (Nature)" },
    { t: "Nach ~2 Monaten: läuft es von allein?", d: "Im Mittel dauert es 59–66 Tage, je nach Mensch 4 bis 335. Wenn es automatisch läuft, wandert es zu „Geschafft“ – Ziel ist, die App dafür nicht mehr zu brauchen.", src: "Lally u.a. 2010; Singh u.a. 2024; Gardner u.a. 2012", url: "https://www.mdpi.com/2227-9032/12/23/2488" },
    { t: "Erinnerungen nur als Starthilfe", d: "Erinnerungen sorgen fürs Wiederholen, machen aber abhängig. Fällt die App weg, ist die Gewohnheit oft weg.", src: "Stawarz u.a. 2015; Renfree u.a. 2016; Nobbe u.a. 2024" },
    { t: "Freundlich statt streng", d: "Druck („du musst“) erzeugt Trotz. Nachsicht nach einem Ausrutscher macht es danach wahrscheinlicher.", src: "Miller u.a. 2007; Breines & Chen 2012; Wohl u.a. 2010" },
    { t: "Sport: 4× pro Woche", d: "Neue Fitnessstudio-Mitglieder bildeten eine Gewohnheit, wenn sie ca. 6 Wochen lang mind. 4× pro Woche gingen.", src: "Kaushal & Rhodes 2015" },
    { t: "Montag = frischer Start", d: "Nach Wochen- und Monatsanfängen fangen Menschen eher Neues an.", src: "Dai, Milkman & Riis 2014" }
  ];
  $("menu").innerHTML = ico("more");
  $("menu").addEventListener("click", () => menu("Gewohnheiten", [
    { label: "Warum ist die App so?", icon: "info", act: () => TW.why("Warum so?", WHY) },
    { label: "Neue Gewohnheit", icon: "plus", act: () => create() },
    { label: "Design", icon: "more", act: () => { const s = sheet("<h2>Design</h2>" + '<label class="f-label">Hell oder dunkel</label>' + TW.themeChipsHtml()); TW.wireThemeChips(s.el); } },
    { label: "Sicherung als Datei", icon: "download", act: () => { TW.download("gewohnheiten-" + today() + ".json", { app: KEY, v: 1, at: Date.now(), data: D }); toast("Sicherung gespeichert"); } },
    { label: "Daten übernehmen", icon: "upload", act: openImport },
    { label: "Alle Tagwerk-Apps", icon: "right", act: () => { location.href = "index.html"; } }
  ]));

  let shownDay = today();
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { shownDay = today(); render(); } });
  setInterval(() => { if (today() !== shownDay) { shownDay = today(); render(); } }, 60000);

  render();
  if (booted.source === "legacy" || booted.source === "transfer") {
    D.importAsked = true; save();
    toast(D.habits.length ? "Deine Gewohnheiten aus Tagwerk sind da" : "Tagwerk übernommen");
  }
  TW.registerSW();
})();

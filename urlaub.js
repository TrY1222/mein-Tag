/* ================================================================
   Urlaub – Reisekosten in jeder Währung.
   Betrag tippen, Kategorie antippen, fertig. Gespeichert wird in der
   Währung, in der du bezahlt hast, plus der Kurs von diesem Moment.
   Kurse liegen auf dem Gerät – eintragen geht auch offline.
   ================================================================ */
"use strict";

(() => {
  const { $, esc, ico, today, addDays, between, toast, sheet, menu, swipeRow } = TW;
  const KEY = "tw.urlaub";
  const CATS = [
    ["essen", "🍜", "Essen"], ["unterkunft", "🛏", "Unterkunft"], ["transport", "🚕", "Transport"], ["erleben", "🎟", "Erleben"],
    ["einkauf", "🛍", "Einkaufen"], ["anreise", "✈️", "Anreise"], ["gesundheit", "💊", "Gesundheit"], ["sonst", "☕", "Sonstiges"]
  ];
  const CAT = Object.fromEntries(CATS.map(([k, e, l]) => [k, { e, l }]));
  // Falls noch nie Kurse geladen wurden: die üblichen Währungen zur Auswahl
  const COMMON = ["EUR", "USD", "GBP", "CHF", "TRY", "THB", "JPY", "CNY", "AUD", "CAD", "NZD", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF",
    "RON", "BGN", "ISK", "MAD", "EGP", "ZAR", "AED", "INR", "IDR", "VND", "PHP", "MYR", "SGD", "HKD", "KRW", "MXN", "BRL", "ARS", "CLP", "PEN", "COP",
    "GTQ", "BZD", "HNL", "NIO", "CRC", "PAB", "DOP", "CUP", "BOB", "UYU", "PYG"];
  const RATES_MAX_AGE = 6 * 3600 * 1000;

  /* ---------- Daten ---------- */
  function normalize(d) {
    if (!d || typeof d !== "object") d = {};
    d.v = 1;
    d.trips = (Array.isArray(d.trips) ? d.trips : []).filter(t => t && t.id && String(t.name || "").trim());
    d.spends = (Array.isArray(d.spends) ? d.spends : []).filter(x => x && x.id && typeof x.amt === "number" && x.cur);
    if (!d.trips.some(t => t.id === d.current)) d.current = d.trips.length ? d.trips[d.trips.length - 1].id : null;
    if (!Array.isArray(d.recent)) d.recent = [];
    if (!d.rates || typeof d.rates !== "object" || !d.rates.r) d.rates = null;
    return d;
  }
  let D = normalize(TW.load(KEY, null));
  function save() { TW.save(KEY, D); TW.shareForOtherIcons(KEY, D); }

  const trip = () => D.trips.find(t => t.id === D.current) || null;
  const spendsOf = t => D.spends.filter(x => x.trip === t.id);

  /* ---------- Währungen & Kurse ---------- */
  const names = (() => { try { return new Intl.DisplayNames(["de"], { type: "currency" }); } catch { return null; } })();
  const curName = c => { try { return (names && names.of(c)) || c; } catch { return c; } };
  const codes = () => (D.rates ? Object.keys(D.rates.r) : COMMON).filter(c => /^[A-Z]{3}$/.test(c)).sort();
  /* Wie viel „to“ ist 1 „from“? (Kurse sind je 1 EUR gespeichert) */
  function factor(from, to) {
    if (from === to) return 1;
    const r = D.rates && D.rates.r;
    if (!r || !r[from] || !r[to]) return null;
    return r[to] / r[from];
  }
  function money(a, c, whole = false) {
    if (a == null || !isFinite(a)) return "–";
    try {
      const o = { style: "currency", currency: c };
      if (whole) { o.minimumFractionDigits = 0; o.maximumFractionDigits = 0; }
      return new Intl.NumberFormat("de-DE", o).format(a);
    } catch { return (whole ? Math.round(a) : a.toFixed(2)).toString().replace(".", ",") + " " + c; }
  }
  const short = (a, c) => money(a, c, Math.abs(a) >= 100);
  /* „12,50“, „0,025“, „1.234,5“, „1.200“, „1,234.50“, „12.5“ → Zahl */
  function parseAmount(s) {
    s = String(s || "").replace(/[\s'’]/g, "").replace(/[^\d.,-]/g, "");
    if (!s) return NaN;
    const lc = s.lastIndexOf(","), ld = s.lastIndexOf(".");
    if (lc >= 0 && ld >= 0) s = lc > ld ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
    else if (lc >= 0) s = s.replace(",", ".");                       // Komma allein = Dezimalkomma
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
    return parseFloat(s);
  }
  const homeOf = x => (typeof x.f === "number" ? x.amt * x.f : null);

  let ratesBusy = false;
  async function loadRates(force = false) {
    if (ratesBusy) return false;
    if (!force && D.rates && Date.now() - D.rates.at < RATES_MAX_AGE) return true;
    ratesBusy = true;
    const sources = [
      async () => {
        const j = await (await fetch("https://open.er-api.com/v6/latest/EUR")).json();
        if (j.result !== "success" || !j.rates) throw new Error();
        return { r: j.rates, date: TW.iso(new Date(j.time_last_update_unix * 1000)), src: "er" };
      },
      async () => {
        const j = await (await fetch("https://api.frankfurter.app/latest")).json();
        if (!j.rates) throw new Error();
        return { r: Object.assign({ EUR: 1 }, j.rates), date: j.date, src: "ecb" };
      }
    ];
    let ok = false;
    for (const get of sources) {
      try { const x = await get(); D.rates = Object.assign(x, { at: Date.now() }); ok = true; break; } catch {}
    }
    ratesBusy = false;
    if (ok) { fillMissing(); save(); render(); }
    return ok;
  }
  /* Ausgaben ohne Kurs (offline eingetragen) bekommen ihn, sobald Kurse da sind */
  function fillMissing() {
    D.spends.forEach(x => {
      if (typeof x.f === "number") return;
      const t = D.trips.find(y => y.id === x.trip);
      const f = t && factor(x.cur, t.home);
      if (f) x.f = f;
    });
  }
  function ratesLine() {
    if (!D.rates) return '<p class="rate-line">Noch keine Kurse geladen – dafür einmal online sein. <button id="rl-up">Jetzt laden</button></p>';
    const src = D.rates.src === "ecb"
      ? 'Quelle: <a href="https://www.frankfurter.app" target="_blank" rel="noopener">Frankfurter (EZB)</a>'
      : '<a href="https://www.exchangerate-api.com" target="_blank" rel="noopener">Rates By Exchange Rate API</a>';
    return '<p class="rate-line">Kurse vom ' + esc(TW.shortDate(D.rates.date || TW.iso(new Date(D.rates.at)))) + " · " + src
      + ' · <button id="rl-up">Aktualisieren</button></p>';
  }
  function wireRatesLine(root) {
    const b = root.querySelector("#rl-up");
    if (b) b.addEventListener("click", async () => {
      b.textContent = "lädt …";
      const ok = await loadRates(true);
      if (!ok) { toast("Kurse gerade nicht erreichbar – die gespeicherten gelten weiter."); render(); }
      else toast("Kurse aktualisiert");
    });
  }

  /* Währung wählen: Liste mit Suche, oft benutzte zuerst */
  function pickCurrency(title, current, onPick, onCancel) {
    const t = trip();
    const top = [...new Set([current, t && t.cur, t && t.home, ...D.recent].filter(Boolean))];
    const all = codes();
    const s = sheet("<h2>" + esc(title) + "</h2>"
      + '<input class="f-input" id="pc-q" type="search" placeholder="Suchen – Land, Name oder Kürzel" autocomplete="off" style="margin-top:12px">'
      + '<ul class="cur-list" id="pc-list"></ul>', { onClose: () => { if (!picked && onCancel) setTimeout(onCancel, 60); } });
    let picked = false;
    const list = s.el.querySelector("#pc-list");
    const draw = q => {
      q = q.trim().toLowerCase();
      const pool = q ? all.filter(c => c.toLowerCase().includes(q) || curName(c).toLowerCase().includes(q)) : [...top, ...all.filter(c => !top.includes(c))];
      list.innerHTML = pool.slice(0, 200).map(c => '<li data-c="' + c + '" class="' + (c === current ? "on" : "") + '"><b>' + c + "</b><span>" + esc(curName(c)) + "</span></li>").join("")
        || '<li style="cursor:default"><span>Nichts gefunden.</span></li>';
      list.querySelectorAll("[data-c]").forEach(li => li.addEventListener("click", () => {
        const c = li.dataset.c;
        D.recent = [c, ...D.recent.filter(x => x !== c)].slice(0, 6);
        picked = true;
        save(); s.close(); onPick(c);
      }));
    };
    s.el.querySelector("#pc-q").addEventListener("input", e => draw(e.target.value));
    draw("");
  }

  /* ---------- Reisen ---------- */
  function tripSheet(t, draft) {
    const isNew = !t;
    const x = draft || (t ? Object.assign({}, t) : { name: "", cur: "EUR", home: (trip() && trip().home) || "EUR", start: today(), end: "", budget: 0 });
    const s = sheet("<h2>" + (isNew ? "Neue Reise" : "Reise bearbeiten") + "</h2>"
      + '<label class="f-label">Wohin?</label><input class="f-input" id="tr-name" value="' + esc(x.name) + '" placeholder="z.B. Thailand" enterkeyhint="done">'
      + '<label class="f-label">Währung vor Ort</label><button class="btn full" id="tr-cur" style="justify-content:space-between"></button>'
      + '<label class="f-label">Von – bis</label><div style="display:flex;gap:8px">'
      + '<input class="f-input" type="date" id="tr-start" value="' + esc(x.start || "") + '"><input class="f-input" type="date" id="tr-end" value="' + esc(x.end || "") + '"></div>'
      + '<p class="tw-hint" style="margin-top:6px">Das Ende ist freiwillig. Ausgaben vor dem Start (Flug, Hotel) zählen als „Vorab“ und nicht in den Tagesschnitt.</p>'
      + '<label class="f-label">Tagesbudget (freiwillig)</label><div style="display:flex;gap:8px;align-items:center">'
      + '<input class="f-input" id="tr-budget" inputmode="decimal" placeholder="z.B. 60" value="' + (x.budget ? String(x.budget).replace(".", ",") : "") + '"><span id="tr-home-l" style="font-weight:700"></span></div>'
      + '<label class="f-label">Deine Währung zu Hause</label><button class="btn full" id="tr-home" style="justify-content:space-between"></button>'
      + '<div class="actions"><button class="btn primary" id="tr-ok">' + (isNew ? "Reise anlegen" : "Speichern") + "</button></div>"
      + (!isNew ? '<div class="stack"><button class="btn full danger" id="tr-del">' + ico("trash") + "<span>Reise löschen</span></button></div>" : ""));
    const paint = () => {
      s.el.querySelector("#tr-cur").innerHTML = "<span>" + esc(curName(x.cur)) + "</span><b>" + x.cur + "</b>";
      s.el.querySelector("#tr-home").innerHTML = "<span>" + esc(curName(x.home)) + "</span><b>" + x.home + "</b>";
      s.el.querySelector("#tr-home-l").textContent = x.home + " pro Tag";
    };
    paint();
    const keep = () => {
      x.name = s.el.querySelector("#tr-name").value.trim();
      x.start = s.el.querySelector("#tr-start").value || today();
      x.end = s.el.querySelector("#tr-end").value || "";
      const b = parseAmount(s.el.querySelector("#tr-budget").value);
      x.budget = isFinite(b) && b > 0 ? b : 0;
    };
    // Die Auswahl öffnet ein eigenes Blatt – danach dieses mit den Eingaben wieder öffnen
    const choose = (title, field) => {
      keep(); s.close();
      setTimeout(() => pickCurrency(title, x[field], c => { x[field] = c; tripSheet(t, x); }, () => tripSheet(t, x)), 60);
    };
    s.el.querySelector("#tr-cur").addEventListener("click", () => choose("Währung vor Ort", "cur"));
    s.el.querySelector("#tr-home").addEventListener("click", () => choose("Deine Währung", "home"));
    s.el.querySelector("#tr-name").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } });
    s.el.querySelector("#tr-ok").addEventListener("click", () => {
      keep();
      if (!x.name) { toast("Gib der Reise einen Namen."); s.el.querySelector("#tr-name").focus(); return; }
      if (x.end && x.end < x.start) { toast("Das Ende liegt vor dem Start."); return; }
      if (isNew) {
        const nt = { id: TW.uid(), name: x.name, cur: x.cur, home: x.home, start: x.start, end: x.end, budget: x.budget, created: Date.now() };
        D.trips.push(nt); D.current = nt.id; entryCur = nt.cur;
        toast("Gute Reise! Ausgaben einfach unten eintippen.");
      } else {
        const homeChanged = t.home !== x.home;
        Object.assign(t, { name: x.name, cur: x.cur, home: x.home, start: x.start, end: x.end, budget: x.budget });
        if (homeChanged) spendsOf(t).forEach(sp => { if (!sp.manual) { const f = factor(sp.cur, t.home); sp.f = f || undefined; } });
      }
      save(); s.close(); render();
    });
    const del = s.el.querySelector("#tr-del");
    if (del) del.addEventListener("click", () => {
      const n = spendsOf(t).length;
      if (n && !confirm("„" + t.name + "“ mit " + n + " Ausgaben löschen?")) return;
      const keepTrips = D.trips.slice(), keepSpends = D.spends.slice(), keepCur = D.current;
      D.trips = D.trips.filter(y => y !== t); D.spends = D.spends.filter(y => y.trip !== t.id);
      D = normalize(D); save(); s.close(); render();
      toast("„" + t.name + "“ gelöscht", { action: () => { D.trips = keepTrips; D.spends = keepSpends; D.current = keepCur; save(); render(); } });
    });
  }
  function tripsSheet() {
    const s = sheet("<h2>Reisen</h2>"
      + '<ul class="tw-list" style="margin-top:8px">' + D.trips.slice().reverse().map(t => {
        const sum = spendsOf(t).reduce((a, x) => a + (homeOf(x) || 0), 0);
        return '<li class="tw-row trip-row" data-id="' + t.id + '" style="cursor:pointer"><div class="tw-main"><div class="tw-text">' + esc(t.name) + "</div>"
          + '<div class="tw-meta">' + esc(span(t)) + " · " + esc(short(sum, t.home)) + (t.id === D.current ? " · <b>aktuell</b>" : "") + "</div></div></li>";
      }).join("") + "</ul>"
      + '<div class="stack"><button class="btn full primary" id="ts-new">' + ico("plus") + "<span>Neue Reise</span></button>"
      + (trip() ? '<button class="btn full" id="ts-edit">Aktuelle Reise bearbeiten</button>' : "") + "</div>");
    s.el.querySelectorAll("[data-id]").forEach(li => li.addEventListener("click", () => {
      D.current = li.dataset.id; const t = trip(); entryCur = t.cur; save(); s.close(); render();
    }));
    s.el.querySelector("#ts-new").addEventListener("click", () => { s.close(); setTimeout(() => tripSheet(null), 60); });
    const ed = s.el.querySelector("#ts-edit");
    if (ed) ed.addEventListener("click", () => { s.close(); setTimeout(() => tripSheet(trip()), 60); });
  }
  const dm = s => { const d = TW.parse(s); return d.getDate() + ". " + TW.MON_S[d.getMonth()]; };
  const span = t => dm(t.start) + (t.end ? " – " + dm(t.end) : "");

  /* ---------- Zahlen zur Reise ---------- */
  function stats(t) {
    const T = today();
    const all = spendsOf(t);
    const pre = all.filter(x => x.day < t.start);
    const onTrip = all.filter(x => x.day >= t.start);
    const lastDay = t.end && t.end < T ? t.end : T;
    const days = T < t.start ? 0 : between(t.start, lastDay) + 1;
    const sum = list => list.reduce((a, x) => a + (homeOf(x) || 0), 0);
    const total = sum(all), tripSum = sum(onTrip), preSum = sum(pre);
    const todaySum = sum(all.filter(x => x.day === T));
    const missing = all.filter(x => typeof x.f !== "number").length;
    const totalDays = t.end ? between(t.start, t.end) + 1 : null;
    return { all, pre, onTrip, days, total, tripSum, preSum, todaySum, avg: days ? tripSum / days : 0, missing, totalDays, T };
  }

  /* ---------- Darstellung ---------- */
  let tab = "ausgaben", entryCur = (trip() && trip().cur) || "EUR", entryDay = today(), entryCat = "", dispCur = null;

  function render() {
    const t = trip();
    document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
    $("tabs").hidden = !t;
    $("title").textContent = t ? t.name : "Urlaub";
    if (!t) {
      $("sub").textContent = "Reisekosten in jeder Währung";
      $("view").innerHTML = '<div class="tw-empty"><b>Noch keine Reise.</b>Leg eine an – dann tippst du unterwegs nur noch Betrag und Kategorie.</div>'
        + '<button class="btn primary full" id="first-trip">' + ico("plus") + "<span>Neue Reise</span></button>";
      $("first-trip").addEventListener("click", () => tripSheet(null));
      return;
    }
    const st = stats(t);
    $("sub").textContent = st.T < t.start ? "Start in " + between(st.T, t.start) + (between(st.T, t.start) === 1 ? " Tag" : " Tagen") + " · " + span(t)
      : t.end && st.T > t.end ? "Vorbei · " + st.totalDays + " Tage · " + span(t)
      : "Tag " + st.days + (st.totalDays ? " von " + st.totalDays : "") + " · " + span(t);
    if (tab === "auswertung") renderStats(t, st);
    else if (tab === "umrechner") renderConverter(t);
    else renderSpends(t, st);
  }

  function renderSpends(t, st) {
    const h = t.home;
    let budget = "";
    if (t.budget) {
      const left = t.budget - st.todaySum;
      budget = '<div class="budget">' + (left >= 0 ? "Heute noch <b>" + short(left, h) + "</b> von " + short(t.budget, h) : '<span class="over">Heute ' + short(-left, h) + " über dem Budget</span> – passiert, morgen ist ein neuer Tag.")
        + '<div class="bar-wrap"><i style="width:' + Math.min(100, st.todaySum / t.budget * 100).toFixed(1) + '%"></i></div>';
      if (t.end && st.T >= t.start && st.T <= t.end) {
        const daysLeft = between(st.T, t.end) + 1;
        const room = (t.budget * st.totalDays - st.tripSum + st.todaySum) / daysLeft;
        budget += '<div style="margin-top:6px">Bis zum Ende im Schnitt noch <b>' + short(Math.max(0, room), h) + "</b> pro Tag drin</div>";
      }
      budget += "</div>";
    }
    const cats = CATS.map(([k, e, l]) => '<button data-cat="' + k + '"' + (k === entryCat ? ' class="on"' : "") + '><span class="e">' + e + "</span>" + l + "</button>").join("");
    $("view").innerHTML = '<div class="tw-card"><div class="sum">'
      + '<div class="big"><b>' + short(st.avg, h) + '</b><span>Ø pro Tag' + (st.days ? " · " + st.days + (st.days === 1 ? " Tag" : " Tage") : "") + "</span></div>"
      + "<div><b>" + short(st.todaySum, h) + "</b><span>heute</span></div>"
      + "<div><b>" + short(st.total, h) + "</b><span>gesamt</span></div>"
      + "<div><b>" + st.all.length + "</b><span>Ausgaben</span></div>"
      + "</div>" + budget + "</div>"
      + '<div class="amount-row"><input id="amt" inputmode="decimal" placeholder="Betrag" autocomplete="off" enterkeyhint="done" aria-label="Betrag">'
      + '<button class="cur-btn" id="cur" aria-label="Währung">' + entryCur + "</button></div>"
      + quickCurs(t)
      + '<div class="conv" id="conv"></div>'
      + '<div style="display:flex;gap:10px;align-items:center"><input class="note-in" id="note" placeholder="Wofür? (freiwillig)" autocomplete="off" enterkeyhint="done">'
      + '<label class="chip date"><span id="day-l">' + esc(dayLabel(entryDay)) + '</span><input type="date" id="day" value="' + entryDay + '" aria-label="Tag"></label></div>'
      + '<div class="cats" id="cats">' + cats + "</div>"
      + '<p class="tw-hint" style="text-align:center;margin-top:10px">Betrag eintippen, Kategorie antippen – gespeichert.</p>'
      + (st.missing ? '<p class="tw-hint" style="text-align:center;margin-top:6px">' + st.missing + " Ausgabe(n) ohne Kurs – wird nachgetragen, sobald du online bist.</p>" : "")
      + '<div id="list"></div>';
    const amt = $("amt");
    const conv = () => {
      const a = parseAmount(amt.value);
      const f = factor(entryCur, h);
      $("conv").textContent = !isFinite(a) ? (entryCur !== h ? (f ? "1 " + entryCur + " = " + f.toLocaleString("de-DE", { maximumSignificantDigits: 4 }) + " " + h : "Für " + entryCur + " fehlt noch der Kurs") : "")
        : entryCur === h ? "" : f ? "≈ " + money(a * f, h) : "Kurs fehlt – wird nachgetragen";
    };
    amt.addEventListener("input", conv);
    conv();
    $("cur").addEventListener("click", () => pickCurrency("Bezahlt in", entryCur, c => { entryCur = c; render(); }));
    // Schnellwechsel, z.B. Quetzal ↔ Dollar – der getippte Betrag bleibt stehen
    $("view").querySelectorAll("[data-qc]").forEach(b => b.addEventListener("click", () => {
      const keepAmt = $("amt").value, keepNote = $("note").value;
      entryCur = b.dataset.qc; render();
      $("amt").value = keepAmt; $("note").value = keepNote; $("amt").dispatchEvent(new Event("input"));
    }));
    $("day").addEventListener("change", e => { entryDay = e.target.value || today(); $("day-l").textContent = dayLabel(entryDay); });
    $("cats").querySelectorAll("[data-cat]").forEach(b => b.addEventListener("click", () => {
      const a = parseAmount(amt.value);
      if (!isFinite(a) || a <= 0) {
        entryCat = b.dataset.cat;
        $("cats").querySelectorAll("[data-cat]").forEach(y => y.classList.toggle("on", y === b));
        toast("Erst den Betrag eintippen – dann Enter.");
        amt.focus();
        return;
      }
      addSpend(t, a, b.dataset.cat, $("note").value.trim());
    }));
    amt.addEventListener("keydown", e => {
      if (e.key === "Enter" && entryCat) { e.preventDefault(); const a = parseAmount(amt.value); if (isFinite(a) && a > 0) addSpend(t, a, entryCat, $("note").value.trim()); }
    });
    renderList(t);
  }
  /* Die Währungen, mit denen du auf dieser Reise zahlst – je ein Tipp */
  function quickCurs(t) {
    const used = [...new Set(spendsOf(t).slice().sort((a, b) => b.created - a.created).map(x => x.cur))];
    const list = [...new Set([t.cur, ...used, ...D.recent.filter(c => c !== t.home), t.home])].slice(0, 4);
    return '<div class="chips" style="margin-top:8px">' + list.map(c => '<button class="chip' + (c === entryCur ? " on" : "") + '" data-qc="' + c + '">' + c + "</button>").join("") + "</div>";
  }
  const dayLabel = d => (d === today() ? "Heute" : TW.relDay(d).replace(/^./, c => c.toUpperCase()));

  function addSpend(t, amt, cat, note) {
    const f = factor(entryCur, t.home);
    const x = { id: TW.uid(), trip: t.id, amt, cur: entryCur, f: f || undefined, day: entryDay, cat, note, created: Date.now() };
    D.spends.push(x);
    D.recent = [entryCur, ...D.recent.filter(c => c !== entryCur)].slice(0, 6);
    entryCat = "";
    entryDay = today();            // nächster Eintrag wieder für heute
    save(); render();
    toast(money(amt, x.cur) + " · " + CAT[cat].l, { action: () => { D.spends = D.spends.filter(y => y !== x); save(); render(); } });
  }

  function renderList(t) {
    const list = $("list");
    const all = spendsOf(t).slice().sort((a, b) => b.day.localeCompare(a.day) || b.created - a.created);
    if (!all.length) { list.innerHTML = ""; return; }
    const days = [...new Set(all.map(x => x.day))];
    days.forEach(d => {
      const items = all.filter(x => x.day === d);
      const sum = items.reduce((a, x) => a + (homeOf(x) || 0), 0);
      list.insertAdjacentHTML("beforeend", '<div class="tw-section day-h"><span>' + esc(dayLabel(d)) + (d < t.start ? " · vorab" : "") + "</span><span>" + esc(short(sum, t.home)) + "</span></div>");
      const ul = document.createElement("ul");
      ul.className = "tw-list";
      items.forEach(x => {
        const li = document.createElement("li");
        li.className = "tw-swipe-wrap";
        const h = homeOf(x);
        li.innerHTML = '<div class="tw-row"><span class="sp-e">' + CAT[x.cat].e + '</span><div class="tw-main"><div class="tw-text" style="font-size:17px">'
          + esc(x.note || CAT[x.cat].l) + "</div>" + (x.note ? '<div class="tw-meta">' + esc(CAT[x.cat].l) + "</div>" : "") + "</div>"
          + '<div class="sp-r"><b>' + esc(money(x.amt, x.cur)) + "</b>"
          + (x.cur !== t.home ? (h == null ? '<span class="warn">Kurs fehlt</span>' : "<span>" + esc(money(h, t.home)) + "</span>") : "") + "</div></div>";
        li.querySelector(".tw-main").addEventListener("click", () => editSpend(x));
        li.querySelector(".sp-r").addEventListener("click", () => editSpend(x));
        swipeRow(li, li.querySelector(".tw-row"), { left: () => removeSpend(x) });
        ul.appendChild(li);
      });
      list.appendChild(ul);
    });
  }
  function removeSpend(x) {
    const i = D.spends.indexOf(x);
    if (i < 0) return;
    D.spends.splice(i, 1); save(); render();
    toast(money(x.amt, x.cur) + " gelöscht", { action: () => { D.spends.splice(Math.min(i, D.spends.length), 0, x); save(); render(); } });
  }
  function editSpend(x) {
    const t = D.trips.find(y => y.id === x.trip);
    let cur = x.cur, cat = x.cat;
    const s = sheet("<h2>Ausgabe</h2>"
      + '<div class="amount-row"><input id="e-amt" inputmode="decimal" value="' + esc(String(x.amt).replace(".", ",")) + '" aria-label="Betrag"><button class="cur-btn" id="e-cur">' + cur + "</button></div>"
      + '<label class="f-label">Kurs</label><div style="display:flex;gap:8px;align-items:center"><span style="white-space:nowrap">1 <span id="e-c1">' + cur + "</span> =</span>"
      + '<input class="f-input" id="e-rate" inputmode="decimal" placeholder="Kurs" value="' + (typeof x.f === "number" ? String(+x.f.toPrecision(6)).replace(".", ",") : "") + '"><b>' + t.home + "</b></div>"
      + '<p class="tw-hint" style="margin-top:6px">Steht automatisch drin. Ändern, wenn deine Bank anders abgerechnet hat.</p>'
      + '<label class="f-label">Kategorie</label><div class="cats" id="e-cats">' + CATS.map(([k, e, l]) => '<button data-cat="' + k + '"' + (k === cat ? ' class="on"' : "") + '><span class="e">' + e + "</span>" + l + "</button>").join("") + "</div>"
      + '<label class="f-label">Wofür</label><input class="f-input" id="e-note" value="' + esc(x.note || "") + '" placeholder="freiwillig">'
      + '<label class="f-label">Tag</label><input class="f-input" type="date" id="e-day" value="' + x.day + '">'
      + '<div class="actions"><button class="btn primary" id="e-ok">Speichern</button></div>'
      + '<div class="stack"><button class="btn full danger" id="e-del">' + ico("trash") + "<span>Löschen</span></button></div>");
    const rateIn = s.el.querySelector("#e-rate");
    let manual = !!x.manual;
    rateIn.addEventListener("input", () => { manual = true; });
    s.el.querySelector("#e-cur").addEventListener("click", () => {
      const keepAmt = s.el.querySelector("#e-amt").value;
      pickCurrency("Bezahlt in", cur, c => {
        x.cur = c; delete x.manual; x.f = factor(c, t.home) || undefined;
        const a = parseAmount(keepAmt); if (isFinite(a) && a > 0) x.amt = a;
        save(); render(); editSpend(x);
      });
    });
    s.el.querySelectorAll("#e-cats [data-cat]").forEach(b => b.addEventListener("click", () => {
      cat = b.dataset.cat; s.el.querySelectorAll("#e-cats [data-cat]").forEach(y => y.classList.toggle("on", y === b));
    }));
    s.el.querySelector("#e-ok").addEventListener("click", () => {
      const a = parseAmount(s.el.querySelector("#e-amt").value);
      if (!isFinite(a) || a <= 0) { toast("Der Betrag fehlt."); return; }
      x.amt = a; x.cat = cat; x.note = s.el.querySelector("#e-note").value.trim();
      x.day = s.el.querySelector("#e-day").value || x.day;
      if (manual) {
        const r = parseAmount(rateIn.value);
        if (isFinite(r) && r > 0) { x.f = r; x.manual = true; }
      }
      save(); s.close(); render();
    });
    s.el.querySelector("#e-del").addEventListener("click", () => { s.close(); removeSpend(x); });
  }

  /* ---------- Auswertung ---------- */
  function renderStats(t, st) {
    const disp = dispCur || t.home;
    const k = factor(t.home, disp);
    const cv = a => (k == null ? null : a * k);
    const m = a => short(cv(a), disp);
    if (!st.all.length) {
      $("view").innerHTML = '<div class="tw-empty"><b>Noch nichts eingetragen.</b>Sobald du Ausgaben einträgst, siehst du hier, wofür wie viel draufgeht.</div>';
      return;
    }
    const chips = [...new Set([t.home, t.cur, disp])].map(c => '<button class="chip' + (c === disp ? " on" : "") + '" data-disp="' + c + '">' + c + "</button>").join("")
      + '<button class="chip" id="disp-other">Andere …</button>';
    const byCat = CATS.map(([key, e, l]) => {
      const items = st.all.filter(x => x.cat === key);
      return { key, e, l, sum: items.reduce((a, x) => a + (homeOf(x) || 0), 0), n: items.length };
    }).filter(c => c.n).sort((a, b) => b.sum - a.sum);
    const maxCat = Math.max(...byCat.map(c => c.sum), 1);
    const days = [...new Set(st.onTrip.map(x => x.day))].sort().reverse();
    const daySums = days.map(d => ({ d, sum: st.onTrip.filter(x => x.day === d).reduce((a, x) => a + (homeOf(x) || 0), 0) }));
    const maxDay = Math.max(...daySums.map(x => x.sum), 1);
    const top = daySums.slice().sort((a, b) => b.sum - a.sum)[0];
    const orig = {};
    st.all.forEach(x => { orig[x.cur] = (orig[x.cur] || 0) + x.amt; });
    $("view").innerHTML = '<div class="chips" style="margin-top:12px">' + chips + "</div>"
      + (k == null ? '<p class="tw-hint" style="margin-top:8px">Für ' + disp + " fehlt noch der Kurs.</p>" : "")
      + '<div class="tw-card"><div class="sum"><div class="big"><b>' + m(st.avg) + "</b><span>Ø pro Tag</span></div>"
      + "<div><b>" + m(st.total) + "</b><span>gesamt</span></div>"
      + "<div><b>" + m(st.tripSum) + "</b><span>vor Ort</span></div>"
      + "<div><b>" + m(st.preSum) + "</b><span>vorab</span></div></div></div>"
      + '<div class="tw-section">Wofür</div>'
      + byCat.map(c => '<div class="cat-row"><div class="top"><span>' + c.e + " " + esc(c.l) + "</span><b>" + m(c.sum) + "</b></div>"
        + '<div class="sub">' + Math.round(c.sum / (st.total || 1) * 100) + " %" + (st.days && c.key !== "anreise" ? " · Ø " + m(st.onTrip.filter(x => x.cat === c.key).reduce((a, x) => a + (homeOf(x) || 0), 0) / st.days) + " pro Tag" : "") + " · " + c.n + "×</div>"
        + '<div class="bar-wrap"><i style="width:' + (c.sum / maxCat * 100).toFixed(1) + '%"></i></div></div>').join("")
      + (daySums.length ? '<div class="tw-section">Pro Tag' + (top ? " · teuerster: " + esc(dm(top.d)) : "") + "</div>"
        + daySums.map(x => '<div class="cat-row"><div class="top"><span>' + esc(dayLabel(x.d)) + "</span><b>" + m(x.sum) + "</b></div>"
          + '<div class="bar-wrap"><i style="width:' + (x.sum / maxDay * 100).toFixed(1) + '%"></i></div></div>').join("") : "")
      + '<div class="tw-section">Bezahlt in</div>'
      + Object.entries(orig).map(([c, a]) => '<div class="cat-row"><div class="top"><span>' + esc(curName(c)) + "</span><b>" + money(a, c) + "</b></div></div>").join("")
      + ratesLine();
    $("view").querySelectorAll("[data-disp]").forEach(b => b.addEventListener("click", () => { dispCur = b.dataset.disp; render(); }));
    $("disp-other").addEventListener("click", () => pickCurrency("Anzeigen in", disp, c => { dispCur = c; render(); }));
    wireRatesLine($("view"));
  }

  /* ---------- Umrechner ---------- */
  let convAmt = "100", convFrom = null, showAll = false, convQ = "";
  function renderConverter(t) {
    convFrom = convFrom || t.cur;
    const favs = [...new Set([t.home, t.cur, ...D.recent, "EUR", "USD", "GBP"])].filter(c => c !== convFrom);
    $("view").innerHTML = '<div class="amount-row"><input id="cv-amt" inputmode="decimal" value="' + esc(convAmt) + '" aria-label="Betrag"><button class="cur-btn" id="cv-from">' + convFrom + "</button></div>"
      + '<p class="conv">' + esc(curName(convFrom)) + "</p>"
      + '<ul class="tw-list conv-list" id="cv-list"></ul>'
      + '<button class="tw-link" id="cv-all"><span>' + (showAll ? "Nur die wichtigsten" : "Alle Währungen anzeigen") + "</span><span>›</span></button>"
      + (showAll ? '<input class="f-input" id="cv-q" type="search" placeholder="Suchen …" value="' + esc(convQ) + '">' : "")
      + '<ul class="tw-list conv-list" id="cv-all-list"></ul>'
      + ratesLine();
    const draw = () => {
      const a = parseAmount($("cv-amt").value);
      const row = c => {
        const f = factor(convFrom, c);
        return '<li class="tw-row" data-c="' + c + '" style="cursor:pointer"><span class="code">' + c + '</span><span class="name">' + esc(curName(c)) + '</span><span class="val">'
          + (f == null || !isFinite(a) ? "–" : esc(money(a * f, c))) + "</span></li>";
      };
      $("cv-list").innerHTML = favs.map(row).join("");
      if (showAll) {
        const q = convQ.trim().toLowerCase();
        $("cv-all-list").innerHTML = codes().filter(c => !favs.includes(c) && c !== convFrom && (!q || c.toLowerCase().includes(q) || curName(c).toLowerCase().includes(q))).map(row).join("");
      }
      $("view").querySelectorAll("[data-c]").forEach(li => li.addEventListener("click", () => {
        // Antippen: diese Währung wird zur Ausgangswährung, der Betrag bleibt gleich viel wert
        const f = factor(convFrom, li.dataset.c), aa = parseAmount($("cv-amt").value);
        if (f != null && isFinite(aa)) convAmt = String(+(aa * f).toFixed(2)).replace(".", ",");
        convFrom = li.dataset.c; render();
      }));
    };
    $("cv-amt").addEventListener("input", e => { convAmt = e.target.value; draw(); });
    $("cv-from").addEventListener("click", () => pickCurrency("Umrechnen von", convFrom, c => { convFrom = c; render(); }));
    $("cv-all").addEventListener("click", () => { showAll = !showAll; render(); });
    const q = $("cv-q");
    if (q) q.addEventListener("input", e => { convQ = e.target.value; draw(); });
    draw();
    wireRatesLine($("view"));
  }

  /* ---------- Menü ---------- */
  function exportCsv() {
    const t = trip();
    if (!t) return;
    const rows = [["Datum", "Kategorie", "Wofür", "Betrag", "Währung", "Kurs", "Betrag " + t.home]];
    spendsOf(t).slice().sort((a, b) => a.day.localeCompare(b.day)).forEach(x => {
      const h = homeOf(x);
      rows.push([x.day, CAT[x.cat].l, x.note || "", String(x.amt).replace(".", ","), x.cur, typeof x.f === "number" ? String(x.f).replace(".", ",") : "", h == null ? "" : h.toFixed(2).replace(".", ",")]);
    });
    const csv = "﻿" + rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "urlaub-" + t.name.replace(/[^\wäöüÄÖÜß-]+/g, "-") + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    toast("Tabelle gespeichert – öffnet sich in Numbers oder Excel");
  }
  const WHY = [
    { t: "In der Währung speichern, in der du bezahlt hast", d: "Dazu der Kurs von genau diesem Moment. So stimmen die Beträge später noch, auch wenn sich der Kurs ändert – und du siehst, wie viel Bargeld in welcher Währung weg ist.", src: "Empfehlung aus Vergleichen von Reise-Budget-Apps", url: "https://getfinny.app/blog/best-travel-budget-apps-2026" },
    { t: "Funktioniert offline", d: "Im Ausland ist oft kein Netz. Die Kurse liegen auf dem Handy; was ohne Kurs eingetragen wird, bekommt ihn automatisch nach, sobald du online bist.", src: "pocketclear.app", url: "https://pocketclear.app/blog/best-offline-budget-app-travel.html" },
    { t: "Tagesschnitt und Tagesbudget", d: "Der wichtigste Wert unterwegs: Was kostet ein Tag? Flug und vorab gebuchtes Hotel zählen als „Vorab“, damit der Schnitt ehrlich bleibt.", src: "Wie TravelSpend & Co.", url: "https://toomanyadapters.com/best-budgeting-expense-tracking-apps-travel/" },
    { t: "Ein Tipp pro Ausgabe", d: "Je weniger man eintragen muss, desto eher bleibt man dran. Darum: Betrag, Kategorie – fertig. Notiz und Datum nur, wenn du willst.", src: "Cordeiro u.a. 2015" }
  ];
  $("menu").innerHTML = ico("more");
  $("menu").addEventListener("click", () => menu("Urlaub", [
    { label: "Reisen", icon: "book", act: tripsSheet },
    { label: "Neue Reise", icon: "plus", act: () => tripSheet(null) },
    { label: "Als Tabelle exportieren (CSV)", icon: "download", act: exportCsv },
    { label: "Kurse aktualisieren", icon: "repeat", act: async () => { toast(await loadRates(true) ? "Kurse aktualisiert" : "Kurse gerade nicht erreichbar"); } },
    { label: "Warum ist die App so?", icon: "info", act: () => TW.why("Warum so?", WHY) },
    { label: "Hell oder dunkel", icon: "more", act: () => { const s = sheet("<h2>Design</h2>" + TW.themeChipsHtml()); TW.wireThemeChips(s.el); } },
    { label: "Sicherung als Datei", icon: "download", act: () => { TW.download("urlaub-" + today() + ".json", { app: KEY, v: 1, at: Date.now(), data: D }); toast("Sicherung gespeichert"); } },
    { label: "Daten übernehmen", icon: "upload", act: () => TW.importSheet({ key: KEY, fromLegacy: () => null, hasData: D.trips.length > 0, onData: d => { D = normalize(d); save(); render(); toast("Übernommen"); } }) },
    { label: "Alle Tagwerk-Apps", icon: "right", act: () => { location.href = "index.html"; } }
  ]));

  document.querySelectorAll("#tabs button").forEach(b => b.addEventListener("click", () => { tab = b.dataset.tab; render(); window.scrollTo({ top: 0 }); }));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    if (entryDay < today() && !document.querySelector(".sheet")) entryDay = today();
    loadRates(); render();
  });

  render();
  loadRates();
  // Neue Symbole: Daten aus einem anderen Tagwerk-Symbol übernehmen, falls der Cache geteilt wird
  if (!D.trips.length) TW.getTransfer().then(T => {
    const d = T && T.apps && T.apps[KEY];
    if (d && !D.trips.length) { D = normalize(d); save(); render(); toast("Deine Reisen sind da"); }
  });
  TW.registerSW();
})();

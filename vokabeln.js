/* ================================================================
   Vokabeln – Wörter aus dem Lesen sammeln und behalten.
   Lernweg: jedes fällige Wort einmal pro Runde · 3× in Folge gewusst
   (1/3/7 Tage) · dann 1× andersrum · Auffrischung nach 1 und 3 Monaten ·
   bei Falsch 1× abschreiben + 2× aus dem Kopf.
   ================================================================ */
"use strict";

(async () => {
  const { $, esc, ico, today, addDays, shortDate, toast, sheet, menu, swipeRow } = TW;
  const KEY = "tw.vokabeln";
  const STEPS = 3;
  const GAPS = [1, 3, 7];        // Tage bis zur nächsten Abfrage nach dem 1., 2. und 3. Treffer
  const REFRESH = [30, 60];      // Auffrischung ≈1 Monat nach „sitzt“, dann ≈3 Monate nach „sitzt“
  const COPIES = 3;              // nach „Falsch“: 1× abschreiben, 2× aus dem Kopf
  const MODEL = "claude-haiku-4-5";

  /* ---------- Daten ---------- */
  const TIERS = ["S", "A", "B", "C", "D"];        // Wertung wie im alten Tagwerk: S = Highlight … D = gar nicht
  const same = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
  /* Bücher heißen „Titel – Autor“ (so hat sie auch das alte Tagwerk gespeichert) */
  function splitTitle(title) {
    const t = String(title || "").trim();
    const m = /^(.*\S)\s+[–-]\s+(\S.*)$/.exec(t);
    return m ? { name: m[1], author: m[2] } : { name: t, author: "" };
  }
  const isoDate = s => (/^\d{4}-\d\d-\d\d$/.test(s || "") ? s : null);
  function booksFromLegacy(L) {
    // Nur Bücher, keine Spiele. Wann ein Buch fertig war, hat das alte Tagwerk nicht gespeichert.
    return (L.books || []).filter(x => x && (x.media || "book") === "book" && String(x.question || "").trim()).map(x => ({
      id: x.id || TW.uid(), title: String(x.question).trim(), status: x.reading ? "lese" : "fertig",
      started: x.reading && typeof x.created === "number" ? TW.iso(new Date(x.created)) : null, finished: null,
      tier: TIERS.includes(x.tier) ? x.tier : "", desc: String(x.desc || "").trim(), notes: String(x.answer || "").trim(),
      eng: x.eng === true, created: typeof x.created === "number" ? x.created : Date.now()
    }));
  }
  /* Wörter und Bücher verbinden: Wörter mit nur dem Titel bekommen das passende Buch,
     und Bücher, die es bisher nur als Angabe an Wörtern gab, kommen in die Liste */
  function linkBooks(d) {
    const fit = s => {
      s = String(s || "").trim();
      if (!s || d.books.some(b => same(b.title, s))) return s;
      const hit = d.books.filter(b => same(splitTitle(b.title).name, s));
      return hit.length === 1 ? hit[0].title : s;
    };
    d.words.forEach(v => { if (v.book) v.book = fit(v.book); });
    d.lastBook = fit(d.lastBook);
    const add = (title, status, created) => {
      if (!title || d.books.some(b => same(b.title, title))) return;
      d.books.push({ id: TW.uid(), title, status, started: null, finished: null, tier: "", desc: "", notes: "", eng: false, created: created || Date.now() });
    };
    add(d.lastBook, "lese");
    d.words.slice().sort((a, b) => (a.created || 0) - (b.created || 0)).forEach(v => add(v.book, "fertig", v.created));
  }
  function fromLegacy(L) {
    const words = (L.vocab || []).map(v => ({ ...v }));
    const books = booksFromLegacy(L);
    // Buch für neue Wörter, wie im alten Tagwerk: das zuletzt benutzte, wenn es noch gelesen wird, sonst das erste laufende
    const reading = books.filter(b => b.status === "lese").map(b => b.title);
    const withBook = words.filter(v => v.book).sort((a, b) => (a.created || 0) - (b.created || 0)).pop();
    const last = withBook ? String(withBook.book).trim() : "";
    const d = {
      v: 1, words, books, log: L.vocabLog || {}, accent: L.vocabAccent || "en-GB", speak: L.vocabSpeak !== false,
      usage: L.usage || { input: 0, output: 0, cost: 0 }, from: "tagwerk",
      lastBook: reading.find(b => same(b, last) || same(splitTitle(b).name, last)) || reading[0] || last
    };
    linkBooks(d);
    return d;
  }
  function normalize(d) {
    if (!d || typeof d !== "object") d = {};
    const t = today();
    d.words = (Array.isArray(d.words) ? d.words : []).filter(v => v && String(v.word || "").trim()).map(v => {
      v.word = String(v.word).trim();
      if (v.kind !== "term") v.kind = "word";
      if (typeof v.hits !== "number") v.hits = (typeof v.box === "number" ? v.box : 1) - 1;   // alter Karteikasten
      v.hits = Math.max(0, Math.min(STEPS, Math.floor(v.hits) || 0));
      v.learned = v.learned === true;
      delete v.box; delete v.__retried; delete v.__flip; delete v.busy;
      if (v.learned) {
        if (typeof v.refresh !== "number") { v.refresh = 0; if (!v.due) v.due = addDays(v.learnedAt || t, REFRESH[0]); }
        v.refresh = Math.max(0, Math.min(REFRESH.length, Math.floor(v.refresh) || 0));
        if (v.refresh >= REFRESH.length) delete v.due;
        else if (!v.due) v.due = t;
      } else {
        delete v.refresh;
        if (!v.due) v.due = t;
      }
      if (!v.id) v.id = TW.uid();
      if (!v.created) v.created = Date.now();
      return v;
    });
    if (!d.log || typeof d.log !== "object") d.log = {};
    if (!["en-GB", "en-US"].includes(d.accent)) d.accent = "en-GB";
    if (typeof d.speak !== "boolean") d.speak = true;
    if (!d.usage || typeof d.usage !== "object") d.usage = { input: 0, output: 0, cost: 0 };
    if (typeof d.lastBook !== "string") d.lastBook = "";
    const fresh = !Array.isArray(d.books);
    d.books = (fresh ? [] : d.books).filter(b => b && String(b.title || "").trim()).map(b => ({
      id: b.id || TW.uid(), title: String(b.title).trim(),
      status: ["lese", "fertig", "abgebrochen"].includes(b.status) ? b.status : "lese",
      started: isoDate(b.started), finished: isoDate(b.finished), tier: TIERS.includes(b.tier) ? b.tier : "",
      desc: String(b.desc || ""), notes: String(b.notes || ""), eng: b.eng === true,
      created: typeof b.created === "number" ? b.created : Date.now()
    }));
    if (fresh) {                 // Daten von vor der Bücherliste: einmal aufbauen
      const L = TW.legacy();
      if (L) d.books = booksFromLegacy(L);
      linkBooks(d);
    }
    d.v = 1;
    return d;
  }

  const booted = await TW.boot(KEY, fromLegacy);
  const hadBooks = !!booted.data && Array.isArray(booted.data.books);
  let D = normalize(booted.data);
  let view = "woerter", filter = "", search = "";
  function save() { TW.save(KEY, D); TW.shareForOtherIcons(KEY, D); }
  if (booted.data && !hadBooks) save();           // Bücherliste gerade erst aufgebaut → gleich sichern
  const apiKey = () => localStorage.getItem(TW.API_KEY) || "";

  /* ---------- Lernstand ---------- */
  const due = () => { const t = today(); return D.words.filter(v => v.due && v.due <= t); };
  const reverse = v => !v.learned && v.hits >= STEPS;                          // fehlt nur noch „andersrum“
  const askReverse = v => reverse(v) || (v.learned && v.refresh === 1);       // 2. Auffrischung auch andersrum
  function stage(v) {
    if (v.learned) return v.due ? "Sitzt ✓ · Auffrischung " + (v.refresh + 1) + " von " + REFRESH.length + " steht noch aus" : "Sitzt ✓ · alle Auffrischungen geschafft";
    if (reverse(v)) return "Als Nächstes: " + (v.kind === "term" ? "Bedeutung → Begriff" : "Deutsch → Englisch");
    return v.hits + " von " + STEPS + " in Folge gewusst";
  }
  const badge = v => (v.learned ? "✓" : reverse(v) ? "⇄" : v.hits + "/" + STEPS);
  function steps(v) {
    let dots = "";
    for (let i = 0; i < STEPS; i++) dots += '<i class="' + (v.learned || i < v.hits ? "on" : "") + '"></i>';
    return '<span class="vc-steps" title="' + esc(stage(v)) + '">' + dots + '<b class="' + (v.learned ? "on" : reverse(v) ? "next" : "") + '">⇄</b></span>';
  }
  function grade(v, ok) {
    const t = today();
    if (v.learned) {                                // Auffrischung
      if (ok) {
        v.refresh = (v.refresh || 0) + 1;
        if (v.refresh < REFRESH.length) v.due = addDays(t, REFRESH[v.refresh]);
        else delete v.due;
      } else {
        v.learned = false; v.hits = 0;              // vergessen – wie jedes „Falsch“: von vorn
        delete v.refresh; delete v.learnedAt;
        v.due = addDays(t, 1);
      }
      return;
    }
    if (reverse(v)) {
      if (ok) { v.learned = true; v.learnedAt = t; v.refresh = 0; v.due = addDays(t, REFRESH[0]); }
      else v.due = addDays(t, 1);                   // andersrum klappt noch nicht: morgen wieder andersrum
    } else if (ok) {
      v.hits = Math.min(STEPS, v.hits + 1);
      v.due = addDays(t, GAPS[v.hits - 1]);
    } else {
      v.hits = 0;
      v.due = addDays(t, 1);
    }
  }
  function practiced() {
    const t = today();
    D.log[t] = D.words.map(v => v.due).filter(d => d && d > t).sort()[0] || "9999-12-31";
  }
  const wordBooks = () => [...new Set(D.words.map(v => v.book).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de"));

  /* ---------- Claude: nachschlagen (eigener Schlüssel, nur lokal) ---------- */
  function jsonFrom(text) {
    const s = String(text).replace(/```json|```/g, "").trim();
    try { return JSON.parse(s); } catch {}
    const a = s.indexOf("{"), b = s.lastIndexOf("}");
    if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch {} }
    return null;
  }
  /* Fehler von Anthropic in verständliche Sätze übersetzen */
  function apiProblem(status, body) {
    const msg = String((body && body.error && body.error.message) || "");
    if (status === 401) return "Der API-Schlüssel ist ungültig oder wurde gelöscht. Leg in der Anthropic Console einen neuen an und trag ihn hier ein.";
    if (/credit balance/i.test(msg)) return "Dein Guthaben bei Anthropic ist aufgebraucht. In der Anthropic Console unter Billing aufladen.";
    if (status === 403) return "Dieser Schlüssel darf das nicht (keine Berechtigung).";
    if (status === 429) return "Zu viele Anfragen oder Ausgabenlimit erreicht – kurz warten oder das Limit in der Console prüfen.";
    if (status === 529 || status >= 500) return "Anthropic ist gerade überlastet – in ein paar Minuten nochmal.";
    return msg || "Fehler " + status;
  }
  async function callClaude({ system, userText, maxTokens = 1000, image = null }) {
    const key = apiKey();
    if (!key) throw new Error("In dieser App ist noch kein API-Schlüssel gespeichert (⋯ → Einstellungen).");
    const content = image
      ? [{ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } }, { type: "text", text: userText }]
      : userText;
    let res, body = null;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content }] })
      });
    } catch { throw new Error("Keine Verbindung zu Anthropic – bist du online?"); }
    try { body = await res.json(); } catch {}
    if (!res.ok) throw new Error(apiProblem(res.status, body));
    if (!body) throw new Error("Anthropic hat keine lesbare Antwort geschickt.");
    if (body.stop_reason === "refusal") throw new Error("Claude hat die Anfrage abgelehnt.");
    const u = body.usage || {};
    D.usage.input += u.input_tokens || 0;
    D.usage.output += u.output_tokens || 0;
    D.usage.cost += (u.input_tokens || 0) / 1e6 + (u.output_tokens || 0) * 5 / 1e6;   // Haiku 4.5: $1 / $5 je Mio.
    save();
    return (body.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
  }
  const ACCENT_WORD = () => (D.accent === "en-US" ? "amerikanisch" : "britisch");
  async function lookup(v) {
    const text = await callClaude({
      system: "Du hilfst einem deutschen Leser bei einem Wort aus seiner Lektüre. Entscheide selbst, was gebraucht wird:\n"
        + "· Fremdsprachiges Wort (meist Englisch) → übersetzen. kind = \"word\".\n"
        + "· Deutscher Fachbegriff aus Philosophie, Wissenschaft o.ä. → in normalem Deutsch erklären, NICHT übersetzen. "
        + "trans ist dann eine kurze Umschreibung in zwei bis vier Wörtern. kind = \"term\".\n"
        + "Korrigiere Tippfehler und gib die Grundform an. Antworte AUSSCHLIESSLICH mit JSON, ohne Code-Fences: "
        + '{"word":"<Wort, Grundform>","kind":"word"|"term","type":"<Wortart auf Deutsch>","trans":"<Übersetzung bzw. kurze Umschreibung>","meaning":"<ein bis zwei kurze deutsche Sätze: was es bedeutet>","example":"<ein kurzer Beispielsatz>","ipa":"<Lautschrift in IPA, ohne Schrägstriche>","say":"<Lesehilfe mit deutschen Buchstaben, Silben mit Bindestrich, betonte Silbe in GROSSBUCHSTABEN, z.B. ri-LAK-tent>"}. '
        + "Wenn ein Satz mitgeliefert wird, beziehe dich auf DIESE Bedeutung im Satz. Aussprache englischer Wörter " + ACCENT_WORD() + "."
        + (v.book ? " Der Begriff stammt aus „" + v.book + "“ – erkläre ihn so, wie dieser Autor ihn verwendet." : ""),
      userText: v.sentence ? v.word + "\n\nIm Satz: " + v.sentence : v.word,
      maxTokens: 500
    });
    const o = text && jsonFrom(text);
    if (!o) return false;
    if (o.word) v.word = String(o.word).trim();
    v.kind = o.kind === "term" ? "term" : "word";
    v.trans = String(o.trans || "").trim();
    v.type = String(o.type || "").trim();
    v.meaning = String(o.meaning || "").trim();
    v.example = String(o.example || "").trim();
    v.ipa = String(o.ipa || "").replace(/^\/|\/$/g, "").trim();
    v.say = String(o.say || "").trim();
    return true;
  }

  /* ---------- Aussprache (Stimme des Geräts) ---------- */
  const canSpeak = () => "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  function pickVoice(lang) {
    const voices = speechSynthesis.getVoices();
    const norm = s => String(s).replace("_", "-").toLowerCase();
    const exact = voices.filter(x => norm(x.lang) === lang.toLowerCase());
    const same = exact.length ? exact : voices.filter(x => norm(x.lang).startsWith(lang.slice(0, 2).toLowerCase()));
    return same.find(x => /premium|enhanced|erweitert|google|natural/i.test(x.name)) || same.find(x => x.localService) || same[0] || null;
  }
  if (canSpeak()) speechSynthesis.getVoices();
  let lastSpoken = { word: "", at: 0 };
  function speak(v, btn) {
    if (!canSpeak()) { toast("Dein Browser kann leider nicht vorlesen."); return; }
    const word = String(v.word || "").trim();
    if (!word) return;
    const slow = lastSpoken.word === word && Date.now() - lastSpoken.at < 4000;   // zweimal tippen = langsam
    lastSpoken = { word: slow ? "" : word, at: Date.now() };
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = v.kind === "term" ? "de-DE" : D.accent;
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
  const sayBtn = (big = false) => '<button type="button" class="say-btn no-swipe' + (big ? " big" : "") + '" aria-label="Vorlesen (zweimal tippen = langsam)">' + ico("speaker") + "</button>";

  /* ---------- Wörter anlegen ---------- */
  function newWord(word, extra = {}) {
    return Object.assign({
      id: TW.uid(), word, sentence: "", book: D.lastBook || "", kind: "word", trans: "", type: "", meaning: "", example: "",
      ipa: "", say: "", hits: 0, learned: false, due: today(), created: Date.now()
    }, extra);
  }
  async function addWord(word, extra = {}) {
    const v = newWord(word, extra);
    D.words.push(v);
    D.importAsked = true;
    save();
    if (!apiKey()) {
      render(); detail(v, true);
      toast("Kein API-Schlüssel in dieser App – trag die Übersetzung selbst ein oder hinterleg den Schlüssel unter ⋯ → Einstellungen.", { ms: 7000 });
      return;
    }
    v.busy = true;
    render();
    let problem = "";
    try { if (!(await lookup(v))) problem = "Claude hat keine brauchbare Antwort geliefert."; }
    catch (err) { problem = err.message; }
    finally { delete v.busy; save(); render(); }
    if (problem) toast("Nachschlagen ging nicht: " + problem, { ms: 10000, label: "Einstellungen", action: settings });
  }

  /* ---------- Seite fotografieren: Claude sucht die schweren Wörter ---------- */
  async function readPage(file) {
    if (!apiKey()) { toast("Dafür brauchst du deinen API-Schlüssel (⋯ → Einstellungen)."); return; }
    let loading = null;
    try {
      const dataUrl = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
      const [, mediaType, base64] = /^data:(.+);base64,(.*)$/.exec(dataUrl) || [];
      if (!base64) { toast("Das Bild konnte nicht gelesen werden."); return; }
      loading = sheet("<h2>Seite wird gelesen …</h2><p class=\"tw-hint\" style=\"margin-top:6px\">Claude sucht die schwierigen Wörter heraus.</p>");
      const known = D.words.map(v => v.word.toLowerCase());
      const text = await callClaude({
        system: "Du siehst das Foto einer Buchseite. Der Leser ist deutscher Muttersprachler. "
          + "Suche die 8 schwierigsten Wörter heraus – seltene englische Vokabeln oder deutsche Fachbegriffe, die ein normaler Leser vermutlich nicht kennt. Alltagswörter überspringst du. "
          + "Für jedes: kind \"word\" (fremdsprachig, übersetzen) oder \"term\" (deutscher Fachbegriff, erklären). "
          + "Antworte AUSSCHLIESSLICH mit JSON, ohne Code-Fences: "
          + '{"items":[{"word":"…","kind":"word"|"term","type":"<Wortart>","trans":"<Übersetzung bzw. kurze Umschreibung>","meaning":"<ein kurzer deutscher Satz>","example":"<Satz von der Seite, in dem es vorkommt>","ipa":"<Lautschrift in IPA, ohne Schrägstriche>","say":"<Lesehilfe mit deutschen Buchstaben, betonte Silbe in GROSSBUCHSTABEN>"}]}. '
          + "Aussprache englischer Wörter " + ACCENT_WORD() + ". Wenn du nichts Schwieriges findest, gib \"items\": [] zurück.",
        userText: "Welche Wörter dieser Seite könnten mir Probleme machen?" + (known.length ? "\nDiese kenne ich schon, lass sie weg: " + known.slice(-60).join(", ") : ""),
        image: { mediaType, data: base64 },
        maxTokens: 2000
      });
      loading.close(); loading = null;
      if (!text) return;
      const o = jsonFrom(text);
      const items = (o && Array.isArray(o.items) ? o.items : []).filter(x => x && x.word);
      if (!items.length) { toast("Auf der Seite habe ich nichts Schwieriges gefunden."); return; }
      pickFromPage(items);
    } catch (err) {
      if (loading) loading.close();
      toast("Das hat nicht geklappt: " + err.message);
    }
  }
  function pickFromPage(items) {
    const have = new Set(D.words.map(v => v.word.toLowerCase()));
    const sel = items.map(it => !have.has(String(it.word).toLowerCase()));
    const s = sheet("<h2>" + items.length + " Wörter gefunden</h2>"
      + '<p class="tw-hint" style="margin-top:6px">Tipp an, was du behalten willst' + (D.lastBook ? " · Buch: " + esc(splitTitle(D.lastBook).name) : "") + ".</p>"
      + '<ul class="tw-list pick">' + items.map((it, i) => '<li class="tw-row" data-i="' + i + '"><span class="tw-check' + (sel[i] ? " on" : "") + '">' + ico("check") + "</span>"
        + '<div class="tw-main"><div class="w-word" style="font-size:17px">' + esc(it.word) + "</div>"
        + '<div class="w-trans">' + (sel[i] ? esc(it.trans || "") : "schon gesammelt") + "</div></div></li>").join("") + "</ul>"
      + '<div class="actions"><button class="btn primary" id="pp-add">Übernehmen</button></div>');
    s.el.querySelectorAll("[data-i]").forEach(li => li.addEventListener("click", () => {
      const i = +li.dataset.i;
      sel[i] = !sel[i];
      li.querySelector(".tw-check").classList.toggle("on", sel[i]);
    }));
    s.el.querySelector("#pp-add").addEventListener("click", () => {
      let n = 0;
      items.forEach((it, i) => {
        if (!sel[i]) return;
        n++;
        D.words.push(newWord(String(it.word).trim(), {
          kind: it.kind === "term" ? "term" : "word", trans: String(it.trans || "").trim(), type: String(it.type || "").trim(),
          meaning: String(it.meaning || "").trim(), example: String(it.example || "").trim(),
          ipa: String(it.ipa || "").replace(/^\/|\/$/g, "").trim(), say: String(it.say || "").trim()
        }));
      });
      save(); s.close(); render();
      if (n) toast(n + (n === 1 ? " Wort" : " Wörter") + " übernommen");
    });
  }

  /* Lautschrift für ältere Wörter nachholen – ein Aufruf für viele Wörter */
  async function fillIpa(btn) {
    const missing = D.words.filter(v => !v.ipa).slice(0, 40);
    if (!missing.length) return;
    btn.disabled = true;
    btn.querySelector("span").textContent = "Claude holt die Lautschrift …";
    try {
      const text = await callClaude({
        system: "Du gibst für Wörter die Aussprache an – für einen deutschen Muttersprachler. Englische Wörter " + ACCENT_WORD() + ", deutsche Begriffe auf Deutsch. "
          + "Antworte AUSSCHLIESSLICH mit JSON, ohne Code-Fences: "
          + '{"items":[{"word":"<genau wie angefragt>","ipa":"<IPA ohne Schrägstriche>","say":"<Lesehilfe mit deutschen Buchstaben, Silben mit Bindestrich, betonte Silbe in GROSSBUCHSTABEN>"}]}',
        userText: missing.map(v => v.word).join("\n"),
        maxTokens: 2500
      });
      const o = text && jsonFrom(text);
      const items = o && Array.isArray(o.items) ? o.items : [];
      items.forEach(it => {
        const v = missing.find(x => x.word.toLowerCase() === String(it.word || "").toLowerCase());
        if (v) { v.ipa = String(it.ipa || "").replace(/^\/|\/$/g, "").trim(); v.say = String(it.say || "").trim(); }
      });
      save(); render();
      if (items.length) toast("Lautschrift für " + items.length + " Wörter ergänzt");
    } catch (err) {
      toast("Das hat nicht geklappt: " + err.message);
      render();
    }
  }

  /* ---------- Bücher: was du gerade liest und schon gelesen hast ---------- */
  const wordsOf = b => D.words.filter(v => v.book && same(v.book, b.title));
  const findBook = title => D.books.find(b => same(b.title, title) || same(splitTitle(b.title).name, title)) || null;
  const nextReading = except => (D.books.find(b => b.status === "lese" && b !== except) || {}).title || "";
  const dayMonth = s => { const d = TW.parse(s); return d.getDate() + ". " + TW.MON_S[d.getMonth()]; };
  function newBook(title) {
    return { id: TW.uid(), title, status: "lese", started: today(), finished: null, tier: "", desc: "", notes: "", eng: false, created: Date.now() };
  }
  /* Neues Buch: steht unter „Gerade“, neue Wörter landen dort. Claude ergänzt Schreibweise und Autor. */
  function addBook(title) {
    const b = newBook(String(title).trim());
    D.books.push(b);
    D.lastBook = b.title;
    save();
    enrichBook(b);
    return b;
  }
  /* Neue Wörter kommen aus diesem Buch – also liest du es gerade */
  function setCurrent(b) {
    if (b.status !== "lese") { b.status = "lese"; b.started = today(); b.finished = null; }
    D.lastBook = b.title;
    save();
  }
  /* Umbenennen: die Wörter wandern mit. Gibt es das Buch schon, werden beide zusammengeführt. */
  function renameBook(b, title) {
    title = String(title || "").trim();
    if (!title || title === b.title) return b;
    const other = D.books.find(x => x !== b && same(x.title, title));
    wordsOf(b).forEach(v => { v.book = other ? other.title : title; });
    if (same(D.lastBook, b.title)) D.lastBook = other ? other.title : title;
    if (!other) { b.title = title; return b; }
    if (!other.tier) other.tier = b.tier;
    if (!other.desc) other.desc = b.desc;
    if (b.notes && !other.notes.includes(b.notes)) other.notes = (other.notes ? other.notes + "\n" : "") + b.notes;
    D.books.splice(D.books.indexOf(b), 1);
    return other;
  }
  async function lookupBook(b) {
    const text = await callClaude({
      system: "Du bist ein sorgfältiger Bücher-Katalog. Der Nutzer tippt Titel oft falsch, unvollständig oder klein. "
        + "Erkenne das gemeinte Buch und korrigiere die Schreibweise. Behalte die Sprache des eingegebenen Titels bei "
        + "(ein englischer Originaltitel bleibt englisch, ein deutscher Titel deutsch). Hänge mit „ – “ den Autor an, z.B. „Dune – Frank Herbert“. "
        + "Antworte AUSSCHLIESSLICH mit JSON, ohne Code-Fences: "
        + '{"title":"<Titel> – <Autor>","desc":"<genau ein Satz auf Deutsch, höchstens 20 Wörter: worum es geht, ohne Spoiler>"}. '
        + 'Wenn du das Buch nicht sicher erkennst, gib den Titel unverändert zurück und desc als "".',
      userText: b.title,
      maxTokens: 300
    });
    const o = text && jsonFrom(text);
    if (!o || typeof o.title !== "string" || !o.title.trim()) return false;
    const kept = renameBook(b, o.title);
    if (typeof o.desc === "string" && o.desc.trim() && !kept.desc) kept.desc = o.desc.trim();
    return true;
  }
  async function enrichBook(b) {
    if (!apiKey()) return;
    b.busy = true;
    render();
    try { await lookupBook(b); } catch {}           // klappt es nicht, bleibt der Titel so, wie du ihn getippt hast
    delete b.busy;
    save(); render();
  }
  function removeBook(b) {
    const i = D.books.indexOf(b);
    if (i < 0) return;
    const tagged = wordsOf(b), wasCurrent = same(D.lastBook, b.title);
    D.books.splice(i, 1);
    tagged.forEach(v => { v.book = ""; });
    if (wasCurrent) D.lastBook = nextReading();
    save(); render();
    toast("„" + splitTitle(b.title).name + "“ gelöscht" + (tagged.length ? " – die Wörter bleiben" : ""), {
      action: () => {
        D.books.splice(Math.min(i, D.books.length), 0, b);
        tagged.forEach(v => { v.book = b.title; });
        if (wasCurrent) D.lastBook = b.title;
        save(); render();
      }
    });
  }
  const tierChips = cur => '<div class="tiers">' + TIERS.map(t => '<button class="chip' + (cur === t ? " on" : "") + '" data-tier="' + t + '">' + t + "</button>").join("") + "</div>";
  function wireTiers(root, b) {
    root.querySelectorAll("[data-tier]").forEach(x => x.addEventListener("click", () => {
      b.tier = b.tier === x.dataset.tier ? "" : x.dataset.tier;      // nochmal tippen = keine Wertung
      root.querySelectorAll("[data-tier]").forEach(y => y.classList.toggle("on", y.dataset.tier === b.tier));
      save();
    }));
  }

  /* Fertig gelesen: ein Tipp. Danach kurz Wertung und nächstes Buch – beides freiwillig. */
  function finishBook(b) {
    const before = { status: b.status, finished: b.finished, last: D.lastBook };
    b.status = "fertig";
    b.finished = today();
    if (same(D.lastBook, b.title)) D.lastBook = nextReading(b);
    save(); render();
    const y = b.finished.slice(0, 4);
    const nr = D.books.filter(x => x.status === "fertig" && (x.finished || "").startsWith(y)).length;
    const s = sheet("<h2>Fertig gelesen ✓</h2>"
      + '<p class="tw-hint" style="margin-top:6px">„' + esc(splitTitle(b.title).name) + "“ ist dein " + nr + ". Buch in " + y + ".</p>"
      + '<label class="f-label">Wie fandest du es?</label>' + tierChips(b.tier)
      + '<p class="tw-hint" style="margin-top:8px">S = Highlight · D = gar nicht · freiwillig</p>'
      + '<label class="f-label">Was liest du als Nächstes?</label>'
      + '<input class="f-input" id="fb-next" placeholder="Titel – Autor (freiwillig)" enterkeyhint="done">'
      + '<div class="actions"><button class="btn primary" id="fb-ok">Fertig</button></div>'
      + '<button class="tw-link" id="fb-undo" style="justify-content:center"><span>Doch noch nicht fertig</span></button>',
      { onClose: () => render() });
    wireTiers(s.el, b);
    const ok = () => {
      const next = s.el.querySelector("#fb-next").value.trim();
      if (next) { const have = findBook(next); if (have) setCurrent(have); else addBook(next); }
      s.close();
    };
    s.el.querySelector("#fb-ok").addEventListener("click", ok);
    s.el.querySelector("#fb-next").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); ok(); } });
    s.el.querySelector("#fb-undo").addEventListener("click", () => {
      b.status = before.status; b.finished = before.finished; D.lastBook = before.last;
      save(); s.close();
    });
  }

  /* Ein Buch: Titel, Status, Wertung, die Wörter daraus, Notizen */
  function bookSheet(b) {
    const ws = wordsOf(b).sort((x, y) => (y.created || 0) - (x.created || 0));
    const sits = ws.filter(v => v.learned).length;
    const current = same(D.lastBook, b.title);
    const title0 = b.title;
    const finLabel = () => (b.finished ? dayMonth(b.finished) + " " + b.finished.slice(0, 4) : "ohne Datum");
    const s = sheet('<input class="f-input f-big" id="bk-title" value="' + esc(b.title) + '" placeholder="Titel – Autor" aria-label="Titel und Autor" enterkeyhint="done">'
      + (b.desc ? '<p class="b-desc">' + esc(b.desc) + "</p>" : "")
      + '<label class="f-label">Status</label><div class="chips">'
      + [["lese", "Lese ich"], ["fertig", "Fertig"], ["abgebrochen", "Abgebrochen"]]
        .map(([k, l]) => '<button class="chip' + (b.status === k ? " on" : "") + '" data-st="' + k + '">' + l + "</button>").join("")
      + "</div>"
      + '<div class="f-row" id="bk-fin-row"' + (b.status === "fertig" ? "" : " hidden") + '><span class="k">Fertig gelesen</span>'
      + '<label class="chip date"><span id="bk-fin-l">' + finLabel() + '</span><input type="date" id="bk-fin" value="' + esc(b.finished || "") + '" aria-label="Fertig gelesen am"></label></div>'
      + '<label class="f-label">Wie fandest du es?</label>' + tierChips(b.tier)
      + '<p class="tw-hint" style="margin-top:8px">S = Highlight · D = gar nicht · nochmal tippen = keine Wertung</p>'
      + '<label class="f-label">Wörter aus diesem Buch' + (ws.length ? " · " + ws.length + (sits ? " · " + sits + " sitzen" : "") : "") + "</label>"
      + (ws.length
        ? '<ul class="b-words">' + ws.map((v, i) => '<li data-w="' + i + '"><span class="w">' + esc(v.word) + '</span><span class="t">' + esc(v.trans || "–") + "</span></li>").join("") + "</ul>"
        : '<p class="tw-hint">Noch keine.' + (current ? " Neue Wörter landen automatisch hier." : "") + "</p>")
      + (b.status === "lese" && !current ? '<button class="btn full" id="bk-cur" style="margin-top:14px">' + ico("plus") + "<span>Neue Wörter aus diesem Buch</span></button>" : "")
      + '<label class="f-label">Notizen</label><textarea class="f-area" id="bk-notes" placeholder="Gedanken, Zitate … (freiwillig)">' + esc(b.notes) + "</textarea>"
      + '<div class="stack"><button class="btn full danger" id="bk-del">' + ico("trash") + "<span>Löschen</span></button></div>",
      { onClose: () => {
        const t = s.el.querySelector("#bk-title").value.trim();
        if (t && t !== title0) renameBook(b, t);
        save(); render();
      } });
    s.el.querySelector("#bk-title").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } });
    s.el.querySelectorAll("[data-st]").forEach(x => x.addEventListener("click", () => {
      const st = x.dataset.st;
      if (st === b.status) return;
      b.status = st;
      if (st === "fertig") { if (!b.finished) b.finished = today(); }
      else b.finished = null;
      if (st === "lese") { if (!b.started) b.started = today(); }
      else if (same(D.lastBook, b.title)) D.lastBook = nextReading(b);
      s.el.querySelectorAll("[data-st]").forEach(y => y.classList.toggle("on", y === x));
      s.el.querySelector("#bk-fin-row").hidden = st !== "fertig";
      s.el.querySelector("#bk-fin").value = b.finished || "";
      s.el.querySelector("#bk-fin-l").textContent = finLabel();
      save();
    }));
    const fin = s.el.querySelector("#bk-fin");
    fin.addEventListener("change", () => { b.finished = isoDate(fin.value); s.el.querySelector("#bk-fin-l").textContent = finLabel(); save(); });
    wireTiers(s.el, b);
    s.el.querySelectorAll("[data-w]").forEach(li => li.addEventListener("click", () => { s.close(); setTimeout(() => detail(ws[+li.dataset.w]), 60); }));
    const cur = s.el.querySelector("#bk-cur");
    if (cur) cur.addEventListener("click", () => { setCurrent(b); s.close(); toast("Neue Wörter landen jetzt in „" + splitTitle(b.title).name + "“"); });
    s.el.querySelector("#bk-notes").addEventListener("input", e => { b.notes = e.target.value; save(); });
    s.el.querySelector("#bk-del").addEventListener("click", () => { s.close(); removeBook(b); });
  }

  /* Übersicht: gerade · gelesen nach Jahr · früher gelesen · nicht zu Ende */
  function renderBooks() {
    const y = today().slice(0, 4);
    const byNew = (a, b) => (b.created || 0) - (a.created || 0);
    const reading = D.books.filter(b => b.status === "lese").sort((a, b) => (b.started || "").localeCompare(a.started || "") || byNew(a, b));
    const fin = D.books.filter(b => b.status === "fertig");
    const dated = fin.filter(b => b.finished).sort((a, b) => b.finished.localeCompare(a.finished) || byNew(a, b));
    const undated = fin.filter(b => !b.finished).sort(byNew);
    const stopped = D.books.filter(b => b.status === "abgebrochen").sort(byNew);
    const nYear = dated.filter(b => b.finished.startsWith(y)).length;
    $("sub").textContent = nYear ? y + ": " + nYear + " gelesen · insgesamt " + fin.length
      : fin.length ? fin.length + (fin.length === 1 ? " Buch" : " Bücher") + " gelesen"
      : reading.length ? "Du liest gerade " + (reading.length === 1 ? "ein Buch" : reading.length + " Bücher")
      : "Was du liest – und die Wörter daraus";
    const box = $("b-list");
    box.innerHTML = "";
    if (!D.books.length) {
      box.innerHTML = '<div class="tw-empty"><b>Noch keine Bücher.</b>Tipp oben ein, was du gerade liest. Wörter, die du dann sammelst, landen automatisch dort.</div>';
      return;
    }
    const groups = [];
    if (reading.length) groups.push(["Gerade", reading]);
    [...new Set(dated.map(b => b.finished.slice(0, 4)))].forEach(yr => {
      const list = dated.filter(b => b.finished.startsWith(yr));
      groups.push([yr + " · " + list.length + (list.length === 1 ? " Buch" : " Bücher"), list]);
    });
    if (undated.length) groups.push(["Früher gelesen · " + undated.length, undated]);
    if (stopped.length) groups.push(["Nicht zu Ende · " + stopped.length, stopped]);
    groups.forEach(([title, list]) => {
      box.insertAdjacentHTML("beforeend", '<div class="tw-section">' + esc(title) + "</div>");
      const ul = document.createElement("ul");
      ul.className = "tw-list";
      list.forEach(b => ul.appendChild(bookRow(b)));
      box.appendChild(ul);
    });
  }
  function bookRow(b) {
    const { name, author } = splitTitle(b.title);
    const n = wordsOf(b).length;
    const reading = b.status === "lese";
    const when = reading ? (b.started ? "seit " + dayMonth(b.started) : "")
      : b.status === "fertig" && b.finished ? TW.MON[TW.parse(b.finished).getMonth()] : "";
    const meta = b.busy ? "Claude ergänzt den Autor …" : [author, when, n ? n + (n === 1 ? " Wort" : " Wörter") : ""].filter(Boolean).join(" · ");
    const li = document.createElement("li");
    li.className = "tw-swipe-wrap";
    li.innerHTML = '<div class="tw-row">'
      + (reading ? '<button class="tw-check no-swipe" aria-label="Fertig gelesen">' + ico("check") + "</button>" : "")
      + '<div class="tw-main"><div class="tw-text">' + esc(name) + "</div>" + (meta ? '<div class="tw-meta">' + esc(meta) + "</div>" : "") + "</div>"
      + (b.tier ? '<span class="tier' + (b.tier === "S" ? " top" : "") + '" title="Deine Wertung">' + b.tier + "</span>" : "")
      + "</div>";
    const row = li.querySelector(".tw-row");
    li.querySelector(".tw-main").addEventListener("click", () => bookSheet(b));
    if (reading) {
      const c = li.querySelector(".tw-check");
      c.addEventListener("click", () => { c.classList.add("on"); setTimeout(() => finishBook(b), 180); });
    }
    swipeRow(li, row, reading
      ? { right: () => finishBook(b), rightLabel: "Fertig gelesen", left: () => removeBook(b) }
      : { left: () => removeBook(b) });
    return li;
  }

  /* ---------- Darstellung ---------- */
  function render() {
    document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === view));
    $("title").textContent = view === "buecher" ? "Bücher" : "Vokabeln";
    $("v-words").hidden = view === "buecher";
    $("v-books").hidden = view !== "buecher";
    if (view === "buecher") { renderBooks(); return; }
    const t = today();
    const all = D.words;
    const dueNow = due();
    const learned = all.filter(v => v.learned).length;
    $("sub").textContent = all.length
      ? (dueNow.length ? dueNow.length + " fällig · " : "") + learned + " sitzen · " + all.length + " Wörter"
      : "Wörter aus dem Lesen behalten";

    /* Üben */
    const top = $("top");
    if (dueNow.length) {
      top.innerHTML = '<button class="btn primary full practice" id="practice">' + ico("play") + "<span>Üben · " + dueNow.length + "</span></button>";
      $("practice").addEventListener("click", () => quiz(due()));
    } else if (all.length) {
      const next = all.map(v => v.due).filter(Boolean).sort()[0];
      top.innerHTML = '<div class="tw-card all-done"><div class="q">Heute alles geübt ✓</div>'
        + (next ? '<div class="tw-hint">Nächste Runde ' + TW.relDay(next) + "</div>" : "") + "</div>";
    } else top.innerHTML = "";
    if (all.length) {
      const days = Object.keys(D.log).filter(d => d > addDays(t, -7) && d <= t).length;
      top.insertAdjacentHTML("beforeend", '<div class="pdots">' + TW.dots(d => !!D.log[d]) + "<span>geübt an " + days + " von 7 Tagen</span></div>");
    }

    /* Buch, in das neue Wörter kommen */
    $("book-line").innerHTML = '<span>Buch:</span><b>' + esc(D.lastBook ? splitTitle(D.lastBook).name : "keins") + '</b><button class="chip" id="book-btn" style="padding:3px 10px;font-size:13px">ändern</button>';
    $("book-btn").addEventListener("click", chooseBook);

    /* Hinweise */
    const notes = $("notes");
    notes.innerHTML = "";
    if (booted.source === "none" && !all.length && !D.importAsked) {
      notes.innerHTML = '<div class="tw-card"><div class="q">Schon Vokabeln im alten Tagwerk?</div>'
        + '<div class="tw-hint">Dort auf der Startseite „Daten kopieren“ tippen, dann hier „Übernehmen“ – mit Lernstand.</div>'
        + '<div class="row"><button class="btn small primary" id="n-imp">Übernehmen</button><button class="btn small" id="n-new">Neu anfangen</button></div></div>';
      $("n-imp").addEventListener("click", () => openImport(true));
      $("n-new").addEventListener("click", () => { D.importAsked = true; save(); render(); });
    } else if (!apiKey() && !D.keyHintSeen) {
      notes.innerHTML = '<div class="tw-card"><div class="q">Tipp: Mit Claude schlägst du Wörter automatisch nach</div>'
        + '<div class="tw-hint">Übersetzung, Lautschrift, Beispielsatz – und Seiten fotografieren. Dafür unter ⋯ → Einstellungen deinen API-Schlüssel eintragen. Ohne geht es auch: dann tippst du die Übersetzung selbst.</div>'
        + '<div class="row"><button class="btn small" id="n-ok">Verstanden</button></div></div>';
      $("n-ok").addEventListener("click", () => { D.keyHintSeen = true; save(); render(); });
    }
    const noIpa = all.filter(v => !v.ipa).length;
    if (noIpa && apiKey() && all.length) {
      notes.insertAdjacentHTML("beforeend", '<button class="tw-link" id="ipa-fill"><span>Lautschrift für ' + Math.min(noIpa, 40) + " Wörter nachholen</span><span>›</span></button>");
      $("ipa-fill").addEventListener("click", e => fillIpa(e.currentTarget));
    }

    /* Filter: Bücher und Suche – nur wenn es sich lohnt */
    const bs = wordBooks();
    const fl = $("filters");
    fl.innerHTML = "";
    if (bs.length > 1) {
      fl.innerHTML = '<div class="filters">' + [["", "Alle"]].concat(bs.map(b => { const n = splitTitle(b).name; return [b, n.length > 24 ? n.slice(0, 23) + "…" : n]; }))
        .map(([k, l]) => '<button class="chip' + (filter === k ? " on" : "") + '" data-f="' + esc(k) + '">' + esc(l) + "</button>").join("") + "</div>";
      fl.querySelectorAll("[data-f]").forEach(b => b.addEventListener("click", () => { filter = b.dataset.f; render(); }));
    }
    if (all.length > 25) {
      fl.insertAdjacentHTML("beforeend", '<input class="f-input" id="search" type="search" placeholder="Suchen …" value="' + esc(search) + '" style="margin-top:12px">');
      $("search").addEventListener("input", e => { search = e.target.value; renderList(); });
    }
    renderList();
  }
  function renderList() {
    const t = today();
    const list = $("list");
    list.innerHTML = "";
    const q = search.trim().toLowerCase();
    let words = D.words.filter(v => (!filter || v.book === filter) && (!q || v.word.toLowerCase().includes(q) || String(v.trans || "").toLowerCase().includes(q)));
    words = words.slice().sort((a, b) => (b.created || 0) - (a.created || 0));
    if (!D.words.length) {
      list.innerHTML = '<div class="tw-empty"><b>Noch keine Wörter.</b>Beim Lesen ein unbekanntes Wort oben eintippen – oder die Seite fotografieren.</div>';
      return;
    }
    words.forEach(v => {
      const li = document.createElement("li");
      li.className = "tw-swipe-wrap";
      const ripe = !!v.due && v.due <= t;
      li.innerHTML = '<div class="tw-row"><div class="tw-main">'
        + '<div class="w-word">' + esc(v.word) + (v.ipa ? '<span class="w-ipa">/' + esc(v.ipa) + "/</span>" : "") + "</div>"
        + '<div class="w-trans">' + (v.busy ? "Claude schlägt nach …" : esc(v.trans || "–")) + "</div></div>"
        + (canSpeak() ? sayBtn() : "")
        + '<span class="badge' + (v.learned ? " done" : ripe ? " ripe" : "") + '" title="' + esc(stage(v)) + '">' + badge(v) + "</span></div>";
      const row = li.querySelector(".tw-row");
      li.querySelector(".tw-main").addEventListener("click", () => detail(v));
      const sb = li.querySelector(".say-btn");
      if (sb) sb.addEventListener("click", e => { e.stopPropagation(); speak(v, sb); });
      swipeRow(li, row, { left: () => removeWord(v) });
      list.appendChild(li);
    });
  }
  function removeWord(v) {
    const i = D.words.indexOf(v);
    if (i < 0) return;
    D.words.splice(i, 1);
    save(); render();
    toast("„" + v.word + "“ gelöscht", { action: () => { D.words.splice(Math.min(i, D.words.length), 0, v); save(); render(); } });
  }

  /* ---------- Buch wählen ---------- */
  function chooseBook() {
    const opts = D.books.filter(b => b.status === "lese" || same(b.title, D.lastBook));
    const s = sheet("<h2>Aus welchem Buch?</h2>"
      + '<p class="tw-hint" style="margin-top:6px">Neue Wörter bekommen dieses Buch. Claude erklärt sie dann so, wie der Autor sie meint.</p>'
      + '<div class="chips" style="margin-top:14px">' + opts.map((b, i) => '<button class="chip' + (same(D.lastBook, b.title) ? " on" : "") + '" data-i="' + i + '">' + esc(splitTitle(b.title).name) + "</button>").join("")
      + '<button class="chip' + (!D.lastBook ? " on" : "") + '" data-i="-1">Kein Buch</button></div>'
      + '<label class="f-label">Neues Buch</label><input class="f-input" id="b-new" placeholder="Titel – Autor" enterkeyhint="done">'
      + '<div class="actions"><button class="btn primary" id="b-ok">Fertig</button></div>');
    s.el.querySelectorAll("[data-i]").forEach(x => x.addEventListener("click", () => {
      const i = +x.dataset.i;
      if (i < 0) { D.lastBook = ""; save(); } else setCurrent(opts[i]);
      s.close(); render();
    }));
    const take = () => {
      const v = s.el.querySelector("#b-new").value.trim();
      if (v) { const have = findBook(v); if (have) setCurrent(have); else addBook(v); }
      s.close(); render();
    };
    s.el.querySelector("#b-ok").addEventListener("click", take);
    s.el.querySelector("#b-new").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); take(); } });
  }

  /* ---------- Detail ---------- */
  function detail(v, editing = false) {
    const t = today();
    if (editing) {
      const s = sheet("<h2>" + esc(v.word) + "</h2>"
        + '<label class="f-label">Wort</label><input class="f-input" id="d-word" value="' + esc(v.word) + '" autocapitalize="none" spellcheck="false">'
        + '<label class="f-label">Übersetzung</label><input class="f-input" id="d-trans" value="' + esc(v.trans) + '" placeholder="z.B. widerwillig, zögernd">'
        + '<label class="f-label">Satz aus dem Buch (optional)</label><textarea class="f-area" id="d-sent" placeholder="„She was reluctant to leave.“">' + esc(v.sentence || "") + "</textarea>"
        + '<label class="f-label">Buch</label><input class="f-input" id="d-book" value="' + esc(v.book || "") + '" placeholder="Titel – Autor">'
        + '<div class="actions">' + (apiKey() ? '<button class="btn" id="d-look">' + ico("wand") + "<span>Nachschlagen</span></button>" : "")
        + '<button class="btn primary" id="d-ok">Fertig</button></div>', { onClose: () => render() });
      const apply = () => {
        const w = s.el.querySelector("#d-word").value.trim();
        if (w) v.word = w;
        v.trans = s.el.querySelector("#d-trans").value.trim();
        v.sentence = s.el.querySelector("#d-sent").value.trim();
        v.book = s.el.querySelector("#d-book").value.trim();
        if (v.book) { const have = findBook(v.book); if (have) v.book = have.title; else D.books.push(newBook(v.book)); }
        save();
      };
      s.el.querySelector("#d-ok").addEventListener("click", () => { apply(); s.close(); });
      const lk = s.el.querySelector("#d-look");
      if (lk) lk.addEventListener("click", async () => {
        apply();
        lk.disabled = true; lk.querySelector("span").textContent = "Claude schlägt nach …";
        try { if (await lookup(v)) { save(); s.close(); detail(v); return; } }
        catch (err) { toast("Das hat nicht geklappt: " + err.message); }
        lk.disabled = false; lk.querySelector("span").textContent = "Nachschlagen";
      });
      if (!v.trans) setTimeout(() => s.el.querySelector("#d-trans").focus(), 350);
      return;
    }
    const s = sheet("<h2>" + esc(v.word) + (v.kind === "term" ? '<span class="k-tag">Fachbegriff</span>' : "") + "</h2>"
      + (v.type || v.book ? '<p class="tw-hint" style="margin-top:4px">' + esc([v.type, v.book].filter(Boolean).join(" · ")) + "</p>" : "")
      + '<label class="f-label">' + (v.kind === "term" ? "Kurz gesagt" : "Übersetzung") + "</label>"
      + '<div class="answer' + (v.trans ? "" : " blank") + '">' + (v.trans ? esc(v.trans) : "Noch keine Übersetzung.") + "</div>"
      + '<label class="f-label">Aussprache</label><div class="say-row">' + (canSpeak() ? sayBtn(true) : "") + "<div>"
      + (v.ipa ? '<div class="say-ipa">/' + esc(v.ipa) + "/</div>" : "")
      + (v.say ? '<div class="say-de">sprich: ' + esc(v.say) + "</div>" : "")
      + (!v.ipa && !v.say ? '<div class="say-de">Antippen zum Anhören · zweimal = langsam</div>' : "") + "</div></div>"
      + (v.meaning ? '<label class="f-label">Bedeutung</label><div class="answer">' + esc(v.meaning) + "</div>" : "")
      + (v.example ? '<label class="f-label">Beispiel</label><div class="answer" style="font-style:italic">' + esc(v.example) + "</div>" : "")
      + (v.sentence ? '<label class="f-label">Dein Satz</label><div class="answer" style="font-style:italic">' + esc(v.sentence) + "</div>" : "")
      + '<label class="f-label">Lernstand</label>'
      + '<div class="f-row"><span class="k">' + steps(v) + '</span><span class="v">' + esc(stage(v)) + "</span></div>"
      + '<div class="f-row"><span class="k">' + (v.learned ? "Auffrischung" : "Nächste Abfrage") + '</span><span class="v">' + (!v.due ? "keine mehr" : v.due <= t ? "jetzt fällig" : shortDate(v.due)) + "</span></div>"
      + '<div class="stack">'
      + '<button class="btn full" id="d-edit">' + ico("more") + "<span>Bearbeiten</span></button>"
      + (apiKey() ? '<button class="btn full" id="d-again">' + ico("wand") + "<span>" + (v.trans ? "Neu nachschlagen" : "Jetzt nachschlagen") + "</span></button>" : "")
      + (v.learned ? '<button class="btn full" id="d-relearn">' + ico("repeat") + "<span>Doch nochmal lernen</span></button>" : "")
      + '<button class="btn full danger" id="d-del">' + ico("trash") + "<span>Löschen</span></button></div>", { onClose: () => render() });
    const dsb = s.el.querySelector(".say-row .say-btn");
    if (dsb) dsb.addEventListener("click", () => speak(v, dsb));
    s.el.querySelector("#d-edit").addEventListener("click", () => { s.close(); setTimeout(() => detail(v, true), 50); });
    const again = s.el.querySelector("#d-again");
    if (again) again.addEventListener("click", async () => {
      again.disabled = true; again.querySelector("span").textContent = "Claude schlägt nach …";
      try { if (await lookup(v)) { save(); s.close(); detail(v); return; } }
      catch (err) { toast("Das hat nicht geklappt: " + err.message); }
      again.disabled = false; again.querySelector("span").textContent = "Neu nachschlagen";
    });
    const rl = s.el.querySelector("#d-relearn");
    if (rl) rl.addEventListener("click", () => {
      v.learned = false; v.hits = 0; v.due = today(); delete v.learnedAt; delete v.refresh;
      save(); s.close(); setTimeout(() => detail(v), 50);
    });
    s.el.querySelector("#d-del").addEventListener("click", () => { s.close(); removeWord(v); });
  }

  /* ---------- Abfrage ---------- */
  /* Abschreiben prüfen: Groß/klein, Satzzeichen, Klammern, „to …“ egal; eine von mehreren Übersetzungen reicht;
     ein Tippfehler bei längeren Wörtern geht durch. */
  const normWord = s => String(s).toLowerCase().normalize("NFC").replace(/[’`´]/g, "'").replace(/[.,!?;:"“”„()]/g, " ")
    .replace(/^\s*to\s+/, "").replace(/\s+/g, " ").trim();
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
    return variants.some(x => { const b = normWord(x); return b && (a === b || (b.length >= 5 && editDistance(a, b) <= 1)); });
  }

  function quiz(words) {
    const queue = [...words].sort(() => Math.random() - 0.5);   // jedes fällige Wort genau einmal
    const total = queue.length;
    let done = 0, right = 0, learnedNow = 0;
    const el = document.createElement("div");
    el.className = "overlay";
    el.innerHTML = '<div class="ov-top"><span class="count" id="q-count"></span><button class="tw-icon-btn" id="q-close" aria-label="Schließen">' + ico("x") + "</button></div>"
      + '<div class="bar"><span id="q-bar" style="width:0%"></span></div>'
      + '<div class="ov-mid"><div id="q-steps"></div><div class="quiz-w" id="q-word"></div><div class="quiz-src" id="q-src"></div>'
      + '<div id="q-say"></div><div class="quiz-a" id="q-answer"></div></div>'
      + '<div class="ov-btns" id="q-btns"></div>';
    TW.hideToast();
    document.body.appendChild(el);
    const Q = id => el.querySelector("#" + id);
    const close = () => { if (canSpeak()) speechSynthesis.cancel(); el.remove(); render(); };
    Q("q-close").addEventListener("click", close);

    const show = () => {
      if (!queue.length) { finish(); return; }
      const v = queue[0];
      el.classList.remove("open");
      Q("q-count").textContent = done + " von " + total;
      Q("q-bar").style.width = (total ? done / total * 100 : 0) + "%";
      const rev = askReverse(v);
      const front = rev ? (v.trans || v.meaning || v.word) : v.word;
      const back = rev ? v.word : (v.trans || v.meaning || "–");
      Q("q-steps").innerHTML = steps(v);
      Q("q-word").textContent = front;
      Q("q-word").style.fontSize = front.length > 22 ? "28px" : "";
      const askEn = v.kind === "term" ? "Wie heißt der Begriff?" : "Wie heißt es auf Englisch?";
      Q("q-src").textContent = v.learned
        ? "Auffrischung " + (v.refresh + 1) + " von " + REFRESH.length + " · " + (rev ? askEn : "Weißt du's noch?")
        : rev ? "Letzter Schritt: " + askEn : splitTitle(v.book).name;
      const speakable = canSpeak();
      Q("q-say").innerHTML = speakable && !rev ? sayBtn(true) : "";   // andersrum erst nach dem Aufdecken
      Q("q-answer").innerHTML = '<div class="quiz-t">' + esc(back) + "</div>"
        + (v.ipa ? '<div class="quiz-ipa">/' + esc(v.ipa) + "/" + (v.say ? " · " + esc(v.say) : "") + "</div>" : "")
        + (speakable && rev ? '<div style="margin-top:12px">' + sayBtn(true) + "</div>" : "")
        + (v.meaning && !rev ? '<div class="quiz-m">' + esc(v.meaning) + "</div>" : "")
        + (v.example ? '<div class="quiz-e">„' + esc(v.example) + "“</div>" : "");
      el.querySelectorAll("#q-say .say-btn, #q-answer .say-btn").forEach(b => b.addEventListener("click", () => speak(v, b)));
      Q("q-btns").innerHTML = '<button class="btn primary" id="q-reveal">Aufdecken</button>';
      Q("q-reveal").addEventListener("click", () => {
        el.classList.add("open");
        if (speakable && D.speak) speak(v, el.querySelector("#q-say .say-btn, #q-answer .say-btn"));
        Q("q-btns").innerHTML = '<button class="btn" id="q-wrong" style="color:var(--danger)">Falsch</button><button class="btn primary" id="q-right" style="background:var(--ok);color:#fff">Richtig</button>';
        Q("q-wrong").addEventListener("click", () => gradeNow(false));
        Q("q-right").addEventListener("click", () => gradeNow(true));
      });
    };
    const next = () => { queue.shift(); done++; show(); };
    const gradeNow = ok => {
      const v = queue[0];
      const rev = askReverse(v);
      const wasLearned = v.learned;
      grade(v, ok);
      practiced();
      save();                                         // sofort – auch wenn du danach abbrichst
      if (ok) {
        right++;
        if (!wasLearned && v.learned) { learnedNow++; toast("„" + v.word + "“ sitzt jetzt!"); }
        next();
      } else copy(v, rev);
    };

    /* Falsch → Abschreiben, Abdecken, Vergleichen */
    const copy = (v, rev) => {
      const answer = rev ? v.word : (v.trans || v.meaning || "");
      if (!answer.trim()) { next(); return; }
      let copies = 0, peek = false;
      const dots = () => Array.from({ length: COPIES }, (_, k) => '<i class="' + (k < copies ? "on" : "") + '"></i>').join("");
      Q("q-steps").innerHTML = steps(v);
      Q("q-say").innerHTML = "";
      Q("q-answer").innerHTML = '<div class="copy-box" id="q-box"><div class="quiz-t copy-answer">' + esc(answer) + "</div>"
        + (rev && v.ipa ? '<div class="quiz-ipa">/' + esc(v.ipa) + "/" + (v.say ? " · " + esc(v.say) : "") + "</div>" : "")
        + (rev && canSpeak() ? '<div style="margin-top:10px">' + sayBtn() + "</div>" : "")
        + '<div class="copy-cover">verdeckt</div></div>'
        + '<input type="text" class="quiz-input" id="q-input" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="done">'
        + '<div class="copy-dots" id="q-dots"></div><div class="copy-hint" id="q-hint"></div>';
      el.classList.add("open");
      const box = Q("q-box"), input = Q("q-input"), hint = Q("q-hint");
      const sb = box.querySelector(".say-btn");
      if (sb) sb.addEventListener("click", () => speak(v, sb));
      const paint = () => {
        const fromMemory = copies > 0;
        box.classList.toggle("covered", fromMemory && !peek);
        Q("q-src").textContent = fromMemory ? "Jetzt aus dem Kopf" : "Falsch – schreib die Lösung ab";
        input.placeholder = (fromMemory ? "Aus dem Kopf" : "Abschreiben") + " (" + (copies + 1) + " von " + COPIES + ")";
        Q("q-dots").innerHTML = dots();
      };
      paint();
      Q("q-btns").innerHTML = '<button class="btn primary" id="q-ok">OK</button>';
      setTimeout(() => input.focus(), 50);
      const compare = text => { peek = true; paint(); hint.textContent = text; };
      const check = () => {
        if (copies >= COPIES) return;
        const fromMemory = copies > 0;
        if (!input.value.trim()) {
          if (fromMemory) compare("So heißt es. Präg es dir ein – beim Tippen wird es wieder verdeckt.");
          input.focus();
          return;
        }
        if (!copyMatches(input.value, answer)) {
          input.classList.remove("bad"); void input.offsetWidth; input.classList.add("bad");
          if (fromMemory) compare("Nicht ganz – vergleiche. Beim Tippen wird es wieder verdeckt.");
          else hint.textContent = "Nicht ganz – schau genau hin.";
          input.select();
          return;
        }
        copies++;
        peek = false;
        input.classList.remove("bad");
        input.value = "";
        if (copies < COPIES) {
          hint.textContent = copies === 1 ? "Gut. Jetzt ist es verdeckt – schreib es aus dem Kopf." : "";
          paint(); input.focus();
          return;
        }
        Q("q-dots").innerHTML = dots();
        box.classList.remove("covered");
        hint.textContent = "Eingeprägt. Morgen kommt es wieder.";
        input.disabled = true;
        Q("q-ok").disabled = true;
        setTimeout(next, 800);
      };
      input.addEventListener("input", () => { if (peek) { peek = false; paint(); } });
      Q("q-ok").addEventListener("click", check);
      input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); check(); } });
    };

    const finish = () => {
      el.classList.remove("open");
      Q("q-count").textContent = "fertig";
      Q("q-bar").style.width = "100%";
      const wrong = total - right;
      el.querySelector(".ov-mid").innerHTML = '<div class="qd-big">' + right + " von " + total + "</div>"
        + '<div class="quiz-m">' + (wrong === 0 ? "Alles gewusst. Stark." : wrong + (wrong === 1 ? " Wort kommt" : " Wörter kommen") + " morgen wieder.") + "</div>"
        + (learnedNow ? '<div class="quiz-m" style="color:var(--ok);font-weight:700">' + learnedNow + (learnedNow === 1 ? " Wort sitzt" : " Wörter sitzen") + " jetzt.</div>" : "");
      Q("q-btns").innerHTML = '<button class="btn primary" id="q-fin">Fertig</button>';
      Q("q-fin").addEventListener("click", close);
    };
    show();
  }

  /* ---------- Einstellungen & Menü ---------- */
  function settings() {
    const s = sheet("<h2>Einstellungen</h2>"
      + '<label class="f-label">Claude-API-Schlüssel</label><input class="f-input" type="password" id="s-key" placeholder="sk-ant-…" value="' + esc(apiKey()) + '" autocomplete="off">'
      + '<div class="actions" style="margin-top:10px"><button class="btn" id="s-test">Schlüssel testen</button></div>'
      + '<p class="tw-hint" id="s-test-r" style="margin-top:8px"></p>'
      + '<p class="tw-hint" style="margin-top:8px">Bleibt auf diesem Gerät und geht nur direkt an Anthropic. Kosten bisher: $' + D.usage.cost.toFixed(4) + "</p>"
      + '<label class="f-label">Aussprache</label><div class="chips" id="s-acc">'
      + [["en-GB", "Britisch"], ["en-US", "Amerikanisch"]].map(([k, l]) => '<button class="chip' + (D.accent === k ? " on" : "") + '" data-acc="' + k + '">' + l + "</button>").join("") + "</div>"
      + '<div class="f-row" style="margin-top:10px"><span class="k">Beim Aufdecken vorlesen</span><label class="switch"><input type="checkbox" id="s-speak"' + (D.speak ? " checked" : "") + "><span></span></label></div>"
      + '<p class="tw-hint">' + (canSpeak() ? "iPhone: Unter Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Englisch eine „Erweitert“-Stimme laden – klingt deutlich natürlicher." : "Dieser Browser kann leider nicht vorlesen.") + "</p>"
      + '<label class="f-label">Hell oder dunkel</label>' + TW.themeChipsHtml(), { onClose: () => render() });
    const storeKey = () => {
      const v = s.el.querySelector("#s-key").value.replace(/\s+/g, "");      // Leerzeichen/Zeilenumbruch vom Einfügen weg
      try { if (v) localStorage.setItem(TW.API_KEY, v); else localStorage.removeItem(TW.API_KEY); } catch {}
    };
    s.el.querySelector("#s-key").addEventListener("change", storeKey);
    s.el.querySelector("#s-test").addEventListener("click", async e => {
      storeKey();
      const out = s.el.querySelector("#s-test-r"), btn = e.currentTarget;
      if (!apiKey()) { out.textContent = "✗ Kein Schlüssel eingetragen."; return; }
      btn.disabled = true; out.textContent = "Teste …";
      try {
        await callClaude({ system: "Antworte nur mit OK.", userText: "Test", maxTokens: 5 });
        out.textContent = "✓ Der Schlüssel funktioniert. Nachschlagen sollte klappen.";
      } catch (err) { out.textContent = "✗ " + err.message; }
      btn.disabled = false;
    });
    s.el.querySelectorAll("[data-acc]").forEach(b => b.addEventListener("click", () => {
      D.accent = b.dataset.acc; save();
      s.el.querySelectorAll("[data-acc]").forEach(x => x.classList.toggle("on", x === b));
      speak(D.words.length ? D.words[D.words.length - 1] : { word: "pronunciation", kind: "word" });
    }));
    s.el.querySelector("#s-speak").addEventListener("change", e => { D.speak = e.target.checked; save(); });
    TW.wireThemeChips(s.el);
  }
  function openImport(quick) {
    (quick === true ? TW.quickImport : TW.importSheet)({
      key: KEY, fromLegacy, hasData: D.words.length > 0,
      onData: data => {
        D = normalize(data); D.importAsked = true; save(); render();
        toast(apiKey() ? "Vokabeln übernommen" : "Vokabeln übernommen. Fürs automatische Nachschlagen: ⋯ → Einstellungen → API-Schlüssel.", { ms: 6000 });
      }
    });
  }
  const WHY = [
    { t: "Abfragen statt nur lesen", d: "Wer Wörter weiter abfragt, nachdem er sie einmal wusste, behält viel mehr als jemand, der sie nur nochmal ansieht.", src: "Karpicke & Roediger 2008 (Science)", url: "https://pubmed.ncbi.nlm.nih.gov/18276894/" },
    { t: "3× in Folge, über Tage verteilt", d: "Empfehlung aus der Forschung: 3× richtig erinnern, dann mit Abständen wiederholen. Verteilt lernt man weit besser als auf einmal.", src: "Rawson & Dunlosky 2011; Kornell 2009" },
    { t: "Jedes Wort einmal pro Runde", d: "Mehr Wiederholungen am selben Tag bringen kaum etwas, wenn das Wort an späteren Tagen wiederkommt.", src: "Rawson & Dunlosky 2011 („Relearning Override“)" },
    { t: "Wachsende Abstände 1 · 3 · 7 Tage", d: "Ganz leicht besser als gleiche Abstände.", src: "Nakata 2015" },
    { t: "Zum Schluss andersrum", d: "Deutsch → Englisch ist schwerer, baut aber mehr Wissen auf (Schreibweise, aktiver Gebrauch).", src: "Webb 2009; Terai u.a. 2021" },
    { t: "Bei Falsch: Lösung zeigen, abschreiben, aus dem Kopf", d: "Die Lösung nach einem Fehler ist die wichtigste Rückmeldung. Tippen prägt mehr ein als Lesen – aus dem Kopf am meisten.", src: "Pashler u.a. 2005; Forrin u.a. 2012; Karpicke & Roediger 2008" },
    { t: "Auffrischung nach 1 und 3 Monaten", d: "Lange Abstände führen zu Wissen, das Jahre hält.", src: "Bahrick u.a. 1993; Cepeda u.a. 2008" },
    { t: "Lesen + gezielt üben", d: "Nur durch Lesen lernt man wenige Wörter; mit gezielten Übungen deutlich mehr. Erwachsene profitieren vom Lesen am meisten.", src: "Laufer 2003; Jeon & Day 2016" },
    { t: "Sehen, was du gelesen hast", d: "Wer seinen Fortschritt festhält, erreicht seine Ziele eher – vor allem, wenn er ihn aufschreibt und sehen kann. Darum die Bücherliste: ein Tipp, wenn ein Buch fertig ist. Seiten zählst du nicht.", src: "Harkin u.a. 2016 (Psychological Bulletin)" }
  ];
  $("menu").innerHTML = ico("more");
  $("menu").addEventListener("click", () => menu("Vokabeln", [
    { label: "Warum ist die App so?", icon: "info", act: () => TW.why("Warum so?", WHY) },
    { label: "Einstellungen", icon: "more", act: settings },
    { label: "Tägliche Erinnerung (Kalender)", icon: "cal", act: () => TW.calendarSheet({ title: "Vokabeln üben", repeat: "daily", defaultTime: "19:00", intro: "Ein täglicher Termin für deine Runde. Kürzer als 5 Minuten." }) },
    { label: "Sicherung als Datei", icon: "download", act: () => { TW.download("vokabeln-" + today() + ".json", { app: KEY, v: 1, at: Date.now(), data: D }); toast("Sicherung gespeichert"); } },
    { label: "Daten übernehmen", icon: "upload", act: openImport },
    { label: "Alle Tagwerk-Apps", icon: "right", act: () => { location.href = "index.html"; } }
  ]));

  /* ---------- Eingabe ---------- */
  document.querySelectorAll("#tabs button").forEach(b => b.addEventListener("click", () => {
    view = b.dataset.tab;
    render();
    window.scrollTo({ top: 0 });
  }));
  $("b-add").addEventListener("submit", e => {
    e.preventDefault();
    const title = $("b-add-input").value.trim();
    if (!title) return;
    $("b-add-input").value = "";
    const have = findBook(title);
    if (have) { bookSheet(have); return; }
    const b = addBook(title);
    render();
    toast("Neue Wörter landen jetzt in „" + splitTitle(b.title).name + "“");
  });
  $("photo-btn").innerHTML = ico("camera");
  $("photo-btn").addEventListener("click", () => {
    if (!apiKey()) { toast("Fürs Foto brauchst du den API-Schlüssel (⋯ → Einstellungen)."); return; }
    $("photo").click();
  });
  $("photo").addEventListener("change", e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (f) readPage(f);
  });
  $("add").addEventListener("submit", e => {
    e.preventDefault();
    const w = $("add-input").value.trim();
    if (!w) return;
    $("add-input").value = "";
    if (D.words.some(v => v.word.toLowerCase() === w.toLowerCase())) { toast("„" + w + "“ ist schon in deiner Liste."); return; }
    addWord(w);
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });

  render();
  if (booted.source === "legacy" || booted.source === "transfer") {
    D.importAsked = true; save();
    toast(D.words.length ? "Deine Vokabeln aus Tagwerk sind da" : "Tagwerk übernommen");
  }
  // Einstieg über das App-Symbol mit ?go=abfrage (z.B. aus einer Kalender-Erinnerung)
  if (new URLSearchParams(location.search).get("go") === "abfrage") {
    history.replaceState(null, "", location.pathname);
    if (due().length) quiz(due());
  }
  TW.registerSW();
})();

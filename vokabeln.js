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
  function fromLegacy(L) {
    const words = (L.vocab || []).map(v => ({ ...v }));
    // Buch für neue Wörter: das zuletzt benutzte, sonst das Buch, das gerade gelesen wird
    const withBook = words.filter(v => v.book).sort((a, b) => (a.created || 0) - (b.created || 0)).pop();
    const reading = (L.books || []).find(x => x && x.reading && (x.media || "book") === "book");
    const lastBook = withBook ? withBook.book : reading ? String(reading.question || "") : "";
    return {
      v: 1, words, log: L.vocabLog || {}, accent: L.vocabAccent || "en-GB", speak: L.vocabSpeak !== false,
      usage: L.usage || { input: 0, output: 0, cost: 0 }, lastBook, from: "tagwerk"
    };
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
    d.v = 1;
    return d;
  }

  const booted = await TW.boot(KEY, fromLegacy);
  let D = normalize(booted.data);
  let filter = "", search = "";
  function save() { TW.save(KEY, D); TW.shareForOtherIcons(KEY, D); }
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
  const books = () => [...new Set(D.words.map(v => v.book).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de"));

  /* ---------- Claude: nachschlagen (eigener Schlüssel, nur lokal) ---------- */
  function jsonFrom(text) {
    const s = String(text).replace(/```json|```/g, "").trim();
    try { return JSON.parse(s); } catch {}
    const a = s.indexOf("{"), b = s.lastIndexOf("}");
    if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch {} }
    return null;
  }
  async function callClaude({ system, userText, maxTokens = 1000, image = null }) {
    const key = apiKey();
    if (!key) { toast("Für Claude brauchst du deinen API-Schlüssel (⋯ → Einstellungen)."); return null; }
    const content = image
      ? [{ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } }, { type: "text", text: userText }]
      : userText;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content }] })
    });
    const body = await res.json();
    if (!res.ok) {
      if (res.status === 401) throw new Error("Der API-Schlüssel wurde nicht akzeptiert.");
      throw new Error((body && body.error && body.error.message) || res.statusText);
    }
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
    if (!apiKey()) { render(); detail(v, true); return; }
    v.busy = true;
    render();
    try { await lookup(v); }
    catch (err) { toast("Nachschlagen ging nicht: " + err.message); }
    finally { delete v.busy; save(); render(); }
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
      + '<p class="tw-hint" style="margin-top:6px">Tipp an, was du behalten willst' + (D.lastBook ? " · Buch: " + esc(D.lastBook) : "") + ".</p>"
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

  /* ---------- Darstellung ---------- */
  function render() {
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
    $("book-line").innerHTML = '<span>Buch:</span><b>' + esc(D.lastBook || "keins") + '</b><button class="chip" id="book-btn" style="padding:3px 10px;font-size:13px">ändern</button>';
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
    } else if (!apiKey() && all.length < 3 && !D.keyHintSeen) {
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
    const bs = books();
    const fl = $("filters");
    fl.innerHTML = "";
    if (bs.length > 1) {
      fl.innerHTML = '<div class="filters">' + [["", "Alle"]].concat(bs.map(b => [b, b.length > 24 ? b.slice(0, 23) + "…" : b]))
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
    const bs = books();
    const s = sheet("<h2>Aus welchem Buch?</h2>"
      + '<p class="tw-hint" style="margin-top:6px">Neue Wörter bekommen dieses Buch. Claude erklärt sie dann so, wie der Autor sie meint.</p>'
      + '<div class="chips" style="margin-top:14px">' + bs.map((b, i) => '<button class="chip' + (D.lastBook === b ? " on" : "") + '" data-i="' + i + '">' + esc(b) + "</button>").join("")
      + '<button class="chip' + (!D.lastBook ? " on" : "") + '" data-i="-1">Kein Buch</button></div>'
      + '<label class="f-label">Neues Buch</label><input class="f-input" id="b-new" placeholder="Titel – Autor" enterkeyhint="done">'
      + '<div class="actions"><button class="btn primary" id="b-ok">Fertig</button></div>');
    s.el.querySelectorAll("[data-i]").forEach(b => b.addEventListener("click", () => {
      D.lastBook = +b.dataset.i < 0 ? "" : bs[+b.dataset.i];
      save(); s.close(); render();
    }));
    const take = () => {
      const v = s.el.querySelector("#b-new").value.trim();
      if (v) { D.lastBook = v; save(); }
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
        : rev ? "Letzter Schritt: " + askEn : (v.book || "");
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
      + '<p class="tw-hint" style="margin-top:8px">Bleibt auf diesem Gerät und geht nur direkt an Anthropic. Kosten bisher: $' + D.usage.cost.toFixed(4) + "</p>"
      + '<label class="f-label">Aussprache</label><div class="chips" id="s-acc">'
      + [["en-GB", "Britisch"], ["en-US", "Amerikanisch"]].map(([k, l]) => '<button class="chip' + (D.accent === k ? " on" : "") + '" data-acc="' + k + '">' + l + "</button>").join("") + "</div>"
      + '<div class="f-row" style="margin-top:10px"><span class="k">Beim Aufdecken vorlesen</span><label class="switch"><input type="checkbox" id="s-speak"' + (D.speak ? " checked" : "") + "><span></span></label></div>"
      + '<p class="tw-hint">' + (canSpeak() ? "iPhone: Unter Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Englisch eine „Erweitert“-Stimme laden – klingt deutlich natürlicher." : "Dieser Browser kann leider nicht vorlesen.") + "</p>"
      + '<label class="f-label">Hell oder dunkel</label>' + TW.themeChipsHtml(), { onClose: () => render() });
    s.el.querySelector("#s-key").addEventListener("change", e => {
      const v = e.target.value.trim();
      try { if (v) localStorage.setItem(TW.API_KEY, v); else localStorage.removeItem(TW.API_KEY); } catch {}
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
    { t: "Lesen + gezielt üben", d: "Nur durch Lesen lernt man wenige Wörter; mit gezielten Übungen deutlich mehr. Erwachsene profitieren vom Lesen am meisten.", src: "Laufer 2003; Jeon & Day 2016" }
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

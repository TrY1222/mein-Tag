# Tagwerk neu: Plan (Oktober 2026)

## Das Problem

Die alte App konnte sehr viel: Heute-Übersicht, Aufgaben, Gewohnheiten, Vermeiden, Training mit Übungen und Plan,
Läufe, Skills, Bücher, Spiele, Vokabeln, Tagebuch, Rückblick, Jahresbilanz, KI-Tipps und eskalierende Erinnerungen.
Genau das ist der Fehler:

- **Zu viel auf einmal.** Vor dem Benutzen finden wir viele Funktionen gut, beim täglichen Benutzen zählt nur, wie
  einfach es geht ("Feature Fatigue", Thompson, Hamilton & Rust 2005). Die Studie empfiehlt ausdrücklich
  *mehrere spezialisierte Produkte mit wenigen Funktionen* statt eines Alleskönners.
- **Zu viel eintragen.** Jedes Eintragen kostet Kraft. Wer zu viel protokollieren muss, lässt es irgendwann ganz
  (Cordeiro u.a. 2015, Epstein u.a. 2015). Etwa 40 % aller App-Nutzungen dauern unter 15 Sekunden (Ferreira u.a. 2014).
- **Erinnerungen bauen keine Gewohnheiten.** Sie sorgen kurzfristig fürs Wiederholen, machen aber abhängig von der App;
  fällt die App weg, ist das Verhalten weg (Stawarz u.a. 2015, Renfree u.a. 2016, Nobbe u.a. 2024).
  Dazu kam: Ohne eigenen Server konnten die Erinnerungen bei geschlossener App gar nicht kommen.
- **Druck statt Rückenwind.** „Penetrant“, „Gnadenlos“ und die „Kurz mal ehrlich“-Wand erzeugen Trotz
  (Reaktanz, Miller u.a. 2007). Wer sich nach einem Ausrutscher Nachsicht gönnt, macht es danach eher besser
  (Breines & Chen 2012; Wohl, Pychyl & Bennett 2010).
- **Zerbrechliche Serien.** Eine gerissene Serie senkt die Motivation messbar (Silverman & Barasch 2023), obwohl einmal
  Auslassen für die Gewohnheit gar nicht schadet (Lally u.a. 2010).

## Die Entscheidung: drei kleine Apps statt einer großen

| App | Eine Aufgabe | Typische Nutzung |
|---|---|---|
| **Aufgaben** | Dinge, die einmal erledigt werden | mehrmals täglich, wenige Sekunden |
| **Gewohnheiten** | Dinge, die regelmäßig passieren sollen (auch Lesen, Sport) | einmal täglich abhaken |
| **Vokabeln** | Wörter aus dem Lesen behalten | eine Runde am Tag |

Jede App öffnet direkt mit ihrer einen Hauptaktion, ohne Menüs und Tabs dazwischen. Jedes Symbol auf dem Home-Bildschirm ist
gleichzeitig ein Auslöser („da ist ja noch Vokabeln“). Alle drei sehen gleich aus: schwarz/weiß, große klare Schrift,
leerer Bildschirm bis auf das Wichtige, Wischen zum Erledigen, wie bei **MinimaList**.

Die Startseite (das alte Tagwerk-Symbol) zeigt die drei Apps, übernimmt die alten Daten und führt ins **Archiv**:
Das alte Tagwerk mit Training, Läufen, Büchern, Tagebuch usw. bleibt unter `alt.html` vollständig erhalten.

## Aufgaben

- **Heute · Morgen · Später.** Mehr Listen braucht es nicht.
- **Eintragen in einem Schritt:** Feld oben antippen, tippen, Enter. Landet in der gerade offenen Liste.
- **Wischen:** nach rechts = erledigt, nach links = löschen, mit „Rückgängig“ statt Rückfrage.
- **Was gestern liegen blieb, steht heute einfach wieder da**, ohne rotes „Überfällig“. Liegt etwas über eine Woche,
  fragt die App einmal: *Noch wichtig? Behalten, auf Später oder löschen.* Ein offener Punkt beschäftigt den Kopf, bis es
  einen Plan dafür gibt oder er gestrichen ist (Masicampo & Baumeister 2011).
- **Abends: „Morgen planen“.** Fünf Minuten To-do-Liste für morgen vor dem Schlafen lassen schneller einschlafen
  (Scullin u.a. 2018).
- **Wichtig markieren (★).** Sonst gewinnt das Dringende gegen das Wichtige (Zhu, Yang & Hsee 2018).
- **Klein formulieren.** Der Platzhalter erinnert an den *nächsten kleinen Schritt*. Kleine, nahe Aufgaben schiebt man
  weniger auf (Steel 2007), zerlegte Aufgaben plant man realistischer (Kruger & Evans 2004).
- **Fokus 25 Minuten** aus der Aufgabe heraus, wie bei MinimaList. Feste Pausen machen weniger müde (Biwer u.a. 2023).
- **Wiederholen** (täglich/wöchentlich/monatlich) für Dinge wie Müll oder Rechnungen.
- **Termin mit Alarm**: eine Aufgabe mit Uhrzeit kann in den Kalender. Das ist der einzige Weg, wie eine Web-App
  ohne Server zuverlässig erinnert (der Alarm kommt vom iPhone-Kalender).

## Gewohnheiten

- **Jede Gewohnheit ist ein Wenn-dann-Plan:** *Was* (so klein wie möglich, z.B. „1 Seite lesen“) und *wann genau*
  („nach dem Abendessen“). Wenn-dann-Pläne verbessern das Erreichen von Zielen deutlich (Gollwitzer & Sheeran 2006,
  94 Studien, d = 0,65). Am besten hängt sie *hinter* etwas, das man sowieso macht (Judah, Gardner & Aunger 2013), immer an
  derselben Stelle im Tagesablauf (Judah u.a. 2018).
- **Abhaken = ein Tipp.** Mehr wird nicht eingetragen.
- **Keine Serie, die reißen kann.** Stattdessen die letzten 7 Tage als Punkte. Einmal Auslassen schadet nicht
  (Lally u.a. 2010). Nach einer Lücke kommt kein Tadel, sondern Lob fürs Weitermachen: Ein Bonus fürs *Zurückkommen* war in
  der größten Studie dazu die wirksamste von 54 Ideen (Milkman u.a. 2021).
- **„Lassen“-Gewohnheiten** (z.B. kein Handy im Bett) werden genauso abgehakt („heute geschafft“). Es gibt keinen
  Tage-Zähler mehr, der bei einem Ausrutscher auf 0 springt. Alles-oder-nichts-Denken macht aus Ausrutschern Rückfälle
  (Rückfallmodell nach Marlatt).
- **Nach 8 Wochen die Frage: „Machst du das inzwischen automatisch?“** Bei Ja wandert die Gewohnheit zu „Geschafft“
  und muss nicht mehr abgehakt werden. Im Schnitt dauert es rund 2 Monate, oft länger (Lally 2010: Median 66 Tage;
  Singh u.a. 2024: 59–66 Tage). Die Frage selbst ist der beste Einzel-Test für Automatik (Gardner u.a. 2012/2024). Ziel
  ist, dass du die App für diese Gewohnheit *nicht mehr brauchst*.
- **Wenige gleichzeitig** (Hinweis ab der 4.). Vorlagen für Lesen, Training, Vokabeln, Spazieren, Handy.
  Sport z.B. 4×/Woche, weil sich das als Schwelle für eine Sport-Gewohnheit gezeigt hat (Kaushal & Rhodes 2015).
- **Lesen** ist hier eine Gewohnheit (z.B. „1 Seite nach dem Abendessen“). Lesen bringt Erwachsenen sprachlich am meisten
  (Jeon & Day 2016), und mit gezielt geübten Wörtern lernt man mehr als nur durchs Lesen (Laufer 2003). Dafür gibt es die
  Vokabel-App.
- Montags: „Neue Woche, frischer Start“ (Fresh-Start-Effekt, Dai, Milkman & Riis 2014).
- Optional: Kalender-Alarm als *Starthilfe*. Die Gewohnheit selbst baut der Auslöser im Alltag, nicht die Erinnerung.

## Vokabeln

- Der Lernweg bleibt, wie du ihn festgelegt hast (er ist forschungsbasiert): jedes fällige Wort einmal pro Runde,
  3× in Folge gewusst (1/3/7 Tage), dann 1× andersrum, dann sitzt es; Auffrischung nach 1 und 3 Monaten; bei Falsch
  1× abschreiben + 2× aus dem Kopf; Aussprache mit Lautschrift.
- **Weniger Reibung:** Ein Feld oben: Wort tippen, Enter, Claude schlägt im Hintergrund nach. Das Buch wird gemerkt.
  Seite fotografieren geht mit einem Knopf daneben.
- **Ein großer Knopf: „Üben · 12“.** Ist alles geübt, steht da „Heute alles geübt ✓“.
- Statt einer Serie, die reißen kann: geübte Tage der letzten Woche als Punkte.

## Für alle drei

- Hell/Dunkel nach dem System, schwarz/weiß, eine Akzentfarbe je App.
- Alle Daten bleiben auf dem Handy. Jede App hat „Sicherung als Datei“.
- Keine Schimpf-Texte, kein „musst“. Freundlich und kurz.
- Jede App hat ein „Warum so?“ mit den Studien.

## Was bewusst wegfällt (bleibt im Archiv)

Trainingsplan mit Übungen und Wochentagen, Läufe mit Pace, Skills, Bücher-/Spiele-Tierlisten mit KI-Tipps, Tagebuch,
Rückblick, Jahresbilanz, Suche, Eskalations-Erinnerungen. Sie haben dich laut deiner eigenen Erfahrung nicht besser
gemacht, aber Eintragen gekostet. Alles ist im Archiv noch da und kann einzeln zurückkommen, wenn du es vermisst.

## Datenübernahme

- **Altes Symbol öffnen**: Es zeigt jetzt die Startseite. Wer von dort eine App öffnet, hat sofort alles: Aufgaben →
  Aufgaben; Gewohnheiten und Vermeiden → Gewohnheiten (mit bisherigen Haken, Training/Laufen aus den letzten 60 Tagen);
  Vokabeln mit Lernstand → Vokabeln.
- **Neue Symbole**: Auf dem iPhone hat jedes Home-Bildschirm-Symbol seinen eigenen Speicher. Darum einmal pro App:
  1. Auf der Startseite „Link für … kopieren“ → in Safari einfügen → Teilen → „Zum Home-Bildschirm“.
  2. Zurück zur Startseite → „Daten kopieren“.
  3. Neues Symbol öffnen → „Übernehmen“ → „Einfügen“.
  Der kopierte Text enthält auch den API-Schlüssel, damit das Nachschlagen in der neuen Vokabel-App sofort klappt
  (Anthropic zeigt einen Schlüssel nur einmal an). Die Datei-Sicherung enthält ihn nicht. Wo der Browser-Cache zwischen
  den Symbolen geteilt wird (z.B. Android), kommen die Daten sogar ganz ohne Einfügen mit.
- Danach die Apps nur noch über die neuen Symbole öffnen. Das alte Symbol bleibt das Archiv – nicht löschen, sonst sind
  Training, Läufe, Tagebuch usw. weg (vorher „Sicherung als Datei“).

## Quellen

Siehe Liste am Ende von `PLAN.md` bzw. „Warum so?“ in den Apps. Die wichtigsten:
Thompson, Hamilton & Rust 2005 (J. Marketing Research); Ferreira u.a. 2014 (MobileHCI); Cordeiro u.a. 2015 (CHI);
Epstein u.a. 2015 (UbiComp); Stawarz, Cox & Blandford 2015 (CHI); Renfree u.a. 2016 (CHI EA); Nobbe u.a. 2024
(npj Science of Learning); Miller u.a. 2007 (Human Communication Research); Breines & Chen 2012 (PSPB);
Wohl, Pychyl & Bennett 2010 (PAID); Silverman & Barasch 2023 (J. Consumer Research); Lally u.a. 2010 (EJSP);
Singh u.a. 2024 (Healthcare); Gollwitzer & Sheeran 2006; Judah u.a. 2013 (BJHP) und 2018 (BMC Psychology);
Gardner u.a. 2012 (IJBNPA); Milkman u.a. 2021 (Nature); Kaushal & Rhodes 2015 (J. Behav. Med.); Dai, Milkman & Riis 2014
(Management Science); Masicampo & Baumeister 2011 (JPSP); Scullin u.a. 2018 (JEP: General); Zhu, Yang & Hsee 2018 (JCR);
Steel 2007 (Psych. Bulletin); Kruger & Evans 2004 (JESP); Biwer u.a. 2023 (BJEP); Harkin u.a. 2016 (Psych. Bulletin);
Jeon & Day 2016 (RFL); Laufer 2003 (CMLR); Webb, Yanagisawa & Uchihara 2020 (MLJ); dazu die Vokabel-Studien aus den
vorigen Runden (Karpicke & Roediger 2008, Rawson & Dunlosky 2011, Pashler u.a. 2005, Webb 2009, Bahrick 1993 u.a.).

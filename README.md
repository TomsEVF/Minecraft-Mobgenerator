# Minecraft Tools – Loot-Tables & Mob-Generator

Zwei Werkzeuge für Minecraft-Server in einer Web-App:

- **Loot-Tables**: eigene Beute für Truhen, Mobs, Blöcke, Angeln, Regale … grafisch bauen und als Datapack-JSON herunterladen
- **Mob-Generator**: eigene Mobs erstellen – als `/summon`-Befehl, Spawn-Ei, Spawner oder `.mcfunction`

Reines HTML/CSS/JavaScript, kein Build-Schritt und kein Server nötig: einfach `index.html` im Browser öffnen
(funktioniert auch per Doppelklick und auf GitHub Pages).

> 🎮 **Live**: [tomsevf.github.io/Minecraft-Mobgenerator](https://tomsevf.github.io/Minecraft-Mobgenerator/)

## Unterstützte Versionen

**Minecraft 1.21 bis 26.3** – jede Version einzeln wählbar. Die gewählte Version gilt für beide Bereiche:

- Es erscheinen nur Items, Mobs, Biome, Strukturen, Verzauberungen, Tränke und Mob-Optionen, die es in dieser Version gibt
  (z. B. der Glücksghast erst ab 1.21.6, der Kupfergolem ab 1.21.9, der Nautilus ab 1.21.11).
- Loot-Tables werden im Format der Version geschrieben (Änderungen bei 1.21.4, 26.1, 26.2 und 26.3).
- Mob-Befehle nutzen die Schreibweise der Version, z. B. `equipment:{…}` ab 1.21.5 statt `ArmorItems`/`HandItems`,
  Textkomponenten als Objekt statt JSON-Text, Attribute ohne `generic.`-Präfix ab 1.21.2.
- Die passende `pack.mcmeta` (inkl. `min_format`/`max_format` ab 1.21.9) wird angezeigt.

## Mob-Generator

- **92 Mobs** mit Spawn-Ei-Bildern, gefiltert nach Version und Kategorie
- **Alle Optionen jedes Mobs** kommen aus den offiziellen NBT-Schemas ([SpyglassMC/vanilla-mcdoc](https://github.com/SpyglassMC/vanilla-mcdoc)) –
  z. B. Beruf und Stufe beim Dorfbewohner, Varianten und Stimmen bei Katze/Wolf/Schwein, Gene beim Panda, Muster beim Tropenfisch,
  Explosionsradius beim Creeper, Körperhaltung beim Rüstungsständer
- Name (Farbe, fett), Leben, Baby, Größe, Blickrichtung, KI, Unverwundbarkeit, Despawn, Tags …
- **Ausrüstung mit Item-Bildern – nur so, wie das Spiel sie zeigt**: Welche Plätze ein Mob hat, ist aus dem Minecraft-Client
  ausgelesen (Render-Ebenen). Zombies bekommen Rüstung und Waffen, Füchse ein Item ins Maul, Wölfe nur Wolfsrüstung,
  Pferde Pferderüstung und Sattel, Lachse gar nichts. Die Item-Auswahl ist je Platz passend gefiltert.
  Jedes Teil mit Verzauberungen, Namen, Beschreibung, Farbe, Rüstungsbesatz, Haltbarkeit und Drop-Chance
- **Attribute nur, wenn der Mob sie hat** – samt Standardwert (auf echten Servern abgefragt)
- Attribute, Effekte, Handelsangebote, Reiter/Reittier, eigenes NBT
- **Truhe mit Loot-Table** für Esel, Maultiere, Lamas und Händlerlamas: der Inhalt wird direkt nach dem Beschwören
  aus einer Loot-Table gewürfelt (als Befehlsfolge oder `.mcfunction`)
- Verzauberungen nur bei Items, die im Spiel verzauberbar sind (nicht bei Pferde-/Wolfsrüstung, Sattel, Teppich …)
- **Drops**: eigene Loot-Table aus dem Loot-Bereich verknüpfen, Drops eines anderen Mobs oder gar keine

## Loot-Tables

- **Mehrere Loot-Tables pro Projekt** in der Liste „Meine Loot-Tables“ – neu anlegen, wechseln, duplizieren, löschen;
  im Mob-Generator direkt als Drops oder Truheninhalt auswählbar
- Alle Items mit Bildern, deutschen bzw. englischen Namen und Suche (findet beide)
- Pools, Gewichte mit Live-Prozentanzeige, Mengen, „Nichts“-Einträge, Item-Tags, verschachtelte Loot-Tables
- Verzauberungen, Namen, Lore, Haltbarkeit, Tränke, Seltenheit, Glanz, Custom Model Data
- 21 Umgebungsbedingungen (Wetter, Tageszeit, Biom, Struktur, Höhe, Werkzeug, Plünderung, Scoreboard …), umkehrbar, UND/ODER
- Testwurf mit Statistik, Vanilla-Vorlagen der gewählten Version, Import vorhandener Loot-Tables
- Regale, Item-Rahmen und Deko-Töpfe per `/loot`-Befehl füllen
- **Gemeißelte Bücherregale** selbst mit bis zu 6 Büchern bestücken (verzaubert, beschrieben mit Titel/Autor/Seiten …)
  und als Block setzen oder als fertig gefülltes Item geben – es sind nur Bücher wählbar, genau wie im Spiel

## Sprache: Deutsch / English

Oben rechts (🌐) lässt sich die Oberfläche zwischen **Deutsch** und **English** umschalten. Die Wahl wird im Browser
gespeichert; beim ersten Start richtet sie sich nach der Browsersprache. Übersetzt werden alle Texte, Erklärungen und die
Anleitung – Minecraft-Namen (Items, Mobs, Verzauberungen, Biome …) kommen aus den offiziellen Sprachdateien des Spiels.
Die erzeugten Befehle und JSON-Dateien sind in beiden Sprachen identisch.

Die englischen Texte stehen in `js/i18n-en.js` (deutscher Text → englische Übersetzung); fehlt eine Übersetzung,
bleibt der deutsche Text stehen.

## Erklärungen

Eine Schritt-für-Schritt-Anleitung (öffnet sich beim ersten Start), „?“-Knöpfe mit Beispielen an jeder Einstellung
und kurze Erklärtexte, die sich oben mit „Erklärungen“ ausblenden lassen.

## Getestet mit echten Servern

Die erzeugten Befehle und Loot-Tables wurden automatisiert auf echten Minecraft-Servern
(1.21.1, 1.21.4, 1.21.5, 1.21.11, 26.1.2 und 26.3) geprüft: Jeder Mob wurde mit allen Optionen beschworen, danach wurden
die Daten im Spiel ausgelesen und verglichen. Spawn-Ei und Spawner wurden ebenfalls ausgeführt, alle Loot-Tables geladen.

## Daten aktualisieren (neue Minecraft-Version)

Alle Minecraft-Daten stecken in `js/mcdata.js` und `js/mobdata.js`. Sie werden erzeugt mit:

```bash
python3 tools/gen_data.py
```

Für eine neue Version diese in der Liste `VERSIONS` oben in `tools/gen_data.py` ergänzen. Das Skript lädt die Daten von
[misode/mcmeta](https://github.com/misode/mcmeta), die NBT-Schemas von SpyglassMC und die deutsche Sprachdatei von Mojang
(Zwischenspeicher im System-Temp-Ordner) und braucht nur Python 3 und `curl`.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seitenstruktur mit beiden Bereichen |
| `css/style.css` | Design |
| `js/app.js` | Loot-Tables, gemeinsame Bausteine (Item-Auswahl, Bilder, Versionen) |
| `js/mob.js` | Mob-Generator |
| `js/export.js` | Loot-Table → JSON (alle Formate) |
| `js/help.js` | Erklärtexte, „?“-Popover, Anleitung |
| `js/mcdata.js`, `js/mobdata.js` | Minecraft-Daten (generiert) |
| `js/bookshelf.js` | Baukasten für gemeißelte Bücherregale |
| `tools/` | Daten-Generator, mcdoc-Parser, Auslesen der Render-Ebenen (`read_render_layers.py`) und Attribut-Abfrage (`probe_attributes.py`) |

Bilder: gerenderte Icons von [mc.nerothe.com](https://mc.nerothe.com), sonst die offiziellen Texturen aus misode/mcmeta.

## Lizenz

MIT

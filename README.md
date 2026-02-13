# 🧱 Minecraft Mob Spawn Command Generator

Ein moderner, modularer Web-Generator für `/summon`-Befehle in Minecraft (1.21.1).  
Wähle einen Mob aus, passe unzählige NBT-Eigenschaften an – von Ausrüstung über Attribute bis hin zu komplexen Handelsangeboten – und erhalte sofort einen einsatzbereiten Befehl.

> 🎮 **Live-Demo**: [[https://tomsevf.github.io/Minecraft-Mobgenerator/](https://tomsevf.github.io/Minecraft-Mobgenerator/)]  
> 📦 **Version**: 1.0.0 – kompatibel mit Minecraft **1.21.1** (und älter über Syntax‑Option)

---

## ✨ Features

- **Über 80 Mobs** – unterteilt in *Passiv, Neutral, Aggressiv, Boss*  
- **Vollständige NBT-Kontrolle** über übersichtliche Tabs:
  - 📋 **Basis** – Name, Farbe, Leben, Rotation (nur bei NoAI)
  - 📊 **Attribute** – Bewegung, Rüstung, Angriff, Sprungkraft
  - ⚔️ **Ausrüstung** – Helm, Brustplatte, Hose, Schuhe, beide Hände + Drop‑Chance
  - 🧠 **Verhalten** – mob‑spezifische Felder (z.B. `Charged` beim Creeper, `Variant` beim Axolotl)
  - 🛒 **Trades** – flexible Handelsangebote mit bis zu zwei Eingabe‑Items, individuellen Nutzungen, XP und Preis‑Multiplikator
  - ⚙️ **Erweitert** – NoAI, Invulnerable, Silent, Persistent, benutzerdefiniertes NBT
- **Live‑Generierung** – jeder Tastendruck aktualisiert den Befehl sofort
- **Intelligente Aktivierung** – jeder Tab (außer Basis) hat eine Checkbox – nur aktivierte Werte landen im Befehl
- **Moderne NBT‑Syntax** – `Count:1b` für Villager‑Trades und Ausrüstung, exakt wie in Minecraft 1.21.1 benötigt
- **Villager‑Unterstützung** – Berufe (deutsch übersetzt), Level (min. 2), Biom‑Typ – das Handelsmenü öffnet sich garantiert, auch mit NoAI
- **Umfangreiche Item‑Datenbank** – über 200 Items als Vorschlag (Datalist), eigene Eingaben möglich
- **Responsive Design** – funktioniert auf Desktop, Tablet und Smartphone

---

## 🧩 Technologie‑Stack

- **HTML5** – semantisches Grundgerüst
- **CSS3** – modernes, klares Design (kein Minecraft‑Klischee)
- **JavaScript (ES6‑Module)** – vollständig modularisiert
- **JSON** – alle Mob‑Daten, Items und Kategorien werden aus externen Dateien geladen

---

## 📁 Projektstruktur

```
mob-generator/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── main.js                 # Einstiegspunkt, Koordination
│   └── modules/
│       ├── mobDatabase.js       # Lädt Mobs aus JSON
│       ├── itemDatabase.js      # Lädt Items für Datalists
│       ├── uiManager.js         # Tabs, Dropdown, dynamische Felder
│       ├── tradeManager.js      # Komplette Trade‑UI
│       ├── commandBuilder.js    # Baut NBT‑Befehl
│       └── copyHelper.js        # Copy‑Button mit Feedback
└── data/
    ├── mobs.json                # Register (Kategorie → Datei)
    ├── passive.json
    ├── neutral.json
    ├── hostile.json
    ├── boss.json
    └── items.json                # ~200 Items
```

---

## 🚀 Installation & Nutzung

1. **Repository klonen**  
   ```bash
   git clone https://github.com/tomsevf.github.io/Minecraft-Mobgenerator
   cd minecraft-mob-generator
   ```

2. **Lokalen Server starten** (erforderlich, weil JSON‑Dateien per `fetch` geladen werden)  
   - **Python**: `python -m http.server 8000` → [http://localhost:8000](http://localhost:8000)  
   - **Node.js**: `npx http-server` → [http://localhost:8080](http://localhost:8080)  
   - **VS Code Live Server**: Rechtsklick auf `index.html` → „Open with Live Server“

3. **Im Browser öffnen** und loslegen!

> ⚠️ **Hinweis**: Die App funktioniert **nicht** direkt per Doppelklick auf die HTML‑Datei (CORS‑Fehler). Ein lokaler Server ist zwingend erforderlich.

---

## 🛠️ Konfiguration & Erweiterung

- **Neue Mobs hinzufügen** – einfach in die entsprechende JSON‑Datei (`passive.json`, `hostile.json` usw.) eintragen.  
  Format siehe vorhandene Einträge (Feldnamen **UpperCamelCase** wie in Minecraft‑NBT).
- **Neue Items** – in `data/items.json` ergänzen.
- **CSS‑Anpassungen** – alle Styles zentral in `css/style.css` (keine Inline‑Styles im JS).

---

## 📝 Beispiele

### Einfacher Zombie mit Rüstung
```
/summon zombie ~ ~ ~ {ArmorItems:[{id:"minecraft:iron_boots",Count:1b},{id:"minecraft:iron_leggings",Count:1b},{id:"minecraft:iron_chestplate",Count:1b},{id:"minecraft:iron_helmet",Count:1b}]}
```

### Villager mit NoAI, Rotation und Trades (Menü öffnet sich)
```
/summon villager ~ ~ ~ {NoAI:1b,Rotation:[90f,0f],Invulnerable:1b,VillagerData:{level:5,profession:"minecraft:mason",type:"minecraft:plains"},Offers:{Recipes:[{maxUses:999999,buy:{id:"minecraft:emerald",Count:1b},sell:{id:"minecraft:diamond",Count:1b}}]}}
```

---

## 🤝 Mitwirken

Beiträge sind willkommen!  
- Forke das Projekt  
- Erstelle einen Feature‑Branch (`git checkout -b feature/neues-feature`)  
- Committe deine Änderungen (`git commit -am 'Add new feature'`)  
- Pushe in den Branch (`git push origin feature/neues-feature`)  
- Erstelle einen Pull Request

---

## 📄 Lizenz

Dieses Projekt steht unter der **MIT‑Lizenz**

---

## 🙏 Danksagung

- Inspiriert von unzähligen Minecraft‑Command‑Generatoren, aber mit dem Ziel, **technisch korrekt, modular und erweiterbar** zu sein.
- Besonderer Dank an die Minecraft‑Community für die detaillierte Dokumentation der NBT‑Strukturen.

---

**Viel Spaß beim Erstellen eigener Mobs!** 🎮

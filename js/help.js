'use strict';

/*
 * Erklärungen für die ganze App:
 *  - HELP / COND_HELP: Texte für die „?“-Knöpfe
 *  - infoBtn(): kleiner „?“-Knopf, der eine Erklärung als Popover öffnet
 *  - explain(): kurzer Erklärtext direkt in der Oberfläche (oben abschaltbar)
 *  - openGuide(): Schritt-für-Schritt-Anleitung
 *
 * Textformat: Absätze mit Leerzeile trennen, Zeilen mit „• “ werden zur Liste, **fett**.
 * Nutzt h() und icon() aus app.js (erst beim Aufruf, daher unabhängig von der Ladereihenfolge).
 */

const HELP = {
    format: `Wähle hier **genau die Minecraft-Version deines Servers**. Sie gilt für beide Bereiche:

• **Anzeige**: Es erscheinen nur Items, Mobs, Biome, Verzauberungen und Einstellungen, die es in dieser Version gibt. Neue Mobs tauchen erst auf, wenn du eine passende Version wählst.
• **Loot-Tables**: Die JSON wird im Format dieser Version geschrieben (Mojang hat es bei 1.21.4, 26.1, 26.2 und 26.3 geändert).
• **Mob-Generator**: Der Befehl nutzt die Schreibweise dieser Version (z. B. „equipment“ ab 1.21.5, vorher „ArmorItems“).

Deine Server-Version siehst du in der Server-Liste im Multiplayer-Menü oder in der Konsole beim Start.`,

    explainToggle: `Blendet die kurzen grauen Erklärtexte in der Oberfläche ein oder aus. Die „?“-Knöpfe und die Anleitung bleiben immer verfügbar.`,

    type: () => `Der Typ sagt Minecraft, **in welcher Situation** die Loot-Table benutzt wird. Davon hängt ab, was das Spiel in dem Moment weiß – und damit, welche Bedingungen möglich sind.

${TABLE_TYPES.map(t => `• **${t.label}**: ${t.desc}`).join('\n')}

Beispiel: Nur bei Mob-Drops weiß das Spiel, wer den Mob getötet hat (Plünderung, „von Spieler getötet“). Nur bei Block-Drops gibt es ein Werkzeug (Behutsamkeit, Glück). Die App zeigt dir deshalb nur Bedingungen an, die zum Typ passen.`,

    namespace: `Der Namespace ist wie ein Ordnername für dein Datapack. So kommen sich deine Dateien nicht mit anderen Datapacks oder Minecraft selbst in die Quere.

• Nimm etwas Eigenes, z. B. den Namen deines Servers: **meinserver**
• Erlaubt sind nur Kleinbuchstaben, Zahlen, _ . und -
• **minecraft** nur, wenn du eine originale Loot-Table ersetzen willst

Später sprichst du die Loot-Table mit Namespace und Pfad an, z. B. **meinserver:chests/meine_truhe**.`,

    path: `Name der Datei (ohne .json), optional mit Unterordnern, getrennt durch /.

Beispiel: **chests/dungeon/schatz** wird zu data/meinserver/loot_table/chests/dungeon/schatz.json

Willst du Vanilla-Beute ersetzen, muss der Pfad genau dem Original entsprechen – z. B. **entities/zombie** oder **blocks/diamond_ore** mit Namespace minecraft. Bei Mob- und Block-Drops erkennt die App den Mob bzw. Block am Pfad und zeigt ihn oben an.`,

    pathBox: `Genau an diese Stelle in deinem Datapack gehört die heruntergeladene Datei. Fehlende Ordner legst du einfach selbst an.`,

    randomSequence: `Gibt der Loot-Table eine eigene Zufallsfolge (random_sequence). Minecraft macht das bei allen eigenen Loot-Tables genauso.

Vorteil: Andere Loot-Tables beeinflussen den Zufall nicht. Einfach eingeschaltet lassen.`,

    vanilla: `Lädt eine originale Loot-Table aus Minecraft als Vorlage, z. B. **chests/simple_dungeon** (Dungeon-Truhe) oder **entities/zombie**.

So veränderst du Vanilla-Beute: Vorlage laden → anpassen → herunterladen. Mit Namespace **minecraft** und dem gleichen Pfad ersetzt dein Datapack das Original im Spiel.

Manche Spezialfunktionen (z. B. Blockzustände) kann der Editor nicht darstellen. Das wird beim Laden gemeldet und der Teil vereinfacht.`,

    usage: `Eine Loot-Table wirkt erst, wenn sie in einem **Datapack** liegt und benutzt wird.

• **Datapack**: Ordner in world/datapacks/ mit einer pack.mcmeta und dem Ordner data/
• **/reload** lädt Datapacks neu, ohne den Server neu zu starten
• **/loot give @s loot …** ist der schnellste Test: Die Beute landet sofort in deinem Inventar

Wichtig bei Truhen: Die Beute wird nur **einmal** erzeugt (beim ersten Öffnen). Bereits geöffnete Truhen ändern sich nicht mehr – teste mit einer neu gesetzten Truhe.`,

    pool: `Ein **Pool** ist wie ein Lostopf. Bei jedem **Wurf** zieht Minecraft genau **einen** Eintrag heraus – Einträge mit höherem Gewicht werden öfter gezogen.

Mehrere Pools arbeiten unabhängig voneinander. Typisches Muster:
• Pool 1: 2–4 Würfe aus normalen Items (Brot, Eisen, Knochen)
• Pool 2: 1 Wurf mit seltener Beute (Diamant + viel „Nichts“)

So gibt es immer etwas Normales und manchmal etwas Besonderes.`,

    rolls: `Wie oft aus diesem Pool gezogen wird. Bei „1 bis 3“ wählt Minecraft jedes Mal zufällig 1, 2 oder 3 Ziehungen.

Jede Ziehung ergibt einen Eintrag – derselbe Eintrag kann auch mehrmals gezogen werden. 0 Würfe = der Pool droppt nichts.`,

    bonusRolls: `Zusätzliche Würfe pro Punkt **Glück** des Spielers (Trank des Glücks, bei Angeln auch „Glück des Meeres“). Beispiel: 0,5 → mit Glück II gibt es einen Wurf mehr.

Wirkt nur, wenn das Spiel den Spieler kennt (Truhe öffnen, Angeln, Mob-Kill). Normalerweise 0 lassen.`,

    entries: `Die Einträge sind die möglichen Ergebnisse einer Ziehung. Die Prozentzahl unter jedem Eintrag ist die Chance, dass er **bei einem Wurf** gezogen wird.

• Zahl unten rechts: Anzahl der Items
• Lila Punkt: verzaubert
• Gelber Punkt: eigener Name oder Beschreibung
• Blauer Punkt: hat Bedingungen

Klicke einen Eintrag an, um ihn zu bearbeiten. Mit „+“ fügst du Items hinzu.`,

    addButtons: `Was du in einen Pool legen kannst:

• **Item**: ein bestimmtes Item, z. B. Diamant
• **Nichts**: ein Eintrag, der nichts droppt. Senkt die Chance aller anderen – perfekt für seltene Beute (Diamant Gewicht 1 + Nichts Gewicht 9 = 10 % Diamant)
• **Item-Tag**: eine ganze Item-Gruppe, z. B. #wool (alle Wollfarben)
• **Andere Loot-Table**: bindet eine komplette andere Loot-Table als einen Eintrag ein, z. B. die Vanilla-Dungeon-Truhe`,

    poolConds: `Bedingungen am **Pool** gelten für den ganzen Lostopf: Trifft eine nicht zu, wird aus diesem Pool **gar nichts** gezogen – die anderen Pools laufen normal weiter.

Beispiel: Pool 2 mit „Tageszeit: Nacht“ → nachts gibt es zusätzliche Beute.`,

    entryConds: `Bedingungen am **Eintrag**: Trifft eine nicht zu, kann nur dieser Eintrag nicht gezogen werden – die anderen Einträge im Pool schon.

Beispiel: Ein Diamant, der nur bei Gewitter im Topf liegt. Bei klarem Wetter wird stattdessen aus den übrigen Einträgen gezogen.`,

    condMode: `Wie mehrere Bedingungen zusammenwirken:

• **UND**: Alle müssen gleichzeitig zutreffen, z. B. „Nacht“ UND „Wüste“
• **ODER**: Eine reicht, z. B. „Wüste“ ODER „Tafelberge“`,

    invert: `Kehrt die Bedingung um – sie trifft dann zu, wenn das Gegenteil gilt: „NICHT in der Wüste“, „NICHT mit Behutsamkeit“. So baust du Ausnahmen.`,

    weight: `Das Gewicht bestimmt, wie oft ein Eintrag im Vergleich zu den anderen im selben Pool gezogen wird.

**Chance = eigenes Gewicht ÷ Summe aller Gewichte**

Beispiel: Brot 6, Eisen 3, Diamant 1 → Summe 10 → Brot 60 %, Eisen 30 %, Diamant 10 % pro Wurf. Nur ganze Zahlen ab 1.`,

    count: `Wie viele Items dieser Eintrag droppt, wenn er gezogen wird. Bei „2 bis 5“ wird jedes Mal zufällig eine Menge dazwischen gewählt.

Mehr als ein Stapel (z. B. 100 Pfeile) wird automatisch auf mehrere Plätze verteilt.`,

    quality: `Nur wichtig, wenn der Spieler **Glück** hat. Das Gewicht ändert sich um Qualität × Glück: Positive Qualität macht den Eintrag mit Glück häufiger, negative seltener.

Vanilla nutzt das beim Angeln (Schätze +2, Müll −2). Sonst einfach 0 lassen.`,

    expand: `Ein Item-Tag enthält mehrere Items (z. B. #wool = alle 16 Wollfarben).

• **Angehakt**: Es wird ein zufälliges Item aus dem Tag gezogen
• **Nicht angehakt**: Alle Items des Tags droppen auf einmal`,

    lootTableRef: `Die ID einer anderen Loot-Table, z. B. **minecraft:chests/simple_dungeon** oder eine eigene wie **meinserver:chests/basis**.

Wird dieser Eintrag gezogen, wird die komplette andere Loot-Table ausgewürfelt. Praktisch, um gemeinsame Beute in mehreren Tabellen wiederzuverwenden.`,

    ench: `Drei Arten zu verzaubern:

• **Feste**: genau diese Verzauberungen, z. B. Schärfe V + Haltbarkeit III. Auch Bereiche wie I–III sind möglich
• **Zufällige**: eine zufällige Verzauberung mit zufälliger Stufe – wie Bücher in Dungeon-Truhen
• **Wie Zaubertisch**: als hätte man X Level am Zaubertisch ausgegeben, kann mehrere Verzauberungen ergeben

Tipp: Ein **Buch** wird dabei automatisch zum verzauberten Buch.`,

    enchGroup: `Aus welcher Gruppe die zufällige Verzauberung stammen darf:

• **Alle normalen**: wie in Dungeon- und Strukturtruhen
• **Wie am Zaubertisch**: nur, was man auch am Tisch bekommt
• **Nur Schatz-Verzauberungen**: z. B. Reparatur, Frostläufer, Seelenläufer
• **Nur Flüche**: Fluch der Bindung, Fluch des Verschwindens`,

    enchLevels: `Entspricht den Erfahrungsleveln am Zaubertisch: 30 ergibt die besten Tisch-Verzauberungen, 5 eher schwache. Werte über 30 sind möglich und machen das Ergebnis noch stärker.`,

    anyItem: `Normalerweise kommen nur Verzauberungen in Frage, die zum Item passen (z. B. keine Schärfe auf Stiefeln). Angehakt ist alles erlaubt – für Spaß-Items wie „Stock mit Rückstoß X“.`,

    name: `Gibt dem Item einen eigenen Namen, wie am Amboss. Farbe, fett und kursiv wählst du daneben.

Ein Name vom Amboss ist normalerweise kursiv – hier ist er standardmäßig gerade. Spieler können den Namen am Amboss wieder ändern.`,

    lore: `Die Lore sind die Textzeilen unter dem Namen im Tooltip – ideal für Beschreibungen, Geschichten oder Hinweise zu Server-Items. Jede Zeile hat eigene Farbe und Stil. Rechts siehst du die Vorschau.`,

    potion: `Welcher Trank-Effekt in der Flasche bzw. im Pfeil steckt. „II“ = stärker, „verlängert“ = längere Wirkung.`,

    damage: `Das Item droppt schon abgenutzt. Die Prozentzahl ist die **verbleibende** Haltbarkeit: 100 % = neu, 10 % = fast kaputt.

Mit einem Bereich (z. B. 20–80 %) ist jedes Item unterschiedlich abgenutzt – wirkt wie gefundene, gebrauchte Ausrüstung.`,

    rarity: `Bestimmt die Farbe des Item-Namens: weiß, gelb, türkis oder violett – wie bei seltenen Vanilla-Items (das Totem der Unsterblichkeit ist z. B. gelb). Rein optisch.`,

    glint: `Der lila Schimmer verzauberter Items.

• **Immer**: auch unverzauberte Items glänzen, z. B. ein „magischer“ Stock
• **Nie**: kein Glanz, obwohl das Item verzaubert ist`,

    unbreakable: `Das Item verliert nie Haltbarkeit. Auf einem Server sehr stark – gut überlegen, ob es das in normaler Beute geben soll.`,

    cmd: `Für eigene Texturen per **Resource Pack**: Das Resource Pack kann anhand dieses Werts ein anderes Aussehen anzeigen – z. B. ein „Rubinschwert“, das eigentlich ein Diamantschwert ist.

Ohne passendes Resource Pack hat der Wert keine sichtbare Wirkung.`,

    looting: `Wie bei Vanilla-Mobs: Pro Stufe **Plünderung** auf der Waffe kommen zusätzliche Items dazu.

„0 bis 1 pro Stufe“ bedeutet: Mit Plünderung III gibt es bis zu 3 Items mehr.`,

    smelt: `Droppt die gebratene Version, wenn der Mob beim Tod brennt (Feuer, Lava, Verbrennungs-Verzauberung) – so wie rohes Rindfleisch zu Steak wird. Wirkt nur bei Items, die man im Ofen braten kann.`,

    fortune: `**Glück** (Fortune) auf dem Werkzeug erhöht die Menge:

• **Wie Erze**: Die Menge wird mit einem Zufallsfaktor multipliziert, mit Glück III bis zu 4× – wie bei Diamanterz
• **+0 bis +Stufe**: pro Stufe höchstens ein Item mehr – wie bei Netherwarzen`,

    explosionDecay: `Wird der Block durch eine Explosion (Creeper, TNT) zerstört, geht wie in Vanilla ein Teil der Items verloren. Je größer die Explosion, desto mehr.`,

    chanceBox: `So oft wird dieser Eintrag bei **einem** Wurf gezogen. Bei mehreren Würfen ist die Chance, ihn mindestens einmal zu bekommen, entsprechend höher. Den Testwurf oben rechts nutzt du, um das auszuprobieren.`,

    preview: `So ungefähr sieht das Item im Spiel aus, wenn man mit der Maus darüberfährt. Blau darunter stehen die Bedingungen – die sieht der Spieler natürlich nicht.`,

    picker: `Klicke ein Item an, um es hinzuzufügen. Suchen kannst du auf Deutsch, Englisch oder mit der ID. Enter nimmt den ersten Treffer.

Ausgegraute Items mit „ab 26.x“ gibt es in deiner gewählten Minecraft-Version noch nicht.`,

    tags: `Item-Tags sind Gruppen, die Minecraft selbst definiert, z. B. #logs (alle Stämme), #wool (alle Wollfarben) oder #swords (alle Schwerter). Das Bild zeigt jeweils das erste Item der Gruppe.`,

    sim: `Der Testwurf erzeugt die Beute so, wie Minecraft es tun würde – mehrmals klicken zeigt die Bandbreite.

Die **Statistik** würfelt 2000-mal und zeigt, wie oft jedes Item mindestens einmal dabei ist und wie viele im Schnitt. Ideal, um seltene Beute auszubalancieren.

Zufallschancen werden ausgewürfelt, alle anderen Bedingungen (Wetter, Biom, Werkzeug …) gelten im Test als erfüllt. Mit der Stufe probierst du Plünderung bzw. Glück aus.`,

    output: `Das ist die fertige Datei, genau so, wie Minecraft sie liest. Du musst hier nichts ändern – sie entsteht automatisch aus deinen Einstellungen.

• Oben: wo die Datei im Datapack hin muss
• Gelb/Rot: Hinweise, falls noch etwas fehlt oder nicht passt
• **Kopieren** oder oben **JSON herunterladen** übernimmt sie`,

    project: `**Projekt speichern** sichert deinen Stand als Datei, damit du später weiterarbeiten oder ihn weitergeben kannst. **Projekt laden** öffnet so eine Datei – oder eine fertige Loot-Table-JSON zum Bearbeiten.

Zusätzlich speichert der Browser automatisch deinen letzten Stand.`,

    scene: () => `Hier siehst du, wofür die Loot-Table gerade gedacht ist (links unter „Wofür ist die Loot-Table?“ änderst du das). Die Ansicht der Einträge passt sich an: Truhen-Inventar, Items auf dem Boden, Wasser, Regalbretter …

**Auslöser**: wann Minecraft die Loot-Table benutzt. Der Wert „minecraft:…“ ist der Typ, der in der JSON steht.`
};

// Erklärungen für den Mob-Generator
const HELP_MOB = {
    list: `Hier wählst du, welchen Mob du erstellen willst. Die Liste zeigt nur Mobs, die es in der oben gewählten Minecraft-Version gibt – neuere Mobs (z. B. der Glücksghast ab 1.21.6) erscheinen erst, wenn du eine passende Version wählst.

Mit den Knöpfen filterst du nach friedlichen, neutralen und feindlichen Mobs. Allgemeine Einstellungen (Name, Verhalten, Ausrüstung …) bleiben beim Wechsel erhalten.`,
    scene: `Das ist dein Mob. Darunter stellst du ihn Schritt für Schritt ein. **Alle Optionen stammen aus den offiziellen Minecraft-Daten** der gewählten Version – du siehst also nur, was dieser Mob in deiner Version wirklich kann.

Rechts entsteht automatisch der passende Befehl.`,
    look: `Name über dem Kopf, Baby-Version, Größe und Blickrichtung des Mobs.`,
    name: `Der Name erscheint über dem Kopf, wenn man den Mob anschaut – mit „immer sichtbar“ auch aus der Ferne. Benannte Mobs verschwinden übrigens nicht (kein Despawn).`,
    baby: `Macht den Mob zum Baby, sofern es für ihn eine Baby-Version gibt (z. B. Zombie, Kuh, Dorfbewohner). Tiere wachsen nach 20 Minuten auf – unter „Eigenschaften“ gibt es bei vielen Tieren „Wächst nie auf“.`,
    scale: `Ändert die Größe über das Attribut „Größe“ (scale): 0,5 = halb so groß, 3 = dreimal so groß. Hitbox und Schrittweite wachsen mit.`,
    rotation: `In welche Richtung der Mob schaut. Da sich Mobs normalerweise sofort umdrehen, wirkt das dauerhaft nur zusammen mit „Keine KI“ – ideal für Händler oder Deko-Mobs.`,
    behavior: `Allgemeine Einstellungen, die fast jeder Mob hat: Lebenspunkte, KI, Unverwundbarkeit, Despawn, Geräusche, Schwerkraft …`,
    health: `Lebenspunkte des Mobs (2 = ein Herz). Ein Mob kann nicht mehr Leben haben als seine **maximale Gesundheit**. Setzt du mehr als 20, erhöht der Generator die maximale Gesundheit automatisch mit – bei Bossen mit mehr Grundleben kannst du sie unter „Attribute“ selbst festlegen.`,
    tags: `Tags sind unsichtbare Markierungen. Mit ihnen findest du den Mob später in Befehlen wieder, z. B. **/kill @e[tag=boss]** oder **/effect give @e[tag=wache] …**`,
    spec: `Einstellungen, die es **nur für diesen Mob** gibt – z. B. Farbe beim Schaf, Beruf beim Dorfbewohner, Variante bei Katze und Wolf, Explosionsradius beim Creeper.

Die Liste kommt direkt aus den Minecraft-Daten deiner Version: Wechselst du die Version, ändern sich die Optionen passend dazu. Leere Felder bleiben wie im normalen Spiel.`,
    equip: `Rüstung und Items, die der Mob trägt. Kopf, Brust, Beine und Füße für Rüstung, Haupt- und Nebenhand für Waffen oder Schilde. Pferde, Wölfe, Lamas, der Glücksghast und Nautilusse haben zusätzlich einen **Körper**-Platz (Pferderüstung, Wolfsrüstung, Teppich, Geschirr …), reitbare Tiere einen **Sattel**-Platz.

**Drop-Chance**: Standard sind 8,5 %. „Immer“ lässt das Teil garantiert und unbeschädigt fallen, „nie“ gar nicht.

Tipp: Auf den Kopf kannst du auch Blöcke setzen, z. B. einen Kürbis oder Glas.`,
    attrs: `Attribute sind die Grundwerte des Mobs. Die wichtigsten:

• **Maximale Gesundheit**: wie viele Lebenspunkte er höchstens hat
• **Geschwindigkeit**: wie schnell er läuft (Zombie 0,23)
• **Angriffsschaden**: Schaden pro Schlag
• **Rüstung** / **Rüstungshärte**: weniger Schaden durch Angriffe
• **Rückstoßresistenz**: 1 = lässt sich nicht wegstoßen
• **Größe**: 0,0625 bis 16

Welche Attribute es gibt, hängt von der Version ab – die Liste passt sich automatisch an.`,
    effects: `Effekte wirken wie Tränke auf den Mob. „Dauerhaft“ hält für immer. „Partikel“ aus versteckt die Blubberblasen – z. B. für einen wirklich unsichtbaren Mob.

Stufe 1 = normaler Effekt, Stufe 2 = „II“ usw.`,
    loot: `Bestimmt, was der Mob beim Tod fallen lässt:

• **Standard**: wie im normalen Spiel
• **Aus Loot-Bereich**: die Loot-Table, die du im Bereich „Loot-Tables“ baust – so bekommt dein Boss eigene Beute
• **Wie anderer Mob**: z. B. ein Zombie mit den Drops eines Blaze
• **Keine Drops**: der Mob lässt nichts fallen

Die Loot-Table muss im Datapack liegen, damit das im Spiel funktioniert.`,
    lootLink: `Legt im Bereich „Loot-Tables“ eine neue Loot-Table vom Typ „Mob-Drops“ an und verknüpft sie automatisch mit diesem Mob. Dort baust du die Beute – hier im Befehl steht dann automatisch der richtige Name.

Umgekehrt geht es auch: Bei einer Mob-Drop-Loot-Table gibt es oben den Knopf „Für Mob verwenden“.`,
    trades: `Eigene Handelsangebote für Dorfbewohner und den wandernden Händler. Jedes Angebot: bis zu zwei Items als Preis, ein Item als Ware.

• **Max. Nutzungen**: wie oft man handeln kann, bevor der Händler nachfüllen muss
• **Händler-EP**: Erfahrung für den Dorfbewohner (für seinen Stufenaufstieg)
• **Spieler bekommt EP**: ob der Spieler Erfahrungspunkte bekommt

Wichtig: Dorfbewohner brauchen einen **Beruf** (unter „Eigenschaften“), sonst öffnet sich kein Handelsmenü. Mit Stufe 5 bekommen sie keine neuen Angebote mehr dazu.`,
    priceMultiplier: `Wie stark der Preis steigt, wenn das Angebot oft genutzt wird oder der Spieler den Händler geheilt hat. 0 = Preis bleibt immer gleich, 0,05 = normal, 0,2 = stark schwankend.`,
    riders: `**Reiter**: Mobs, die auf deinem Mob sitzen – z. B. ein Skelett auf einer Spinne (Spinnenreiter) oder ein Baby-Zombie auf einem Huhn.

**Reitet auf**: Dein Mob sitzt selbst auf einem anderen Mob. Der Befehl beschwört dann das Reittier mit deinem Mob obendrauf.`,
    extra: `Für Profis: Hier kannst du beliebige weitere NBT-Daten anhängen, die es oben nicht gibt. Sie werden unverändert in den Befehl übernommen – Fehler hier führen dazu, dass der Befehl nicht funktioniert.`,
    pos: `Wo der Mob erscheint bzw. der Spawner gesetzt wird:

• **~ ~ ~**: genau an deiner Position (bzw. der des Befehlsblocks)
• **~ ~1 ~**: einen Block höher
• **^ ^ ^3**: drei Blöcke vor dir in Blickrichtung
• **100 64 -20**: feste Koordinaten (F3 zeigt sie an)`,
    output: `Der fertige Befehl für deine Version. Vier Varianten:

• **/summon**: Mob sofort erscheinen lassen
• **Spawn-Ei**: ein Ei, das diesen Mob erzeugt (per /give)
• **Spawner**: ein Monster-Spawner, der den Mob immer wieder erzeugt
• **.mcfunction**: der Befehl als Datei für dein Datapack – für sehr lange Befehle oder zum Aufrufen mit /function

Befehle über 256 Zeichen passen nicht in den Chat – dann einen Befehlsblock oder die .mcfunction nutzen.`
};

// Erklärungen zu den Bedingungen (Schlüssel = Bedingungstyp)
const COND_HELP = {
    random_chance: `Trifft nur mit dieser Wahrscheinlichkeit zu: 25 % = in einem von vier Fällen. Praktisch, um einen ganzen Pool selten zu machen, z. B. „Bonus-Pool mit 10 %“.`,
    random_looting: `Wie die Zufallschance, aber **Plünderung** auf der Waffe erhöht sie. Vanilla nutzt das für seltene Mob-Drops: Der Zombie lässt Eisen mit 2,5 % fallen, plus 1 % pro Plünderung-Stufe.`,
    weather: `Prüft das Wetter in dem Moment, in dem die Beute entsteht (Truhe öffnen, Mob stirbt, Block abgebaut …). Gewitter gibt es nur zusammen mit Regen.`,
    time: `Prüft die Tageszeit. Ein Minecraft-Tag hat 24000 Ticks (20 Minuten):

• **Tag**: 0–12000 (6:00 bis 18:00 Uhr)
• **Nacht**: 13000–23000 (19:00 bis 5:00 Uhr)

In Nether und Ende steht die Zeit nicht still, dort ist diese Bedingung aber wenig sinnvoll.`,
    biome: `Nur in bestimmten Biomen – z. B. Wüstentruhen mit Sand und Kaktus. Bei mehreren Biomen reicht eines davon. Beim Tippen werden passende Biome vorgeschlagen.`,
    dimension: `Nur in der Oberwelt, im Nether oder im Ende.`,
    structure: `Nur, wenn der Ort innerhalb einer Struktur liegt – z. B. Mob-Drops nur in einer Netherfestung (fortress) oder Truhen nur in einer Festung (stronghold). Die IDs sind englisch.`,
    height: `Nur in einer bestimmten Höhe (Y-Koordinate), z. B. unter Y 0 tief unter der Erde. Ein leeres Feld bedeutet: keine Grenze in diese Richtung.`,
    sky: `Nur, wenn der Ort freien Blick zum Himmel hat – also draußen, nicht in Höhlen oder unter einem Dach.`,
    light: `Nur bei einem bestimmten Lichtlevel: 0 = stockdunkel, 7 = dämmrig (Monster können spawnen), 15 = volles Tageslicht.`,
    killed_by_player: `Nur, wenn ein Spieler den Mob getötet oder kurz vorher verletzt hat (auch mit Pfeil). Verhindert, dass Mob-Farmen ohne Spieler (Fallschaden, Lava) diese Beute bekommen.`,
    on_fire: `Nur, wenn der Mob beim Tod brennt.`,
    is_baby: `Nur bei Baby-Mobs, z. B. Baby-Zombies.`,
    killer_type: `Nur, wenn der Mob von einem bestimmten Mob-Typ getötet wurde – z. B. von einem Wolf, Eisengolem oder Axolotl.`,
    silk_touch: `Nur, wenn das Werkzeug **Behutsamkeit** hat. Typisches Muster: Mit Behutsamkeit droppt der Block selbst, umgekehrt („NICHT“) die normalen Rohstoffe.`,
    tool_enchant: `Nur, wenn das Werkzeug eine bestimmte Verzauberung ab einer Stufe hat – z. B. „Glück ≥ III“ für einen Extra-Bonus.`,
    shears: `Nur beim Abbauen bzw. Scheren mit einer Schere – z. B. Laub oder Spinnennetze.`,
    tool_item: `Nur mit bestimmten Werkzeugen, z. B. nur mit einer Netherit-Spitzhacke. Mehrere Items: eines davon reicht. Auch Item-Tags wie #pickaxes sind möglich.`,
    survives_explosion: `Bei einer Explosion droppt der Eintrag nur mit einer gewissen Wahrscheinlichkeit (je größer die Explosion, desto seltener). Beim normalen Abbauen trifft die Bedingung immer zu.`,
    open_water: `Nur, wenn in **offenem Wasser** geangelt wird (rund 5×4×5 Blöcke freies Wasser ohne Hindernisse). Vanilla gibt nur dort Schätze.`,
    score: `Prüft einen Scoreboard-Wert – ideal für Server: z. B. bekommen nur Spieler ab Level 10, mit einem bestimmten Rang oder einer Quest-Stufe diese Beute.

Das Scoreboard-Ziel legst du selbst mit /scoreboard objectives add … an. „Dieses Entity“ ist bei Truhen der Spieler, der sie öffnet, bei Mob-Drops der Mob selbst.`
};

// Text → DOM (Absätze, Listen mit „• “, **fett**)
function renderHelp(text) {
    const inline = s => {
        const parts = String(s).split(/\*\*(.+?)\*\*/g);
        return parts.map((p, i) => i % 2 ? h('b', null, p) : p);
    };
    return String(text).trim().split(/\n\s*\n/).map(block => {
        const lines = block.split('\n');
        const items = lines.filter(l => l.startsWith('• '));
        if (items.length && items.length === lines.length) return h('ul', null, items.map(l => h('li', null, inline(l.slice(2)))));
        if (items.length) {
            // Einleitungssatz + Liste im selben Absatz
            const intro = lines.filter(l => !l.startsWith('• '));
            return h('div', null, h('p', null, inline(intro.join(' '))), h('ul', null, items.map(l => h('li', null, inline(l.slice(2))))));
        }
        return h('p', null, inline(lines.join(' ')));
    });
}

/* ---------- „?“-Knopf mit Popover ---------- */
let popEl = null;
let popAnchor = null;

function closePop() {
    if (popEl) popEl.remove();
    popEl = null;
    popAnchor = null;
}

function showPop(anchor, text, title) {
    if (popAnchor === anchor) { closePop(); return; }
    closePop();
    const content = typeof text === 'function' ? text() : text;
    popEl = h('div', { class: 'popover', role: 'dialog' },
        title ? h('div', { class: 'pop-title' }, title) : null,
        h('div', { class: 'pop-body' }, renderHelp(content)));
    popAnchor = anchor;
    document.body.append(popEl);
    const r = anchor.getBoundingClientRect();
    const w = popEl.offsetWidth, ph = popEl.offsetHeight;
    let left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
    let top = r.bottom + 8;
    if (top + ph > window.innerHeight - 8 && r.top - ph - 8 > 8) top = r.top - ph - 8;
    popEl.style.left = left + 'px';
    popEl.style.top = Math.max(8, top) + 'px';
}

function infoBtn(text, title) {
    return h('button', {
        type: 'button', class: 'info-btn', title: 'Erklärung anzeigen', 'aria-label': 'Erklärung' + (title ? ': ' + title : ''),
        onclick: ev => {
            // verhindert, dass ein umgebendes <summary> oder <label> mitreagiert
            ev.preventDefault();
            ev.stopPropagation();
            showPop(ev.currentTarget, text, title);
        }
    }, '?');
}

// Überschrift + „?“ (für Stellen ohne field())
function withInfo(labelEl, text, title) {
    labelEl.append(infoBtn(text, title));
    return labelEl;
}

// Kurzer Erklärtext in der Oberfläche (über „Erklärungen“ oben abschaltbar)
function explain(...content) {
    return h('div', { class: 'explain' }, content);
}

document.addEventListener('mousedown', e => {
    if (popEl && !popEl.contains(e.target) && !e.target.closest('.info-btn')) closePop();
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && popEl) { closePop(); e.stopImmediatePropagation(); }
}, true);
window.addEventListener('resize', closePop);
document.addEventListener('scroll', closePop, true);

/* ---------- Anleitung ---------- */
function guideDiagram() {
    const entry = (id, w, pct) => h('div', { class: 'g-entry' }, id ? icon(id, { eager: true }) : specialIcon('∅'),
        h('div', null, h('b', null, id ? itemName(id) : 'Nichts'), h('div', { class: 'muted' }, `Gewicht ${w} → ${pct}`)));
    return h('div', { class: 'g-diagram' },
        h('div', { class: 'g-table' },
            h('div', { class: 'g-head' }, icon('chest', { eager: true }), 'Loot-Table „meinserver:chests/dungeon“'),
            h('div', { class: 'g-pools' },
                h('div', { class: 'g-pool' },
                    h('div', { class: 'g-pool-head' }, 'Pool 1', h('span', { class: 'badge green' }, '2–3 Würfe')),
                    entry('bread', 6, '60 %'), entry('iron_ingot', 3, '30 %'), entry('diamond', 1, '10 %')),
                h('div', { class: 'g-pool' },
                    h('div', { class: 'g-pool-head' }, 'Pool 2', h('span', { class: 'badge green' }, '1 Wurf')),
                    entry('totem_of_undying', 1, '10 %'), entry(null, 9, '90 %')))),
        h('div', { class: 'g-result' }, '➜ Ergebnis z. B.: 2× Brot, 1× Eisen – und mit 10 % Glück zusätzlich ein Totem'));
}

const GUIDE_STEPS = [
    { title: 'Was ist eine Loot-Table?', icon: 'chest', body: () => [
        h('p', null, 'Eine ', h('b', null, 'Loot-Table'), ' legt fest, welche Beute Minecraft erzeugt: was in einer Truhe liegt, was ein Mob beim Tod fallen lässt, was ein Block beim Abbauen droppt oder was man beim Angeln fängt.'),
        h('p', null, 'Sie ist eine JSON-Datei in einem ', h('b', null, 'Datapack'), '. Diese App baut dir die Datei grafisch – du musst nie selbst JSON schreiben.'),
        h('div', { class: 'g-steps' },
            h('div', { class: 'g-step' }, h('span', { class: 'step-no' }, '1'), h('div', null, h('b', null, 'Links: Einstellungen'), h('div', { class: 'muted' }, 'Wofür ist die Loot-Table, wie heißt sie?'))),
            h('div', { class: 'g-step' }, h('span', { class: 'step-no' }, '2'), h('div', null, h('b', null, 'Mitte: Beute bauen'), h('div', { class: 'muted' }, 'Pools und Items mit Chancen, Mengen, Verzauberungen und Bedingungen.'))),
            h('div', { class: 'g-step' }, h('span', { class: 'step-no' }, '3'), h('div', null, h('b', null, 'Rechts: Ausgabe'), h('div', { class: 'muted' }, 'Fertige JSON herunterladen und ins Datapack legen.')))),
        h('p', { class: 'muted' }, 'Überall findest du kleine ', h('span', { class: 'info-btn static' }, '?'), '-Knöpfe mit Erklärungen und Beispielen.')
    ] },
    { title: 'Pools, Würfe & Einträge', icon: 'bundle', body: () => [
        h('p', null, 'Eine Loot-Table besteht aus einem oder mehreren ', h('b', null, 'Pools'), '. Ein Pool ist wie ein Lostopf mit ', h('b', null, 'Einträgen'), ' (Items). Die ', h('b', null, 'Würfe'), ' sagen, wie oft aus dem Topf gezogen wird.'),
        guideDiagram(),
        h('p', null, 'Jeder Pool wird für sich ausgewürfelt. So kombinierst du „immer etwas Normales“ (Pool 1) mit „manchmal etwas Seltenes“ (Pool 2).')
    ] },
    { title: 'Chancen berechnen', icon: 'diamond', body: () => [
        h('p', null, 'Jeder Eintrag hat ein ', h('b', null, 'Gewicht'), '. Die Chance pro Wurf ist:'),
        h('div', { class: 'g-formula' }, 'Chance = Gewicht ÷ Summe aller Gewichte im Pool'),
        h('p', null, 'Im Beispiel: Brot 6 + Eisen 3 + Diamant 1 = 10 → Diamant hat 1 ÷ 10 = ', h('b', null, '10 %'), ' pro Wurf. Die App rechnet das automatisch aus und zeigt es unter jedem Eintrag an.'),
        h('p', null, h('b', null, 'Seltene Beute bauen: '), 'Leg einen „Nichts“-Eintrag in den Pool. Diamant mit Gewicht 1 und „Nichts“ mit Gewicht 99 ergibt 1 % Diamant.'),
        h('p', null, h('b', null, 'Mehrere Würfe: '), 'Bei 3 Würfen und 10 % pro Wurf liegt die Chance, mindestens einen Diamanten zu bekommen, bei rund 27 %. Probier es mit dem ', h('b', null, 'Testwurf'), ' oben rechts aus – der zeigt dir auch eine Statistik.')
    ] },
    { title: 'Bedingungen & Extras', icon: 'clock', body: () => [
        h('p', null, h('b', null, 'Bedingungen'), ' (Umgebungsparameter) bestimmen, ', h('i', null, 'wann'), ' etwas droppt: Wetter, Tageszeit, Biom, Höhe, Werkzeug, „von Spieler getötet“, Scoreboard-Werte …'),
        h('ul', null,
            h('li', null, h('b', null, 'Am Pool: '), 'gilt für den ganzen Topf („nachts gibt es einen Extra-Pool“)'),
            h('li', null, h('b', null, 'Am Eintrag: '), 'gilt nur für dieses Item („Diamant nur bei Gewitter“)'),
            h('li', null, h('b', null, 'umkehren: '), 'macht daraus „NICHT …“'),
            h('li', null, h('b', null, 'UND / ODER: '), 'bei mehreren Bedingungen: alle oder eine davon')),
        h('p', null, 'Klickst du einen Eintrag an, kannst du außerdem ', h('b', null, 'Anzahl, Verzauberungen, Name, Beschreibung, Haltbarkeit, Tränke'), ' und mehr einstellen. Rechts im Fenster siehst du eine Vorschau, wie das Item im Spiel aussieht.'),
        h('p', { class: 'muted' }, 'Welche Bedingungen möglich sind, hängt vom Typ ab: Behutsamkeit gibt es z. B. nur bei Block-Drops, Plünderung nur bei Mob-Drops.')
    ] },
    { title: 'Ins Spiel bringen', icon: 'command_block', body: () => [
        h('p', null, 'So kommt deine Loot-Table auf den Server:'),
        h('ol', null,
            h('li', null, 'Oben das richtige ', h('b', null, 'Format'), ' für deine Minecraft-Version wählen'),
            h('li', null, h('b', null, 'JSON herunterladen')),
            h('li', null, 'Im Welt-Ordner diese Struktur anlegen:')),
        h('pre', { class: 'g-tree' }, 'world/\n└── datapacks/\n    └── MeinPack/\n        ├── pack.mcmeta\n        └── data/\n            └── meinserver/          ← Namespace\n                └── loot_table/\n                    └── chests/\n                        └── meine_truhe.json'),
        h('ol', { start: 4 },
            h('li', null, 'Die ', h('b', null, 'pack.mcmeta'), ' kopierst du links unter „So benutzt du die Datei“'),
            h('li', null, 'Im Spiel ', h('code', null, '/reload'), ' ausführen'),
            h('li', null, 'Testen mit ', h('code', null, '/loot give @s loot meinserver:chests/meine_truhe'))),
        h('p', { class: 'muted' }, 'Links findest du je nach Typ weitere fertige Befehle, z. B. zum Setzen einer Truhe oder zum Füllen von Regalen.')
    ] },
    { title: 'Tipps & häufige Fehler', icon: 'book', body: () => [
        h('ul', null,
            h('li', null, h('b', null, 'Nichts passiert? '), 'Stimmt das Format zur Server-Version? Liegt das Datapack in ', h('i', null, 'world/datapacks'), '? Mit ', h('code', null, '/datapack list'), ' siehst du, ob es aktiv ist.'),
            h('li', null, h('b', null, 'Truhe unverändert? '), 'Die Beute entsteht nur beim ersten Öffnen. Bereits geöffnete Truhen bleiben, wie sie sind – setz zum Testen eine neue.'),
            h('li', null, h('b', null, 'Vanilla-Beute ändern: '), 'Links „Vanilla-Loot-Table bearbeiten“ nutzen. Namespace muss ', h('b', null, 'minecraft'), ' bleiben, der Pfad genau wie im Original.'),
            h('li', null, h('b', null, 'Rote Hinweise '), 'rechts über der JSON beachten – dort steht, was noch fehlt oder nicht zur Version passt.'),
            h('li', null, h('b', null, 'Speichern: '), 'Der Browser merkt sich deinen Stand. Mit „Projekt speichern“ sicherst du ihn zusätzlich als Datei.'),
            h('li', null, h('b', null, 'Balance: '), 'Mit dem Testwurf und der Statistik siehst du, wie oft etwas wirklich droppt.'))
    ] }
];

GUIDE_STEPS.push(
    { title: 'Mob-Generator', icon: 'zombie_spawn_egg', body: () => [
        h('p', null, 'Oben über die Reiter wechselst du zum ', h('b', null, 'Mob-Generator'), '. Damit erstellst du eigene Mobs – z. B. einen Boss-Zombie mit Diamantrüstung, einen Händler mit eigenen Angeboten oder ein Deko-Schaf, das sich nicht bewegt.'),
        h('div', { class: 'g-steps' },
            h('div', { class: 'g-step' }, h('span', { class: 'step-no' }, '1'), h('div', null, h('b', null, 'Links: Mob wählen'), h('div', { class: 'muted' }, 'Nur Mobs, die es in deiner Version gibt.'))),
            h('div', { class: 'g-step' }, h('span', { class: 'step-no' }, '2'), h('div', null, h('b', null, 'Mitte: einstellen'), h('div', { class: 'muted' }, 'Name, Leben, Verhalten, eigene Eigenschaften, Ausrüstung, Attribute, Effekte, Drops, Handel, Reiter.'))),
            h('div', { class: 'g-step' }, h('span', { class: 'step-no' }, '3'), h('div', null, h('b', null, 'Rechts: Befehl'), h('div', { class: 'muted' }, '/summon, Spawn-Ei, Spawner oder .mcfunction – kopieren und im Spiel einfügen.')))),
        h('p', null, 'Die Optionen jedes Mobs stammen direkt aus den offiziellen Minecraft-Daten. Wechselst du oben die Version, passen sich Mobs, Optionen und die Schreibweise des Befehls automatisch an.')
    ] },
    { title: 'Mobs & Loot verbinden', icon: 'diamond_sword', body: () => [
        h('p', null, 'Beide Bereiche arbeiten zusammen:'),
        h('ul', null,
            h('li', null, 'Im Mob-Generator unter ', h('b', null, 'Drops'), ' auf „Neue Loot-Table für diesen Mob bauen“ klicken – du landest im Loot-Bereich mit einer fertigen Mob-Drop-Tabelle, die schon mit deinem Mob verknüpft ist.'),
            h('li', null, 'Oder umgekehrt: Bei einer Loot-Table vom Typ „Mob-Drops“ oben auf ', h('b', null, '„Für Mob verwenden“'), ' klicken.'),
            h('li', null, 'Die Item-Auswahl mit Bildern ist in beiden Bereichen dieselbe.')),
        h('p', null, 'Denk daran: Die Loot-Table muss als JSON im Datapack liegen, der Mob-Befehl verweist nur auf ihren Namen.')
    ] }
);
const GUIDE_MOB_START = GUIDE_STEPS.length - 2;

function openGuide(start = 0) {
    let i = start;
    const content = h('div', { class: 'guide-content' });
    const nav = h('div', { class: 'guide-nav' });
    const prev = h('button', { class: 'btn', onclick: () => go(i - 1) }, '← Zurück');
    const next = h('button', { class: 'btn btn-primary', onclick: () => (i < GUIDE_STEPS.length - 1 ? go(i + 1) : modal.close()) }, 'Weiter →');
    const go = n => {
        i = Math.max(0, Math.min(GUIDE_STEPS.length - 1, n));
        const s = GUIDE_STEPS[i];
        nav.replaceChildren(...GUIDE_STEPS.map((st, k) => h('button', {
            class: 'guide-tab' + (k === i ? ' on' : '') + (k < i ? ' done' : ''), onclick: () => go(k)
        }, h('span', { class: 'step-no' }, k + 1), st.title)));
        content.replaceChildren(h('h3', { class: 'guide-title' }, icon(s.icon, { eager: true }), s.title), ...s.body());
        prev.disabled = i === 0;
        next.textContent = i === GUIDE_STEPS.length - 1 ? 'Los geht’s!' : 'Weiter →';
        content.scrollTop = 0;
    };
    const modal = openModal({
        title: 'Anleitung', wide: true, iconEl: icon('book', { eager: true }),
        body: h('div', { class: 'guide' }, nav, content),
        foot: [prev, next],
        onClose: () => { try { localStorage.setItem('lootbuilder.guideSeen', '1'); } catch { /* egal */ } }
    });
    go(i);
}

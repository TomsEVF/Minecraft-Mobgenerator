'use strict';

/* =====================================================================
 * Mob-Generator
 *
 * Die Felder jedes Mobs kommen aus js/mobdata.js (generiert aus den offiziellen
 * NBT-Schemas, je Version). Die Oberfläche baut sich daraus automatisch auf –
 * gezeigt wird nur, was es in der gewählten Minecraft-Version wirklich gibt.
 * Nutzt Bausteine aus app.js (h, icon, field, openModal, openItemPicker …).
 * ===================================================================== */
const MD = window.MOB_DATA;
const MOB_BY_ID = new Map(MD.mobs.map(m => [m.id, m]));
const BASE_ORIGINS = new Set(['EntityBase', 'LivingEntity', 'MobBase', 'FallDamageLogicData']);
const MOB_CATS = [['all', 'Alle'], ['passive', 'Friedlich'], ['neutral', 'Neutral'], ['hostile', 'Feindlich'], ['boss', 'Bosse'], ['other', 'Sonstige']];
const CAT_LABEL = Object.fromEntries(MOB_CATS);
const MOB_ICON_FALLBACK = { armor_stand: 'armor_stand', giant: 'zombie_head', illusioner: 'bow', mannequin: 'player_head' };
const vAtLeast = id => versionIndex() >= versionIndex(id);

// Felder, die nie angezeigt werden (intern, UUIDs, Laufzeitwerte des Spiels)
const HIDE = new Set([
    'Pos', 'Motion', 'UUID', 'OnGround', 'PortalCooldown', 'FallDistance', 'fall_distance', 'data', 'HurtTime', 'HurtByTimestamp',
    'DeathTime', 'FallFlying', 'SleepingX', 'SleepingY', 'SleepingZ', 'sleeping_pos', 'Brain', 'last_hurt_by_player',
    'last_hurt_by_player_memory_time', 'last_hurt_by_mob', 'ticks_since_last_hurt_by_mob', 'locator_bar_icon',
    'current_explosion_impact_pos', 'current_impulse_context_reset_grace_time', 'DeathLootTableSeed', 'leash', 'Leash',
    'LoveCause', 'Owner', 'owner', 'AngryAt', 'angry_at', 'anger_end_time', 'Gossips', 'LastGossipDecay', 'LastRestock',
    'RestocksToday', 'HurtBy', 'listener', 'anger', 'Trusted', 'Thrower', 'patrol_target', 'wander_target', 'RaidId', 'Wave',
    'TravelPosX', 'TravelPosY', 'TravelPosZ', 'TreasurePosX', 'TreasurePosY', 'TreasurePosZ', 'TicksSincePollination',
    'CropsGrownSincePollination', 'MoreCarrotTicks', 'wasOnGround', 'pickup_timer', 'sitting_damage_received', 'stew_effects',
    'still_timeout', 'ConversionPlayer', 'DragonDeathTime', 'Inventory', 'Items', 'SaddleItem', 'Saddle', 'DecorItem', 'ArmorItem',
    'EatingHaystack', 'CannotEnterHiveTicks', 'DuplicationCooldown', 'from_bucket',
    // stehen in den Schemas, werden vom Spiel aber nicht gelesen (im Server-Test geprüft)
    'IsSitting', 'LastPoseTick', 'PlayerSpawned'
]);
// Felder mit eigener Oberfläche (Name, Ausrüstung, Attribute …)
const OWN_UI = new Set([
    'CustomName', 'CustomNameVisible', 'Rotation', 'Tags', 'Passengers', 'Health', 'attributes', 'active_effects',
    'ArmorItems', 'HandItems', 'ArmorDropChances', 'HandDropChances', 'body_armor_item', 'body_armor_drop_chance', 'equipment',
    'drop_chances', 'DeathLootTable', 'Offers'
]);
// Allgemeine Felder für den Bereich „Verhalten“ (Reihenfolge = Anzeige)
const BEHAVIOR = ['NoAI', 'Invulnerable', 'PersistenceRequired', 'Silent', 'Glowing', 'NoGravity', 'CanPickUpLoot', 'LeftHanded',
    'HasVisualFire', 'Fire', 'AbsorptionAmount', 'Air', 'TicksFrozen', 'Team', 'home_pos', 'home_radius', 'invulnerable_time'];
// Mobs ohne Baby-Form: Alters-Felder stehen zwar im Schema, wirken aber nicht (im Server-Test geprüft)
const NO_BABY = new Set(['parrot', 'frog', 'camel_husk', 'zombie_nautilus']);
const AGE_FIELDS = new Set(['Age', 'ForcedAge', 'AgeLocked', 'IsBaby', 'InLove']);
// Wahrheitswerte, die im Spiel standardmäßig „an“ sind
const DEFAULT_TRUE = new Set(['HasLeftHorn', 'HasRightHorn', 'Pumpkin', 'CanDuplicate']);

// Deutsche Beschriftungen: Feldname → [Beschriftung, Erklärung]
const FIELD_DE = {
    NoAI: ['Keine KI (steht still)', 'Der Mob bewegt sich nicht, dreht sich nicht und greift nicht an. Ideal für Deko-Mobs oder Händler an festen Plätzen.'],
    Invulnerable: ['Unverwundbar', 'Nimmt keinen Schaden – außer von Spielern im Kreativmodus und durch /kill.'],
    PersistenceRequired: ['Verschwindet nie', 'Mobs verschwinden normalerweise, wenn kein Spieler in der Nähe ist (Despawn). Angehakt bleibt der Mob für immer.'],
    Silent: ['Lautlos', 'Der Mob macht keine Geräusche.'],
    Glowing: ['Leuchtender Umriss', 'Der Mob ist durch Wände als Umriss sichtbar – wie mit dem Effekt „Leuchten“.'],
    NoGravity: ['Keine Schwerkraft (schwebt)', 'Der Mob fällt nicht herunter und bleibt in der Luft stehen.'],
    CanPickUpLoot: ['Hebt Items auf', 'Der Mob sammelt herumliegende Items und Rüstung auf und benutzt sie.'],
    LeftHanded: ['Linkshänder', 'Hält die Waffe in der linken Hand.'],
    HasVisualFire: ['Brennt (nur optisch)', 'Der Mob sieht aus, als würde er brennen, nimmt aber keinen Schaden.'],
    Fire: ['Brennt für … Ticks', '20 Ticks = 1 Sekunde. Der Mob brennt so lange (und nimmt Schaden).'],
    AbsorptionAmount: ['Extra-Herzen (Absorption)', 'Goldene Zusatz-Herzen. 2 = ein ganzes Herz.'],
    Air: ['Luft unter Wasser (Ticks)', 'Wie lange der Mob noch unter Wasser atmen kann. 300 = voll (15 Sekunden).'],
    TicksFrozen: ['Eingefroren (Ticks)', 'Wie lange der Mob schon im Pulverschnee steckt. Ab 140 friert er und nimmt Schaden.'],
    Team: ['Team', 'Der Mob tritt beim Erscheinen diesem Team bei. Das Team legst du vorher mit /team add … an.'],
    home_pos: ['Heimat-Position (x y z)', 'Der Mob bleibt in der Nähe dieses Punktes – zusammen mit dem Heimat-Radius.'],
    home_radius: ['Heimat-Radius', 'Wie weit (in Blöcken) sich der Mob von seiner Heimat entfernen darf. -1 = keine Heimat.'],
    invulnerable_time: ['Kurz unverwundbar (Ticks)', 'Der Mob ist für diese Zeit unverwundbar, danach wieder normal.'],
    Age: ['Alter (Ticks)', 'Negativ = Baby, z. B. -24000 = in 20 Minuten erwachsen. 0 = erwachsen. Oben gibt es dafür auch den Schalter „Baby“.'],
    ForcedAge: ['Erzwungenes Alter', 'Wert, den das Alter beim Erwachsenwerden bekommt. Meist 0 lassen.'],
    AgeLocked: ['Wächst nie auf', 'Das Baby bleibt für immer ein Baby.'],
    InLove: ['Paarungsbereit (Ticks)', 'Wie lange der Mob im „Liebesmodus“ mit Herzchen ist.'],
    IsBaby: ['Baby', 'Der Mob ist ein Baby (kleiner und schneller).'],
    Sitting: ['Sitzt', 'Gezähmte Tiere bleiben sitzen, bis man sie anklickt.'],
    AngerTime: ['Wütend für … Ticks', 'So lange greift der Mob an. 20 Ticks = 1 Sekunde.'],
    Anger: ['Wütend für … Ticks', 'So lange greift die Biene an.'],
    variant: ['Variante', 'Das Aussehen des Mobs, z. B. Fellfarbe oder Muster.'],
    sound_variant: ['Stimme', 'Welche Geräusche der Mob macht.'],
    Variant: ['Variante', 'Das Aussehen des Mobs.'],
    Size: ['Größe', 'Größe des Schleims. 0 = klein, 1 = mittel, 3 = groß. Höhere Werte gehen auch (bis 126) – Achtung, riesig!'],
    size: ['Größe', 'Größe des Phantoms. 0 = normal, höhere Werte = größer und stärker.'],
    CanBreakDoors: ['Kann Türen einschlagen', 'Der Zombie kann Holztüren zerstören (normalerweise nur auf „Schwer“).'],
    DrownedConversionTime: ['Wird Ertrunkener in … Ticks', '-1 = verwandelt sich gerade nicht.'],
    InWaterTime: ['Zeit unter Wasser (Ticks)', 'Ab 600 Ticks unter Wasser beginnt die Verwandlung zum Ertrunkenen.'],
    FromBucket: ['Aus einem Eimer (verschwindet nie)', 'Mobs aus einem Eimer despawnen nicht.'],
    IsImmuneToZombification: ['Wird nie zum Zombie', 'Piglins und Hoglins verwandeln sich in der Oberwelt normalerweise nach 15 Sekunden in Zombies. Angehakt passiert das nie.'],
    TimeInOverworld: ['Zeit in der Oberwelt (Ticks)', 'Ab 300 Ticks verwandelt sich der Mob in einen Zombie.'],
    CollarColor: ['Halsbandfarbe', 'Farbe des Halsbands (nur bei gezähmten Tieren sichtbar).'],
    Color: ['Farbe', 'Farbe der Wolle bzw. der Schale.'],
    Type: ['Art', 'Welche Art bzw. Farbe der Mob hat.'],
    AttachFace: ['Hängt an Seite', 'An welcher Blockseite der Shulker festsitzt.'],
    BatFlags: ['Hängt kopfüber', 'Die Fledermaus schläft kopfüber an der Decke.'],
    Bred: ['Wurde gezüchtet', 'Nur ein interner Merker.'],
    CanDuplicate: ['Kann sich vervielfältigen', 'Ein Allay vervielfältigt sich beim Tanzen, wenn man ihm eine Amethystscherbe gibt.'],
    CanJoinRaid: ['Kann an Überfällen teilnehmen', 'Der Mob schließt sich einem Überfall in der Nähe an.'],
    CannotBeHunted: ['Wird nicht von Piglins gejagt', 'Piglins greifen diesen Hoglin nicht an.'],
    CannotHunt: ['Jagt keine Hoglins', 'Dieser Piglin greift keine Hoglins an.'],
    Crouching: ['Duckt sich', 'Der Fuchs duckt sich (Anschleichen).'],
    DarkTicksRemaining: ['Dunkel für … Ticks', 'Nach Schaden leuchtet der Leuchttintenfisch eine Weile nicht.'],
    DespawnDelay: ['Verschwindet nach … Ticks', 'Nach dieser Zeit verschwindet der wandernde Händler. 0 = nie.'],
    DisabledSlots: ['Gesperrte Plätze (Bitmaske)', 'Verhindert, dass Spieler Rüstung/Items vom Rüstungsständer nehmen oder anlegen. 4144959 sperrt alles.'],
    DragonPhase: ['Flugverhalten', 'Was der Enderdrache gerade tut.'],
    EggLayTime: ['Nächstes Ei in … Ticks', 'Zeit, bis das Huhn wieder ein Ei legt.'],
    ExplosionPower: ['Explosionsstärke', 'Stärke der Feuerbälle. Standard 1 – höhere Werte zerstören sehr viel!'],
    ExplosionRadius: ['Explosionsradius', 'Standard 3. Achtung: große Werte zerstören sehr viel!'],
    FoodLevel: ['Nahrungsvorrat', 'Ab 12 kann sich der Dorfbewohner vermehren.'],
    Fuse: ['Zündschnur (Ticks)', 'Zeit vom Zischen bis zur Explosion. Standard 30 = 1,5 Sekunden.'],
    fuse: ['Zündschnur (Ticks)', 'Zeit bis zur Explosion.'],
    GotFish: ['Hat einen Fisch bekommen', 'Der Delfin führt dann zu einem Schatz.'],
    HasEgg: ['Trägt ein Ei', 'Die Schildkröte legt bald Eier am Heimatstrand.'],
    has_egg: ['Trägt ein Ei', 'Die Schildkröte legt bald Eier am Heimatstrand.'],
    HasLeftHorn: ['Hat linkes Horn', 'Ziegen haben normalerweise zwei Hörner.'],
    HasRightHorn: ['Hat rechtes Horn', 'Ziegen haben normalerweise zwei Hörner.'],
    HasNectar: ['Hat Nektar', 'Die Biene trägt Pollen.'],
    HasStung: ['Hat gestochen', 'Die Biene hat ihren Stachel verloren und stirbt bald.'],
    HiddenGene: ['Verstecktes Gen', 'Wird an Nachwuchs vererbt.'],
    MainGene: ['Sichtbares Gen (Persönlichkeit)', 'Bestimmt Aussehen und Verhalten des Pandas.'],
    HomePosX: ['Heimatstrand X', 'Wo die Schildkröte ihre Eier ablegt.'],
    HomePosY: ['Heimatstrand Y', 'Wo die Schildkröte ihre Eier ablegt.'],
    HomePosZ: ['Heimatstrand Z', 'Wo die Schildkröte ihre Eier ablegt.'],
    Invisible: ['Unsichtbar', 'Der Rüstungsständer selbst ist unsichtbar – Rüstung und Items bleiben sichtbar.'],
    Invul: ['Aufladezeit beim Erscheinen (Ticks)', 'So lange ist der Wither nach dem Erscheinen unverwundbar und lädt sich auf. 220 = wie beim Bauen.'],
    IsChickenJockey: ['Hühnerreiter', 'Das Huhn trägt einen Baby-Zombie und verschwindet wie ein Monster.'],
    IsScreamingGoat: ['Schreiende Ziege', 'Macht lautere Geräusche und rammt öfter.'],
    LifeTicks: ['Lebensdauer (Ticks)', 'Danach nimmt der Plagegeist Schaden und stirbt.'],
    life_ticks: ['Lebensdauer (Ticks)', 'Danach nimmt der Plagegeist Schaden und stirbt.'],
    Lifetime: ['Alter (Ticks)', 'Nach 2400 Ticks (2 Minuten) verschwindet die Endermite.'],
    Marker: ['Marker (keine Hitbox)', 'Winzige Hitbox, kann nicht angeklickt werden – gut für Deko.'],
    NoBasePlate: ['Ohne Bodenplatte', 'Blendet die Steinplatte am Boden aus.'],
    ShowArms: ['Mit Armen', 'Zeigt Arme, damit der Rüstungsständer Items halten kann.'],
    Small: ['Klein', 'Halb so großer Rüstungsständer.'],
    Pose: ['Körperhaltung (Grad)', 'Drehung der Körperteile in Grad (x, y, z).'],
    Moistness: ['Feuchtigkeit', 'Delfine an Land trocknen langsam aus. 2400 = voll.'],
    PatrolLeader: ['Patrouillen-Anführer', 'Trägt ein Banner und gibt beim Tod „Böses Omen“.'],
    Patrolling: ['Auf Patrouille', 'Der Mob läuft als Teil einer Patrouille herum.'],
    Peek: ['Öffnet die Schale', 'Wie weit der Shulker seine Schale geöffnet hat.'],
    PlayerCreated: ['Von Spieler gebaut', 'Ein von Spielern gebauter Eisengolem greift Spieler nie an.'],
    PlayerSpawned: ['Von Spieler erzeugt', 'Nur ein interner Merker.'],
    Pumpkin: ['Trägt Kürbis', 'Ohne Kürbis sieht man das Gesicht des Schneegolems.'],
    RabbitType: ['Kaninchenart', 'Fellfarbe – oder das feindliche Killerkaninchen.'],
    Sheared: ['Geschoren', 'Das Schaf hat keine Wolle.'],
    sheared: ['Geschoren', 'Der Sumpfskelett hat keine Pilze mehr.'],
    StrayConversionTime: ['Wird Eiswanderer in … Ticks', '-1 = verwandelt sich gerade nicht.'],
    Tame: ['Gezähmt', 'Das Pferd ist gezähmt und kann geritten werden.'],
    Temper: ['Zähmungsfortschritt', 'Je höher, desto leichter lässt sich das Tier zähmen (0–100).'],
    Trusting: ['Vertraut Spielern', 'Der Ozelot flieht nicht vor Spielern.'],
    VillagerData: ['Dorfbewohner-Daten', 'Beruf, Stufe und Aussehen.'],
    'VillagerData.level': ['Stufe (1–5)', '1 = Neuling … 5 = Meister. Bestimmt das Abzeichen am Gürtel.'],
    'VillagerData.profession': ['Beruf', 'Nur Dorfbewohner mit Beruf können handeln (nicht „Ohne Beruf“ oder „Nichtsnutz“).'],
    'VillagerData.type': ['Aussehen (Biom)', 'Kleidung passend zum Biom.'],
    VillagerDataFinalized: ['Beruf festgelegt', 'Der Dorfbewohner wechselt seinen Beruf nicht mehr.'],
    Xp: ['Handels-Erfahrung', 'Bestimmt, wann der Dorfbewohner die nächste Stufe erreicht (10 / 70 / 150 / 250).'],
    anchor_pos: ['Kreis-Mittelpunkt (x y z)', 'Um diesen Punkt kreist das Phantom.'],
    bound_pos: ['Bewegungsbereich (x y z)', 'In der Nähe dieses Punktes fliegt der Plagegeist.'],
    BoundX: ['Bewegungsbereich X', 'In der Nähe dieses Punktes fliegt der Plagegeist.'],
    BoundY: ['Bewegungsbereich Y', 'In der Nähe dieses Punktes fliegt der Plagegeist.'],
    BoundZ: ['Bewegungsbereich Z', 'In der Nähe dieses Punktes fliegt der Plagegeist.'],
    AX: ['Kreis-Mittelpunkt X', 'Um diesen Punkt kreist das Phantom.'],
    AY: ['Kreis-Mittelpunkt Y', 'Um diesen Punkt kreist das Phantom.'],
    AZ: ['Kreis-Mittelpunkt Z', 'Um diesen Punkt kreist das Phantom.'],
    carriedBlockState: ['Hält Block', 'Den Block, den der Enderman in den Händen trägt.'],
    flower_pos: ['Lieblingsblume (x y z)', 'Die Biene fliegt zu dieser Blume.'],
    hive_pos: ['Bienenstock (x y z)', 'Das Zuhause der Biene.'],
    ignited: ['Gezündet (explodiert sofort)', 'Der Creeper beginnt sofort zu zischen und explodiert.'],
    powered: ['Geladen (Blitz-Creeper)', 'Blau leuchtender Creeper mit doppelt so starker Explosion.'],
    scute_time: ['Nächstes Hornschild in … Ticks', 'Zeit, bis das Gürteltier wieder ein Hornschild abwirft.'],
    state: ['Zustand', 'Ob das Gürteltier eingerollt ist.'],
    next_weather_age: ['Nächste Oxidation (Ticks)', '-2 = gewachst (oxidiert nie), -1 = zufällige Zeit.'],
    weather_state: ['Oxidationsstufe', 'Wie stark der Kupfergolem schon angelaufen ist.'],
    profile: ['Skin (Spielername)', 'Der Mannequin trägt den Skin dieses Spielers.'],
    hidden_layers: ['Ausgeblendete Skin-Ebenen', 'Diese Teile der zweiten Skin-Ebene werden versteckt.'],
    main_hand: ['Haupthand', 'Welche Hand die Haupthand ist.'],
    pose: ['Pose', 'Körperhaltung des Mannequins.'],
    immovable: ['Unbeweglich', 'Kann nicht weggeschoben werden.'],
    description: ['Beschreibung', 'Zweite Textzeile unter dem Namen. Wird ignoriert, wenn „Beschreibung ausblenden“ aktiv ist.'],
    hide_description: ['Beschreibung ausblenden', 'Blendet die Zeile unter dem Namen aus.'],
    ChestedHorse: ['Trägt eine Truhe', 'Esel, Maultiere und Lamas können eine Truhe tragen.'],
    Strength: ['Stärke (Truhenplätze)', '1–5: bestimmt, wie viele Plätze die Truhe eines Lamas hat (3 je Stärke).'],
    ConversionTime: ['Heilung abgeschlossen in … Ticks', '-1 = wird gerade nicht geheilt.'],
    PuffState: ['Aufgeblasen', 'Wie weit der Kugelfisch aufgebläht ist.'],
    DespawnDelay_: ['', '']
};

// Muster für Tropenfische (Größe 0 = klein, 1 = groß)
const FISH_PATTERNS = [
    [0, 0, 'Kob'], [0, 1, 'Sonnenstreifen'], [0, 2, 'Schnüffler'], [0, 3, 'Flitzer'], [0, 4, 'Brinely'], [0, 5, 'Gefleckt'],
    [1, 0, 'Flopper'], [1, 1, 'Streifen'], [1, 2, 'Glitzer'], [1, 3, 'Blockfisch'], [1, 4, 'Betty'], [1, 5, 'Tonfisch']
];
const DYES = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
const DYE_DE = ['Weiß', 'Orange', 'Magenta', 'Hellblau', 'Gelb', 'Hellgrün', 'Rosa', 'Grau', 'Hellgrau', 'Türkis', 'Violett', 'Blau', 'Braun', 'Grün', 'Rot', 'Schwarz'];

// Bekannte Attribute: [min, max, Hinweis]
const ATTR_INFO = {
    max_health: [1, 1024, 'Standard meist 20 (= 10 Herzen)'], movement_speed: [0, 1024, 'Zombie 0,23 · Spieler 0,1'],
    attack_damage: [0, 2048, 'Schaden pro Treffer (2 = 1 Herz)'], armor: [0, 30, 'Wie Rüstungspunkte (20 = volle Diamantrüstung)'],
    armor_toughness: [0, 20, 'Diamant 2 pro Teil, Netherit 3'], knockback_resistance: [0, 1, '1 = kein Rückstoß'],
    follow_range: [0, 2048, 'Wie weit der Mob Spieler bemerkt (Blöcke)'], attack_knockback: [0, 5, 'Stärke des Rückstoßes'],
    attack_speed: [0, 1024, ''], scale: [0.0625, 16, '1 = normal, 2 = doppelt so groß'], step_height: [0, 10, 'Blöcke, die er hochlaufen kann (0,6 = Stufe)'],
    jump_strength: [0, 32, 'Sprungkraft'], gravity: [-1, 1, 'Standard 0,08'], safe_fall_distance: [-1024, 1024, 'Fallhöhe ohne Schaden (3)'],
    fall_damage_multiplier: [0, 100, '0 = kein Fallschaden'], burning_time: [0, 1024, '0 = brennt nicht lange'],
    explosion_knockback_resistance: [0, 1, ''], movement_efficiency: [0, 1, ''], water_movement_efficiency: [0, 1, '1 = wie an Land'],
    oxygen_bonus: [0, 1024, 'Längere Luft unter Wasser'], flying_speed: [0, 1024, ''], luck: [-1024, 1024, ''],
    max_absorption: [0, 2048, ''], spawn_reinforcements: [0, 1, 'Chance, dass Zombies Verstärkung rufen'],
    tempt_range: [0, 2048, 'Wie weit Futter das Tier anlockt'], camera_distance: [0, 32, '']
};

/* ---------- Zustand ---------- */
function newItem(id) {
    return { id, count: 1, ench: [], name: { text: '', color: '', bold: false, italic: false }, lore: [], unbreakable: false,
        glint: '', color: '', trim: { material: '', pattern: '' }, damage: '' };
}

function newMobState(id = 'zombie') {
    return {
        id,
        name: { text: '', color: '', bold: false, italic: false, visible: false },
        health: '',
        baby: false,
        base: {},
        spec: {},
        rot: { yaw: '', pitch: '' },
        tags: [],
        equip: {},
        drop: {},
        attrs: [],
        effects: [],
        passengers: [],
        mount: '',
        trades: [],
        loot: { mode: 'default', value: '' },
        extra: '',
        out: {
            type: 'summon', pos: '~ ~ ~', target: '@p', eggCount: 1, eggName: '',
            spawner: { SpawnCount: 4, SpawnRange: 4, Delay: 20, MinSpawnDelay: 200, MaxSpawnDelay: 800, MaxNearbyEntities: 6, RequiredPlayerRange: 16, light: false, blockLight: 15, skyLight: 15 },
            fn: { ns: '', name: '', cmd: 'summon' }
        }
    };
}

let mob = newMobState();
let mobCat = 'all';
let mobSearch = '';
const openMobSections = new Set(['look', 'spec']);

function loadMobState() {
    try {
        const s = JSON.parse(localStorage.getItem('mobgen.state') || 'null');
        if (s && s.id) mob = withDefaults(newMobState(s.id), s);
    } catch { /* kaputter Speicherstand */ }
}
const saveMob = debounce(() => {
    try { localStorage.setItem('mobgen.state', JSON.stringify(mob)); } catch { /* voll */ }
}, 300);

/* ---------- Daten-Helfer ---------- */
const curMob = () => MOB_BY_ID.get(mob.id) || MD.mobs[0];
const mobAvailable = (m, vi = versionIndex()) => m.avail[0] <= vi && vi <= m.avail[1];

function mobFields(m = curMob(), vi = versionIndex()) {
    return m.f.filter(([, a, b]) => a <= vi && vi <= b).map(([d]) => MD.defs[d])
        .filter(d => !(NO_BABY.has(m.id) && AGE_FIELDS.has(d.n)));
}
function fieldMap(m = curMob()) {
    return new Map(mobFields(m).map(d => [d.n, d]));
}
function regOptions(reg, vi = versionIndex()) {
    const r = MD.regs[reg];
    if (!r) return null;
    return r.v.filter(([id]) => { const a = r.avail[id]; return !a || (a[0] <= vi && vi <= a[1]); });
}
const regLabel = (reg, id) => MD.regs[reg]?.v.find(x => x[0] === id)?.[1] || id;
const shortAttr = id => String(id).replace(/^(generic|player|zombie|horse)\./, '');

function mobIconId(m) {
    if (m.egg && availIn('items', m.egg)) return m.egg;
    return MOB_ICON_FALLBACK[m.id] || m.egg || 'spawner';
}
const mobName = m => m.de;
function fieldLabel(name, def) {
    const d = FIELD_DE[name];
    if (d && d[0]) return d[0];
    return String(name).replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
}
function fieldHelp(name, def) {
    const d = FIELD_DE[name];
    if (d && d[1]) return d[1];
    return def?.d ? def.d + '\n\n(Originalbeschreibung aus der Minecraft-Dokumentation, englisch)' : null;
}
function slotsOf(m = curMob()) {
    const extra = MD.slots[m.id] || [];
    const list = [['head', 'Kopf'], ['chest', 'Brust'], ['legs', 'Beine'], ['feet', 'Füße'], ['mainhand', 'Haupthand'], ['offhand', 'Nebenhand']];
    if (extra.includes('body')) list.push(['body', 'Körper']);
    if (extra.includes('saddle')) list.push(['saddle', 'Sattel']);
    return list;
}

/* =====================================================================
 * SNBT-Ausgabe (versionsabhängig)
 * ===================================================================== */
const q = s => JSON.stringify(String(s));   // SNBT-Zeichenkette in doppelten Anführungszeichen
const nsId = id => { id = String(id || '').trim(); return id.includes(':') ? id : 'minecraft:' + id; };
const fnum = (v, suffix) => { const n = Number(v); return (Number.isInteger(n) ? String(n) : String(+n.toFixed(6))) + suffix; };

// Textkomponente: ab 1.21.5 als SNBT-Objekt, davor als JSON-Text in '…'
function textComponent(t, defaults = {}) {
    const o = { text: t.text };
    const color = t.color || defaults.color;
    if (color) o.color = color;
    if (t.bold) o.bold = true;
    if (t.italic != null || defaults.italic != null) o.italic = !!(t.italic ?? defaults.italic);
    if (vAtLeast('1.21.5')) {
        return '{' + Object.entries(o).map(([k, v]) => `${k}:${typeof v === 'boolean' ? v : q(v)}`).join(',') + '}';
    }
    return "'" + JSON.stringify(o).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

function itemComponents(it) {
    const c = [];
    const ench = it.ench.filter(e => e.id && availIn('enchantments', e.id));
    if (ench.length) {
        const map = '{' + ench.map(e => `${q(nsId(e.id))}:${Math.max(1, Math.round(Number(e.lvl) || 1))}`).join(',') + '}';
        // Verzauberte Bücher speichern ihre Verzauberungen als „stored_enchantments“
        const key = strip(it.id) === 'enchanted_book' ? 'stored_enchantments' : 'enchantments';
        c.push(`"minecraft:${key}":${vAtLeast('1.21.5') ? map : '{levels:' + map + '}'}`);
    }
    if (it.name.text) c.push(`"minecraft:custom_name":${textComponent(it.name, { italic: false })}`);
    const lore = it.lore.filter(l => l.text);
    if (lore.length) c.push(`"minecraft:lore":[${lore.map(l => textComponent(l, { color: 'gray', italic: false })).join(',')}]`);
    if (it.unbreakable) c.push('"minecraft:unbreakable":{}');
    if (it.glint === 'on') c.push('"minecraft:enchantment_glint_override":true');
    if (it.glint === 'off') c.push('"minecraft:enchantment_glint_override":false');
    if (it.color && D.dyeable.includes(strip(it.id))) {
        const rgb = parseInt(it.color.slice(1), 16);
        c.push(`"minecraft:dyed_color":${vAtLeast('1.21.5') ? rgb : '{rgb:' + rgb + '}'}`);
    }
    if (it.trim.material && it.trim.pattern && D.trimmable.includes(strip(it.id))) {
        c.push(`"minecraft:trim":{material:${q(nsId(it.trim.material))},pattern:${q(nsId(it.trim.pattern))}}`);
    }
    const info = itemInfo(it.id);
    if (it.damage !== '' && info?.maxDamage) {
        const dmg = Math.round(info.maxDamage * (1 - Math.min(100, Math.max(0, Number(it.damage))) / 100));
        if (dmg > 0) c.push(`"minecraft:damage":${dmg}`);
    }
    return c;
}

function itemSnbt(it) {
    const parts = [`id:${q(nsId(it.id))}`];
    const n = Math.max(1, Math.round(Number(it.count) || 1));
    if (n !== 1) parts.push(`count:${n}`);
    const c = itemComponents(it);
    if (c.length) parts.push(`components:{${c.join(',')}}`);
    return '{' + parts.join(',') + '}';
}

// Allgemeiner Wert aus dem Schema → SNBT
function snbtValue(t, v) {
    switch (t.k) {
        case 'boolean': return v ? '1b' : '0b';
        case 'byte': return Math.round(Number(v)) + 'b';
        case 'short': return Math.round(Number(v)) + 's';
        case 'int': return String(Math.round(Number(v)));
        case 'long': return Math.round(Number(v)) + 'L';
        case 'float': return fnum(v, 'f');
        case 'double': return fnum(v, 'd');
        case 'id': return q(nsId(v));
        case 'string': return q(v);
        case 'enum': {
            if (t.base === 'string') return q(v);
            return String(v);
        }
        case 'struct': {
            const parts = [];
            for (const [name, [ft]] of Object.entries(t.fields || {})) {
                const val = v?.[name];
                if (!isSet(ft, val)) continue;
                parts.push(`${snbtKey(name)}:${snbtValue(ft, val)}`);
            }
            return '{' + parts.join(',') + '}';
        }
        case 'list': {
            const of = t.of || { k: 'string' };
            return '[' + (v || []).filter(x => x !== '' && x != null).map(x => snbtValue(of, x)).join(',') + ']';
        }
        case 'array': return `[I;${(v || []).map(x => Math.round(Number(x) || 0)).join(',')}]`;
        default: return String(v);
    }
}
const snbtKey = k => /^[A-Za-z0-9_\-.+]+$/.test(k) ? k : q(k);

function isSet(t, v) {
    if (v === undefined || v === null || v === '') return false;
    if (t.k === 'struct') return Object.entries(t.fields || {}).some(([n, [ft]]) => isSet(ft, v[n]));
    if (t.k === 'list' || t.k === 'array') return Array.isArray(v) && v.some(x => x !== '' && x != null);
    return true;
}

// Welche Darstellung für ein Schema-Feld? (Unions werden auf eine einfache Variante reduziert)
function simpleType(t) {
    if (!t) return null;
    if (t.k === 'union') {
        for (const a of t.alts) {
            const s = simpleType(a);
            if (s) return s;
        }
        return null;
    }
    if (['boolean', 'byte', 'short', 'int', 'long', 'float', 'double', 'id', 'string', 'enum'].includes(t.k)) return t;
    if (t.k === 'struct' && t.fields && !t.deep) return t;
    if (t.k === 'list' && t.size && t.size[0] === t.size[1] && ['float', 'double', 'int'].includes(t.of?.k)) return t;
    if (t.k === 'list' && t.of?.k === 'enum') return t;
    if (t.k === 'array' && t.of === 'int' && !t.uuid && t.size && t.size[0] === 3) return t;
    return null;
}

// Sonderfelder mit eigener Darstellung/Ausgabe
const SPECIAL = {
    Variant: {
        when: m => m.id === 'tropical_fish',
        render: (store, key, ch) => tropicalFishEditor(store, key, ch),
        emit: v => {
            if (!v) return null;
            const size = Number(v.size) || 0, pattern = Number(v.pattern) || 0;
            return String(size | (pattern << 8) | ((Number(v.base) || 0) << 16) | ((Number(v.patternColor) || 0) << 24));
        }
    },
    carriedBlockState: {
        render: (store, key, ch) => blockPickField(store, key, ch),
        // ab 26.3 reicht die Block-ID, vorher {Name:"…"}
        emit: v => v ? (vAtLeast('26.3') ? q(nsId(v)) : `{Name:${q(nsId(v))}}`) : null
    },
    profile: {
        render: (store, key, ch) => textInput(store, key, { ch, placeholder: 'z. B. Notch', style: 'max-width:240px' }),
        emit: v => v ? `{name:${q(v)}}` : null
    },
    description: {
        render: (store, key, ch) => textInput(store, key, { ch, placeholder: 'Text unter dem Namen', style: 'max-width:320px' }),
        emit: v => v ? textComponent({ text: v }) : null
    }
};

function mobSpecialFor(name) {
    const sp = SPECIAL[name];
    return sp && (!sp.when || sp.when(curMob())) ? sp : null;
}

/* ---------- Kompletter NBT-Block des Mobs ---------- */
function buildMobNbt(opts = {}) {
    const m = curMob();
    const fm = fieldMap(m);
    const parts = [];
    const has = n => fm.has(n);
    const push = (k, v) => { if (v != null && v !== '') parts.push(`${snbtKey(k)}:${v}`); };

    // Name
    if (mob.name.text && has('CustomName')) {
        push('CustomName', textComponent(mob.name, { italic: false }));
        if (mob.name.visible) push('CustomNameVisible', '1b');
    }
    // Leben
    const hp = Number(mob.health);
    if (mob.health !== '' && hp > 0 && has('Health')) push('Health', fnum(hp, 'f'));

    // Baby
    if (mob.baby) {
        if (has('IsBaby')) push('IsBaby', '1b');
        else if (has('Age')) push('Age', '-24000');
    }

    // Verhalten + mob-spezifische Felder
    const emitField = (name, store) => {
        const def = fm.get(name);
        if (!def || HIDE.has(name) || OWN_UI.has(name)) return;
        if (mob.baby && (name === 'IsBaby' || name === 'Age')) return;
        const sp = mobSpecialFor(name);
        const v = store[name];
        if (sp) { push(name, sp.emit(v)); return; }
        const t = simpleType(def.t);
        if (!t || !isSet(t, v)) return;
        if (t.k === 'boolean' && DEFAULT_TRUE.has(name) && v === true) return;
        push(name, snbtValue(t, v));
    };
    BEHAVIOR.forEach(n => emitField(n, mob.base));
    for (const def of mobFields(m)) {
        if (!BASE_ORIGINS.has(def.o) && !BEHAVIOR.includes(def.n)) emitField(def.n, mob.spec);
    }

    // Drehung
    if ((mob.rot.yaw !== '' || mob.rot.pitch !== '') && has('Rotation')) {
        push('Rotation', `[${fnum(Number(mob.rot.yaw) || 0, 'f')},${fnum(Number(mob.rot.pitch) || 0, 'f')}]`);
    }
    // Tags
    if (mob.tags.length && has('Tags')) push('Tags', '[' + mob.tags.map(q).join(',') + ']');

    // Ausrüstung
    equipmentNbt(m, fm).forEach(([k, v]) => push(k, v));

    // Attribute (+ automatisch max. Gesundheit, wenn Leben über 20)
    const attrs = mob.attrs.filter(a => a.id && a.base !== '' && regOptions('attribute').some(([id]) => id === a.id));
    const maxHealthId = regOptions('attribute').find(([id]) => shortAttr(id) === 'max_health')?.[0];
    if (mob.health !== '' && hp > 20 && maxHealthId && !attrs.some(a => a.id === maxHealthId)) attrs.push({ id: maxHealthId, base: hp });
    if (attrs.length && has('attributes')) {
        push('attributes', '[' + attrs.map(a => `{id:${q(nsId(a.id))},base:${fnum(Number(a.base), 'd')}}`).join(',') + ']');
    }
    // Effekte
    const eff = mob.effects.filter(e => e.id && regOptions('mob_effect').some(([id]) => id === e.id));
    if (eff.length && has('active_effects')) {
        push('active_effects', '[' + eff.map(e => {
            const p = [`id:${q(nsId(e.id))}`];
            const amp = Math.max(0, Math.min(255, Math.round(Number(e.level) || 1) - 1));
            if (amp) p.push(`amplifier:${amp}b`);
            p.push(`duration:${e.infinite ? -1 : Math.max(1, Math.round((Number(e.seconds) || 30) * 20))}`);
            if (!e.particles) p.push('show_particles:0b');
            if (e.ambient) p.push('ambient:1b');
            return '{' + p.join(',') + '}';
        }).join(',') + ']');
    }
    // Drops
    const lt = lootTableId();
    if (lt && has('DeathLootTable')) push('DeathLootTable', q(lt));

    // Handel
    if (has('Offers') && mob.trades.length) {
        const rec = mob.trades.filter(tr => tr.buy?.id && tr.sell?.id).map(tr => {
            const p = [`buy:${costSnbt(tr.buy)}`];
            if (tr.buyB?.id) p.push(`buyB:${costSnbt(tr.buyB)}`);
            p.push(`sell:${itemSnbt(tr.sell)}`);
            p.push(`maxUses:${Math.max(1, Math.round(Number(tr.maxUses) || 1))}`);
            if (Number(tr.xp)) p.push(`xp:${Math.round(Number(tr.xp))}`);
            p.push(`rewardExp:${tr.rewardExp ? '1b' : '0b'}`);
            if (tr.priceMultiplier !== '' && Number(tr.priceMultiplier)) p.push(`priceMultiplier:${fnum(Number(tr.priceMultiplier), 'f')}`);
            return '{' + p.join(',') + '}';
        });
        if (rec.length) push('Offers', `{Recipes:[${rec.join(',')}]}`);
    }
    // Passagiere
    const pas = mob.passengers.filter(p => p.id && MOB_BY_ID.has(p.id) && mobAvailable(MOB_BY_ID.get(p.id)));
    if (pas.length && has('Passengers')) {
        push('Passengers', '[' + pas.map(p => {
            const pp = [`id:${q(nsId(p.id))}`];
            if (p.baby) pp.push(MOB_BY_ID.get(p.id).f.some(([d]) => MD.defs[d].n === 'IsBaby') ? 'IsBaby:1b' : 'Age:-24000');
            if (p.name) pp.push(`CustomName:${textComponent({ text: p.name }, { italic: false })}`);
            return '{' + pp.join(',') + '}';
        }).join(',') + ']');
    }
    // Eigenes NBT
    const extra = mob.extra.trim().replace(/^\{|\}$/g, '').trim();
    if (extra) parts.push(extra);

    if (opts.withId) parts.unshift(`id:${q(nsId(m.id))}`);
    return parts;
}

function costSnbt(it) {
    const n = Math.max(1, Math.round(Number(it.count) || 1));
    return `{id:${q(nsId(it.id))}${n !== 1 ? `,count:${n}` : ''}}`;
}

const DROP_DEFAULT = 0.085;
function dropValue(slot) {
    const d = mob.drop[slot];
    if (!d || d.mode === 'default') return null;
    if (d.mode === 'never') return 0;
    if (d.mode === 'always') return 2;
    return Math.max(0, Math.min(100, Number(d.pct) || 0)) / 100;
}

function equipmentNbt(m, fm) {
    const out = [];
    const slots = slotsOf(m).map(s => s[0]);
    const items = Object.fromEntries(slots.filter(s => mob.equip[s]?.id && availIn('items', mob.equip[s].id)).map(s => [s, mob.equip[s]]));
    const anyDrop = slots.some(s => dropValue(s) != null);
    if (!Object.keys(items).length && !anyDrop) return out;

    if (fm.has('equipment')) {
        // ab 1.21.5
        const eq = slots.filter(s => items[s]).map(s => `${s}:${itemSnbt(items[s])}`);
        if (eq.length) out.push(['equipment', '{' + eq.join(',') + '}']);
        const dc = slots.filter(s => dropValue(s) != null).map(s => `${s}:${fnum(dropValue(s), 'f')}`);
        if (dc.length && fm.has('drop_chances')) out.push(['drop_chances', '{' + dc.join(',') + '}']);
        return out;
    }
    // vor 1.21.5: getrennte Listen
    const it = s => items[s] ? itemSnbt(items[s]) : '{}';
    const df = s => fnum(dropValue(s) ?? DROP_DEFAULT, 'f');
    if (['feet', 'legs', 'chest', 'head'].some(s => items[s]) && fm.has('ArmorItems')) out.push(['ArmorItems', `[${it('feet')},${it('legs')},${it('chest')},${it('head')}]`]);
    if (['mainhand', 'offhand'].some(s => items[s]) && fm.has('HandItems')) out.push(['HandItems', `[${it('mainhand')},${it('offhand')}]`]);
    if (['feet', 'legs', 'chest', 'head'].some(s => dropValue(s) != null) && fm.has('ArmorDropChances')) out.push(['ArmorDropChances', `[${df('feet')},${df('legs')},${df('chest')},${df('head')}]`]);
    if (['mainhand', 'offhand'].some(s => dropValue(s) != null) && fm.has('HandDropChances')) out.push(['HandDropChances', `[${df('mainhand')},${df('offhand')}]`]);
    if (items.body && fm.has('body_armor_item')) out.push(['body_armor_item', itemSnbt(items.body)]);
    if (dropValue('body') != null && fm.has('body_armor_drop_chance')) out.push(['body_armor_drop_chance', fnum(dropValue('body'), 'f')]);
    if (items.saddle) {
        if (fm.has('Saddle')) out.push(['Saddle', '1b']);
        else if (fm.has('SaddleItem')) out.push(['SaddleItem', itemSnbt(items.saddle)]);
    }
    return out;
}

function lootTableId() {
    const l = mob.loot;
    if (l.mode === 'none') return 'minecraft:empty';
    if (l.mode === 'current') return `${T().namespace}:${T().path}`;
    if (l.mode === 'vanilla' && l.value) return 'minecraft:' + l.value;
    if (l.mode === 'custom' && l.value.trim()) return nsId(l.value.trim());
    return '';
}

/* ---------- Befehle ---------- */
function summonCommand(pos = mob.out.pos) {
    const m = curMob();
    const nbt = buildMobNbt();
    if (mob.mount && MOB_BY_ID.has(mob.mount)) {
        // Der Mob reitet auf einem anderen Mob: der Reittier-Mob wird beschworen
        const rider = `{${[`id:${q(nsId(m.id))}`, ...nbt].join(',')}}`;
        return `/summon ${nsId(mob.mount)} ${pos} {Passengers:[${rider}]}`;
    }
    return `/summon ${nsId(m.id)} ${pos}${nbt.length ? ' {' + nbt.join(',') + '}' : ''}`;
}

function eggCommand() {
    const m = curMob();
    const egg = m.egg && availIn('items', m.egg) ? m.egg : null;
    if (!egg) return null;
    const data = `{${buildMobNbt({ withId: true }).join(',')}}`;
    const comps = [`minecraft:entity_data=${data}`];
    if (mob.out.eggName) comps.push(`minecraft:custom_name=${textComponent({ text: mob.out.eggName }, { italic: false })}`);
    const n = Math.max(1, Math.round(Number(mob.out.eggCount) || 1));
    return `/give ${mob.out.target || '@p'} ${nsId(egg)}[${comps.join(',')}]${n !== 1 ? ' ' + n : ''}`;
}

function spawnerCommand(pos = mob.out.pos) {
    const sp = mob.out.spawner;
    const entity = `{${buildMobNbt({ withId: true }).join(',')}}`;
    let spawnData = `{entity:${entity}`;
    if (sp.light) spawnData += `,custom_spawn_rules:{block_light_limit:[0,${Math.round(sp.blockLight)}],sky_light_limit:[0,${Math.round(sp.skyLight)}]}`;
    spawnData += '}';
    const keys = ['SpawnCount', 'SpawnRange', 'Delay', 'MinSpawnDelay', 'MaxSpawnDelay', 'MaxNearbyEntities', 'RequiredPlayerRange'];
    const extra = keys.map(k => `${k}:${Math.max(0, Math.round(Number(sp[k]) || 0))}s`).join(',');
    return `/setblock ${pos} minecraft:spawner{SpawnData:${spawnData},${extra}} replace`;
}

function currentCommand(type = mob.out.type) {
    if (type === 'egg') return eggCommand();
    if (type === 'spawner') return spawnerCommand();
    if (type === 'function') {
        const inner = mob.out.fn.cmd === 'egg' ? eggCommand() : mob.out.fn.cmd === 'spawner' ? spawnerCommand() : summonCommand();
        return inner;
    }
    return summonCommand();
}

function functionFile() {
    const cmd = currentCommand('function');
    const m = curMob();
    return `# ${mob.name.text || mobName(m)} – erstellt mit Minecraft Tools (${versionLabel()})\n${(cmd || '').replace(/^\//, '')}\n`;
}
function functionIds() {
    const ns = (mob.out.fn.ns || T().namespace || 'meinserver').toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
    const slug = (mob.out.fn.name || (mob.name.text || mob.id)).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/ß/g, 'ss').replace(/[^a-z0-9_./-]+/g, '_').replace(/^_+|_+$/g, '') || 'mob';
    return { ns, name: slug };
}

/* =====================================================================
 * Oberfläche
 * ===================================================================== */
function renderMobView() {
    renderMobList();
    renderMobEditor();
    renderMobOutput();
}
const mobChanged = debounce(() => { saveMob(); renderMobOutput(); }, 60);
const mobRedraw = debounce(() => { saveMob(); renderMobEditor(); renderMobOutput(); }, 30);

/* ---------- Mob-Liste ---------- */
function renderMobList() {
    const el = $('#mob-list');
    const vi = versionIndex();
    const input = h('input', { type: 'text', placeholder: 'Mob suchen…', value: mobSearch, spellcheck: 'false' });
    const grid = h('div', { class: 'mob-grid' });
    const draw = () => {
        const q2 = mobSearch.trim().toLowerCase();
        const list = MD.mobs.filter(m => mobAvailable(m, vi))
            .filter(m => mobCat === 'all' || m.cat === mobCat)
            .filter(m => !q2 || m.de.toLowerCase().includes(q2) || m.id.includes(q2.replace(/ /g, '_')))
            .sort((a, b) => a.de.localeCompare(b.de, 'de'));
        grid.replaceChildren(...list.map(m => h('button', {
            class: 'mob-pick' + (m.id === mob.id ? ' on' : ''), title: `${m.de}\nminecraft:${m.id}`,
            onclick: () => selectMob(m.id)
        }, icon(mobIconId(m)), h('span', null, m.de), m.avail[0] > 0 ? h('small', null, 'ab ' + VERSIONS[m.avail[0]].id) : null)),
        ...(list.length ? [] : [h('div', { class: 'picker-empty' }, 'Kein Mob gefunden.')]));
    };
    input.addEventListener('input', debounce(() => { mobSearch = input.value; draw(); }, 100));
    const total = MD.mobs.filter(m => mobAvailable(m, vi)).length;
    el.replaceChildren(
        h('h2', null, h('span', { class: 'step-no' }, '1'), 'Mob wählen', infoBtn(HELP_MOB.list, 'Mob wählen')),
        explain(`${total} Mobs gibt es in ${versionLabel()}. Neuere Mobs erscheinen automatisch, wenn du oben eine passende Version wählst.`),
        input,
        h('div', { class: 'seg mob-cats' }, MOB_CATS.map(([k, l]) => h('button', {
            type: 'button', class: mobCat === k ? 'on' : '', onclick: () => { mobCat = k; renderMobList(); }
        }, l))),
        grid);
    draw();
}

function selectMob(id) {
    if (id === mob.id) return;
    const keep = mob;
    mob = newMobState(id);
    // allgemeine Einstellungen mitnehmen, mob-spezifische zurücksetzen
    for (const k of ['name', 'health', 'base', 'rot', 'tags', 'attrs', 'effects', 'loot', 'extra', 'out']) mob[k] = keep[k];
    const m = curMob();
    const slotIds = slotsOf(m).map(s => s[0]);
    for (const s of slotIds) { if (keep.equip[s]) mob.equip[s] = keep.equip[s]; if (keep.drop[s]) mob.drop[s] = keep.drop[s]; }
    saveMob();
    renderMobView();
}

/* ---------- Editor ---------- */
function mobSection(key, title, sub, content, help) {
    const d = h('details', { class: 'esec', open: openMobSections.has(key) || undefined },
        h('summary', null, title, help ? infoBtn(help, title) : null, sub ? h('span', { class: 'sub' }, sub) : null),
        h('div', { class: 'esec-body' }, content));
    d.addEventListener('toggle', () => { d.open ? openMobSections.add(key) : openMobSections.delete(key); });
    return d;
}

function renderMobEditor() {
    const el = $('#mob-editor');
    const m = curMob();
    const vi = versionIndex();
    const fm = fieldMap(m);
    if (!mobAvailable(m, vi)) {
        const a = m.avail;
        el.replaceChildren(h('div', { class: 'panel' },
            h('h2', null, mobName(m)),
            h('p', null, `Diesen Mob gibt es in ${versionLabel()} nicht (${vi < a[0] ? 'erst ab ' + VERSIONS[a[0]].id : 'nur bis ' + VERSIONS[a[1]].id}). Wähle links einen anderen Mob oder oben eine andere Version.`)));
        return;
    }
    const sections = [];

    // Kopf-Banner
    const specCount = mobFields(m).filter(d => !BASE_ORIGINS.has(d.o) && !HIDE.has(d.n) && !OWN_UI.has(d.n) && (simpleType(d.t) || mobSpecialFor(d.n))).length;
    sections.push(h('div', { class: 'scene mob-scene scene-' + m.cat },
        h('div', { class: 'scene-icon bob' }, icon(mobIconId(m), { eager: true, cls: 'big' })),
        h('div', { style: 'flex:1;min-width:0' },
            h('h2', null, mob.name.text || mobName(m), infoBtn(HELP_MOB.scene, 'Mob-Generator')),
            h('p', null, `minecraft:${m.id} · ${CAT_LABEL[m.cat] || 'Sonstige'} · ${specCount} eigene Einstellungen in ${versionLabel()}`)),
        h('div', { class: 'scene-meta' },
            h('span', { class: 'badge' }, m.avail[0] > 0 ? 'Seit ' + VERSIONS[m.avail[0]].id : 'Seit vor 1.21'),
            h('span', { class: 'badge' }, m.egg && availIn('items', m.egg) ? 'Hat Spawn-Ei' : 'Kein Spawn-Ei'))));
    sections.push(explain(h('span', { class: 'step-no' }, '2'), h('span', null, h('b', null, 'Mob einstellen: '),
        'Öffne die Bereiche und stelle ein, was du brauchst – alles andere bleibt wie im normalen Spiel. Rechts entsteht sofort der fertige Befehl.')));

    // 1. Name & Aussehen
    const hasBaby = fm.has('IsBaby') || fm.has('Age');
    const scaleId = regOptions('attribute').find(([id]) => shortAttr(id) === 'scale')?.[0];
    const scaleAttr = scaleId ? mob.attrs.find(a => a.id === scaleId) : null;
    sections.push(mobSection('look', 'Name & Aussehen', mob.name.text ? `„${mob.name.text}“` : null, h('div', null,
        fm.has('CustomName') ? field('Name über dem Kopf', h('div', { class: 'list-row', style: 'margin:0' },
            h('input', { type: 'text', value: mob.name.text, placeholder: mobName(m), style: 'flex:1;min-width:160px',
                oninput: ev => { mob.name.text = ev.target.value; mobChanged(); } }),
            colorInput(mob.name, 'color', mobChanged),
            checkInput(mob.name, 'bold', 'fett', { ch: mobChanged }),
            checkInput(mob.name, 'italic', 'kursiv', { ch: mobChanged })), null, HELP_MOB.name) : null,
        mob.name.text ? h('div', { class: 'field' }, checkInput(mob.name, 'visible', 'Name immer sichtbar (nicht nur beim Anschauen)', { ch: mobChanged })) : null,
        h('div', { class: 'grid-2' },
            hasBaby ? h('div', { class: 'field' }, checkInput(mob, 'baby', 'Baby', { ch: mobChanged, after: mobRedraw, help: HELP_MOB.baby })) : null,
            scaleId ? field('Größe (1 = normal)', h('input', {
                type: 'number', min: 0.0625, max: 16, step: 0.1, value: scaleAttr ? scaleAttr.base : '', placeholder: '1',
                oninput: ev => {
                    const v = ev.target.value;
                    const idx = mob.attrs.findIndex(a => a.id === scaleId);
                    if (v === '') { if (idx >= 0) mob.attrs.splice(idx, 1); } else if (idx >= 0) mob.attrs[idx].base = +v; else mob.attrs.push({ id: scaleId, base: +v });
                    mobChanged();
                }
            }), '0,0625 bis 16 – z. B. 3 für einen Riesen', HELP_MOB.scale) : null),
        fm.has('Rotation') ? field('Blickrichtung', h('div', { class: 'range-input' },
            numInput(mob.rot, 'yaw', { ch: mobChanged, width: 90, placeholder: 'Drehung' }), h('span', null, '° Drehung'),
            numInput(mob.rot, 'pitch', { ch: mobChanged, width: 90, placeholder: 'Neigung' }), h('span', null, '° Neigung')),
            '0 = Süden, 90 = Westen, 180 = Norden, -90 = Osten. Wirkt dauerhaft nur mit „Keine KI“.', HELP_MOB.rotation) : null
    ), HELP_MOB.look));

    // 2. Leben & Verhalten
    const behaviorEls = BEHAVIOR.filter(n => fm.has(n)).map(n => genericField(fm.get(n), mob.base, n, mobChanged)).filter(Boolean);
    sections.push(mobSection('behavior', 'Leben & Verhalten', null, h('div', null,
        fm.has('Health') ? field('Lebenspunkte', numInput(mob, 'health', { min: 0, step: 1, width: 120, ch: mobChanged, placeholder: 'Standard' }),
            '2 = ein Herz. Über 20 wird automatisch auch die maximale Gesundheit erhöht.', HELP_MOB.health) : null,
        h('div', { class: 'gen-grid' }, behaviorEls),
        fm.has('Tags') ? field('Tags', chipList(mob.tags, new Map(), { ch: mobChanged, placeholder: 'Tag eingeben und Enter …', emptyText: 'Keine Tags' }),
            null, HELP_MOB.tags) : null
    ), HELP_MOB.behavior));

    // 3. Mob-spezifisch
    const specDefs = mobFields(m).filter(d => !BASE_ORIGINS.has(d.o) && !BEHAVIOR.includes(d.n) && !HIDE.has(d.n) && !OWN_UI.has(d.n));
    const specEls = specDefs.filter(d => d.n !== 'IsBaby' && !(mob.baby && d.n === 'Age')).map(d => genericField(d, mob.spec, d.n, mobChanged)).filter(Boolean);
    sections.push(mobSection('spec', `Eigenschaften: ${mobName(m)}`, specEls.length ? `${specEls.length} Optionen` : 'keine',
        specEls.length ? h('div', { class: 'gen-grid' }, specEls)
            : h('div', { class: 'empty-note' }, `${mobName(m)} hat in ${versionLabel()} keine eigenen Einstellungen – nutze die allgemeinen Bereiche.`),
        HELP_MOB.spec));

    // 4. Ausrüstung
    if (fm.has('equipment') || fm.has('ArmorItems') || fm.has('HandItems')) {
        sections.push(mobSection('equip', 'Ausrüstung', Object.values(mob.equip).filter(x => x?.id).length ? `${Object.values(mob.equip).filter(x => x?.id).length} Teile` : null,
            equipmentEditor(m, fm), HELP_MOB.equip));
    }

    // 5. Attribute
    if (fm.has('attributes')) sections.push(mobSection('attrs', 'Attribute (Werte)', mob.attrs.length ? `${mob.attrs.length}` : null, attributeEditor(), HELP_MOB.attrs));
    // 6. Effekte
    if (fm.has('active_effects')) sections.push(mobSection('effects', 'Effekte', mob.effects.length ? `${mob.effects.length}` : null, effectEditor(), HELP_MOB.effects));
    // 7. Drops
    if (fm.has('DeathLootTable')) sections.push(mobSection('loot', 'Drops (Loot-Table)', lootTableId() || null, lootEditor(), HELP_MOB.loot));
    // 8. Handel
    if (fm.has('Offers')) sections.push(mobSection('trades', 'Handel', mob.trades.length ? `${mob.trades.length} Angebote` : null, tradeEditor(fm), HELP_MOB.trades));
    // 9. Reiter
    if (fm.has('Passengers')) sections.push(mobSection('riders', 'Reiter & Reittier', (mob.passengers.length || mob.mount) ? 'aktiv' : null, riderEditor(), HELP_MOB.riders));
    // 10. Erweitert
    sections.push(mobSection('extra', 'Eigenes NBT (Experten)', mob.extra.trim() ? 'aktiv' : null, h('div', null,
        explain('Für alles, was es oben nicht gibt: zusätzliche NBT-Einträge, die unverändert angehängt werden. Beispiel: ', h('code', null, 'Motion:[0.0d,1.0d,0.0d]')),
        h('textarea', { rows: 3, spellcheck: 'false', placeholder: 'Schlüssel:Wert,Schlüssel:Wert', value: mob.extra,
            oninput: ev => { mob.extra = ev.target.value; mobChanged(); }, style: 'font-family:var(--mono);font-size:12.5px' })
    ), HELP_MOB.extra));

    el.replaceChildren(...sections);
}

/* ---------- Allgemeiner Feld-Editor (aus dem Schema) ---------- */
function genericField(def, store, key, ch, labelPath) {
    const sp = mobSpecialFor(def.n);
    const label = fieldLabel(labelPath || def.n, def);
    const help = fieldHelp(labelPath || def.n, def);
    if (sp) return field(label, sp.render(store, key, ch), null, help);
    const t = simpleType(def.t);
    if (!t) return null;
    const range = t.range ? t.range : null;
    const hintFromRange = range ? `${range[0] ?? '…'} bis ${range[1] ?? '…'}` : null;
    switch (t.k) {
        case 'boolean': {
            const dflt = DEFAULT_TRUE.has(def.n);
            const obj = { v: store[key] ?? dflt };
            return h('div', { class: 'field gen-bool' }, checkInput(obj, 'v', label, {
                ch: () => { store[key] = obj.v; if (obj.v === dflt) delete store[key]; ch(); }, help
            }));
        }
        case 'byte': case 'short': case 'int': case 'long': case 'float': case 'double': {
            const intLike = ['byte', 'short', 'int', 'long'].includes(t.k);
            return field(label, numInput(store, key, {
                min: range?.[0] ?? undefined, max: range?.[1] ?? undefined, step: intLike ? 1 : 'any', width: 130, ch, placeholder: 'Standard'
            }), hintFromRange, help);
        }
        case 'id': {
            const opts = regOptions(t.reg);
            if (opts) return field(label, selectInput(store, key, [['', '– Standard –'], ...opts], { ch, style: 'max-width:260px' }), null, help);
            return field(label, textInput(store, key, { ch, placeholder: 'minecraft:…', style: 'max-width:260px' }), null, help);
        }
        case 'string':
            return field(label, textInput(store, key, { ch, style: 'max-width:260px' }), null, help);
        case 'enum':
            return field(label, selectInput(store, key, [['', '– Standard –'], ...t.values.map(v => [v[0], v[1]])], { ch, style: 'max-width:260px' }), null, help);
        case 'struct': {
            if (!store[key] || typeof store[key] !== 'object') store[key] = {};
            const sub = store[key];
            const kids = Object.entries(t.fields || {}).map(([n, [ft, doc]]) => genericField({ n, t: ft, d: doc, o: def.o }, sub, n, ch, `${def.n}.${n}`)).filter(Boolean);
            if (!kids.length) return null;
            return h('div', { class: 'field gen-struct' }, h('label', null, label, help ? infoBtn(help, label) : null), h('div', { class: 'gen-grid' }, kids));
        }
        case 'list': {
            if (t.of?.k === 'enum') {
                if (!Array.isArray(store[key])) store[key] = [];
                const arr = store[key];
                return field(label, h('div', { class: 'chips' }, t.of.values.map(([v, l]) => h('label', { class: 'chip', style: 'padding-right:10px' },
                    h('input', { type: 'checkbox', checked: arr.includes(v), style: 'accent-color:var(--accent)',
                        onchange: ev => { const i = arr.indexOf(v); if (ev.target.checked && i < 0) arr.push(v); if (!ev.target.checked && i >= 0) arr.splice(i, 1); ch(); } }),
                    l))), null, help);
            }
            const n = t.size[0];
            if (!Array.isArray(store[key])) store[key] = Array(n).fill('');
            const arr = store[key];
            const names = n === 3 ? ['x', 'y', 'z'] : Array.from({ length: n }, (_, i) => String(i + 1));
            return wide(field(label, h('div', { class: 'range-input' }, arr.slice(0, n).map((_, i) => [h('span', null, names[i]), numInput(arr, i, { ch, width: 70 })])), null, help));
        }
        case 'array': {
            if (!Array.isArray(store[key])) store[key] = ['', '', ''];
            const arr = store[key];
            return wide(field(label, h('div', { class: 'range-input' }, ['x', 'y', 'z'].map((n, i) => [h('span', null, n), numInput(arr, i, { ch, width: 76, step: 1 })])), null, help));
        }
    }
    return null;
}

const wide = el => { el.classList.add('gen-wide'); return el; };

function tropicalFishEditor(store, key, ch) {
    if (!store[key] || typeof store[key] !== 'object') store[key] = { size: 0, pattern: 0, base: 0, patternColor: 0 };
    const v = store[key];
    const patternSel = h('select', {
        value: `${v.size}:${v.pattern}`,
        onchange: e => { const [s, p] = e.target.value.split(':'); v.size = +s; v.pattern = +p; ch(); }
    }, FISH_PATTERNS.map(([s, p, l]) => h('option', { value: `${s}:${p}` }, `${l} (${s ? 'groß' : 'klein'})`)));
    const colorSel = k => h('select', { value: String(v[k]), onchange: e => { v[k] = +e.target.value; ch(); } }, DYE_DE.map((l, i) => h('option', { value: String(i) }, l)));
    return h('div', { class: 'gen-grid' },
        field('Muster', patternSel), field('Grundfarbe', colorSel('base')), field('Musterfarbe', colorSel('patternColor')));
}

function blockPickField(store, key, ch) {
    const wrap = h('div', { class: 'row' });
    const draw = () => wrap.replaceChildren(
        store[key] ? h('span', { class: 'chip' }, icon(store[key]), itemName(store[key]),
            h('button', { type: 'button', onclick: () => { delete store[key]; ch(); draw(); } }, '×')) : h('span', { class: 'muted' }, 'kein Block'),
        h('button', { type: 'button', class: 'btn btn-small', onclick: () => openItemPicker({
            title: 'Block wählen', filter: id => ITEMS.get(id)?.block, onPick: id => { store[key] = id; ch(); draw(); }
        }) }, 'Block wählen…'));
    draw();
    return wrap;
}

/* ---------- Ausrüstung ---------- */
function equipmentEditor(m, fm) {
    const wrap = h('div');
    const draw = () => {
        const cards = slotsOf(m).map(([slot, label]) => {
            const it = mob.equip[slot];
            const valid = it?.id && availIn('items', it.id);
            const slotItemsFilter = (slot === 'body' || slot === 'saddle')
                ? id => { const e = D.equip[id]; return e && e[0] === slot && (!e[1] || e[1].includes(m.id)); }
                : null;
            const pick = () => openItemPicker({
                title: `${label}: Item wählen`, filter: slotItemsFilter,
                onPick: id => { mob.equip[slot] = newItem(id); mobChanged(); draw(); openMobItemEditor(slot); }
            });
            const d = mob.drop[slot] || { mode: 'default', pct: 50 };
            return h('div', { class: 'equip-card' + (valid ? '' : ' empty') },
                h('div', { class: 'equip-slot-label' }, label),
                h('button', { class: 'slot equip-slot' + (valid && isItemGlint(it) ? ' glint' : ''), title: valid ? itemName(it.id) : 'Item wählen', onclick: () => valid ? openMobItemEditor(slot) : pick() },
                    valid ? icon(it.id) : h('span', { class: 'plus' }, '+'), valid && it.count > 1 ? h('span', { class: 'count' }, it.count) : null),
                h('div', { class: 'equip-name' }, valid ? (it.name.text || itemName(it.id)) : 'leer'),
                valid ? h('div', { class: 'row', style: 'gap:4px;justify-content:center' },
                    h('button', { class: 'btn btn-small', onclick: () => openMobItemEditor(slot) }, 'Bearbeiten'),
                    h('button', { class: 'icon-btn', title: 'Entfernen', onclick: () => { delete mob.equip[slot]; mobChanged(); draw(); } }, '🗑')) : null,
                h('select', {
                    class: 'drop-select', title: 'Chance, dass der Mob dieses Teil beim Tod fallen lässt',
                    value: d.mode, onchange: e => { mob.drop[slot] = { ...d, mode: e.target.value }; mobChanged(); draw(); }
                }, [['default', 'Drop: Standard'], ['never', 'Drop: nie'], ['always', 'Drop: immer'], ['custom', 'Drop: eigene %']].map(([v, l]) => h('option', { value: v }, l))),
                d.mode === 'custom' ? h('div', { class: 'range-input', style: 'justify-content:center' },
                    h('input', { type: 'number', min: 0, max: 100, value: d.pct, style: 'width:70px', oninput: e => { mob.drop[slot] = { ...d, mode: 'custom', pct: e.target.value }; mobChanged(); } }), h('span', null, '%')) : null);
        });
        wrap.replaceChildren(...[
            explain('Klicke einen Platz an, um ein Item auszuwählen – danach kannst du Verzauberungen, Namen, Farbe und mehr einstellen. Darunter legst du fest, ob der Mob das Teil beim Tod fallen lässt.'),
            h('div', { class: 'equip-grid' }, cards),
            !fm.has('equipment') ? h('div', { class: 'hint', style: 'margin-top:8px' }, `In ${versionLabel()} wird die Ausrüstung noch im alten Format (ArmorItems/HandItems) geschrieben – das erledigt der Generator automatisch.`) : null
        ].filter(Boolean));
    };
    draw();
    return wrap;
}

function isItemGlint(it) {
    if (it.glint === 'on') return true;
    if (it.glint === 'off') return false;
    return it.ench.length > 0;
}

function openMobItemEditor(slot, target) {
    const it = target || mob.equip[slot];
    if (!it) return;
    const body = h('div');
    const info = itemInfo(it.id);
    const preview = h('div');
    const ch = () => { mobChanged(); drawPreview(); };
    const drawPreview = () => preview.replaceChildren(h('div', { class: 'mc-tooltip' },
        h('div', { style: `color:${it.name.text ? mcColor(it.name.color, '#FFFFFF') : '#FFFFFF'};${it.name.bold ? 'font-weight:700;' : ''}${it.name.italic ? 'font-style:italic;' : ''}` }, it.name.text || itemName(it.id)),
        ...it.ench.filter(e => e.id).map(e => h('div', { style: 'color:#AAAAAA' }, `${enchName(e.id)} ${roman(Number(e.lvl) || 1)}`)),
        ...it.lore.filter(l => l.text).map(l => h('div', { style: `color:${mcColor(l.color, '#AAAAAA')};${l.italic ? 'font-style:italic' : ''}` }, l.text)),
        it.unbreakable ? h('div', { style: 'color:#5555FF' }, 'Unzerbrechlich') : null,
        h('div', { class: 'muted' }, 'minecraft:' + strip(it.id))));
    const enchBox = h('div');
    const drawEnch = () => {
        const opts = ENCH_LIST.filter(x => availIn('enchantments', x.id) && (BOOKS.has(strip(it.id)) || x.items.has(strip(it.id))));
        const all = ENCH_LIST.filter(x => availIn('enchantments', x.id));
        enchBox.replaceChildren(
            ...it.ench.map((e, i) => h('div', { class: 'list-row' },
                h('select', { value: e.id, onchange: ev => { e.id = ev.target.value; ch(); } },
                    (opts.some(o => o.id === e.id) ? opts : [ENCH.get(e.id), ...opts].filter(Boolean)).map(o => h('option', { value: o.id }, o.de))),
                h('span', { class: 'hint' }, 'Stufe'),
                numInput(e, 'lvl', { min: 1, max: 255, step: 1, width: 70, ch }),
                h('span', { class: 'hint' }, `normal max. ${roman(ENCH.get(e.id)?.max || 1)}`),
                h('button', { class: 'icon-btn', onclick: () => { it.ench.splice(i, 1); ch(); drawEnch(); } }, '🗑'))),
            h('button', { class: 'btn btn-small', onclick: () => {
                const used = new Set(it.ench.map(e => e.id));
                const next = (opts.length ? opts : all).find(o => !used.has(o.id));
                if (next) { it.ench.push({ id: next.id, lvl: next.max }); ch(); drawEnch(); }
            } }, '+ Verzauberung'),
            opts.length ? null : h('div', { class: 'hint' }, 'Dieses Item kann normalerweise nicht verzaubert werden.'));
    };
    const loreBox = h('div');
    const drawLore = () => loreBox.replaceChildren(
        ...it.lore.map((l, i) => h('div', { class: 'list-row' },
            h('input', { type: 'text', value: l.text, placeholder: `Zeile ${i + 1}`, style: 'flex:1;min-width:160px', oninput: ev => { l.text = ev.target.value; ch(); } }),
            colorInput(l, 'color', ch),
            h('button', { class: 'icon-btn', onclick: () => { it.lore.splice(i, 1); ch(); drawLore(); } }, '🗑'))),
        h('button', { class: 'btn btn-small', onclick: () => { it.lore.push({ text: '', color: 'gray', italic: false }); drawLore(); } }, '+ Zeile'));
    drawEnch();
    drawLore();
    drawPreview();
    const isDye = D.dyeable.includes(strip(it.id));
    const isTrim = D.trimmable.includes(strip(it.id));
    body.append(h('div', { class: 'editor' },
        h('div', null,
            info && info.maxStack > 1 ? field('Anzahl', numInput(it, 'count', { min: 1, max: 99, step: 1, width: 90, ch })) : null,
            h('div', { class: 'field-label', style: 'margin-bottom:6px' }, 'Verzauberungen', infoBtn(HELP.ench, 'Verzauberungen')), enchBox, h('hr', { class: 'sep' }),
            field('Name', h('div', { class: 'list-row', style: 'margin:0' },
                h('input', { type: 'text', value: it.name.text, placeholder: itemName(it.id), style: 'flex:1;min-width:160px', oninput: ev => { it.name.text = ev.target.value; ch(); } }),
                colorInput(it.name, 'color', ch), checkInput(it.name, 'bold', 'fett', { ch })), null, HELP.name),
            h('div', { class: 'field-label', style: 'margin:4px 0 6px' }, 'Beschreibung (Lore)', infoBtn(HELP.lore, 'Lore')), loreBox, h('hr', { class: 'sep' }),
            h('div', { class: 'grid-2' },
                h('div', { class: 'field' }, checkInput(it, 'unbreakable', 'Unzerbrechlich', { ch, help: HELP.unbreakable })),
                field('Verzauberungs-Glanz', selectInput(it, 'glint', [['', 'Automatisch'], ['on', 'Immer'], ['off', 'Nie']], { ch }), null, HELP.glint)),
            info?.maxDamage ? field('Haltbarkeit (%)', numInput(it, 'damage', { min: 0, max: 100, step: 1, width: 90, ch, placeholder: '100' }), '100 = neu, 10 = fast kaputt', HELP.damage) : null,
            isDye ? field('Farbe', h('div', { class: 'row' },
                h('input', { type: 'color', value: it.color || '#a06540', style: 'width:48px;height:34px;padding:2px', oninput: ev => { it.color = ev.target.value; ch(); } }),
                h('button', { class: 'btn btn-small', onclick: () => { it.color = ''; ch(); modal.close(); openMobItemEditor(slot, target); } }, 'Standardfarbe')), 'Für Leder-Rüstung, Wolfsrüstung usw.') : null,
            isTrim ? h('div', { class: 'grid-2' },
                field('Rüstungsbesatz: Material', selectInput(it.trim, 'material', [['', '– keiner –'], ...(regOptions('trim_material') || [])], { ch })),
                field('Rüstungsbesatz: Muster', selectInput(it.trim, 'pattern', [['', '– keines –'], ...(regOptions('trim_pattern') || [])], { ch }))) : null),
        h('div', { class: 'editor-side' },
            h('div', { class: 'editor-item' }, icon(it.id), h('div', null, h('div', { class: 'name' }, itemName(it.id)), h('div', { class: 'id' }, 'minecraft:' + strip(it.id)))),
            h('div', { class: 'field-label' }, 'Vorschau im Spiel'), preview)));
    const modal = openModal({ title: 'Item einstellen', wide: true, body, iconEl: icon(it.id, { eager: true }),
        foot: h('button', { class: 'btn btn-primary', onclick: () => modal.close() }, 'Fertig'),
        onClose: () => { if (!target) renderMobEditor(); else mobRedraw(); renderMobOutput(); } });
}

/* ---------- Attribute ---------- */
function attributeEditor() {
    const wrap = h('div');
    const draw = () => {
        const opts = regOptions('attribute') || [];
        const sorted = [...opts].sort((a, b) => a[1].localeCompare(b[1], 'de'));
        wrap.replaceChildren(
            explain('Attribute sind die Grundwerte des Mobs: Lebenspunkte, Tempo, Schaden, Rüstung, Größe … Jede Zeile setzt einen Wert fest.'),
            ...mob.attrs.map((a, i) => {
                const inf = ATTR_INFO[shortAttr(a.id)];
                return h('div', { class: 'list-row' },
                    h('select', { value: a.id, onchange: ev => { a.id = ev.target.value; mobChanged(); draw(); } },
                        (sorted.some(o => o[0] === a.id) ? sorted : [[a.id, a.id + ' (nicht in dieser Version)'], ...sorted]).map(([id, l]) => h('option', { value: id }, l))),
                    h('input', { type: 'number', step: 'any', value: a.base, min: inf?.[0], max: inf?.[1], style: 'width:110px',
                        oninput: ev => { a.base = ev.target.value === '' ? '' : +ev.target.value; mobChanged(); } }),
                    inf ? h('span', { class: 'hint' }, `${inf[0]} – ${inf[1]}${inf[2] ? ' · ' + inf[2] : ''}`) : null,
                    h('button', { class: 'icon-btn', title: 'Entfernen', onclick: () => { mob.attrs.splice(i, 1); mobChanged(); draw(); } }, '🗑'));
            }),
            h('button', { class: 'btn btn-small', onclick: () => {
                const used = new Set(mob.attrs.map(a => a.id));
                const next = sorted.find(([id]) => !used.has(id) && shortAttr(id) === 'movement_speed') || sorted.find(([id]) => !used.has(id));
                if (next) { mob.attrs.push({ id: next[0], base: '' }); mobChanged(); draw(); }
            } }, '+ Attribut'));
    };
    draw();
    return wrap;
}

/* ---------- Effekte ---------- */
function effectEditor() {
    const wrap = h('div');
    const draw = () => {
        const opts = [...(regOptions('mob_effect') || [])].sort((a, b) => a[1].localeCompare(b[1], 'de'));
        wrap.replaceChildren(
            explain('Trank-Effekte, die der Mob beim Erscheinen hat – z. B. Unsichtbarkeit, Feuerresistenz oder Stärke.'),
            ...mob.effects.map((e, i) => h('div', { class: 'list-row effect-row' },
                h('select', { value: e.id, onchange: ev => { e.id = ev.target.value; mobChanged(); } }, opts.map(([id, l]) => h('option', { value: id }, l))),
                h('span', { class: 'hint' }, 'Stufe'),
                numInput(e, 'level', { min: 1, max: 256, step: 1, width: 64, ch: mobChanged }),
                checkInput(e, 'infinite', 'dauerhaft', { ch: mobChanged, after: draw }),
                e.infinite ? null : [numInput(e, 'seconds', { min: 1, step: 1, width: 80, ch: mobChanged }), h('span', { class: 'hint' }, 'Sek.')],
                checkInput(e, 'particles', 'Partikel', { ch: mobChanged }),
                h('button', { class: 'icon-btn', title: 'Entfernen', onclick: () => { mob.effects.splice(i, 1); mobChanged(); draw(); } }, '🗑'))),
            h('button', { class: 'btn btn-small', onclick: () => {
                mob.effects.push({ id: opts[0]?.[0] || 'speed', level: 1, seconds: 60, infinite: true, particles: true, ambient: false });
                mobChanged(); draw();
            } }, '+ Effekt'));
    };
    draw();
    return wrap;
}

/* ---------- Drops ---------- */
function lootEditor() {
    const wrap = h('div');
    const draw = () => {
        const cur = `${T().namespace}:${T().path}`;
        const vanilla = [...VANILLA_TABLES.entries()].filter(([p, type]) => type === 'entity' && availIn('lootTables', p)).map(([p]) => p);
        const l = mob.loot;
        wrap.replaceChildren(
            explain('Legt fest, was der Mob beim Tod fallen lässt. Ausrüstung wird zusätzlich nach ihrer Drop-Chance fallen gelassen.'),
            seg(l, 'mode', [['default', 'Standard'], ['current', 'Aus Loot-Bereich'], ['vanilla', 'Wie anderer Mob'], ['custom', 'Eigene ID'], ['none', 'Keine Drops']],
                { ch: mobChanged, after: draw }),
            h('div', { style: 'margin-top:12px' },
                l.mode === 'default' ? h('div', { class: 'hint' }, 'Der Mob lässt fallen, was er auch normalerweise fallen lässt.') : null,
                l.mode === 'none' ? h('div', { class: 'hint' }, 'Der Mob lässt nichts fallen (nutzt die leere Loot-Table minecraft:empty).') : null,
                l.mode === 'current' ? h('div', null,
                    h('div', { class: 'path-box' }, 'Loot-Table: ', h('b', null, cur)),
                    h('div', { class: 'hint', style: 'margin:6px 0' }, 'Das ist die Loot-Table, die gerade im Bereich „Loot-Tables“ offen ist. Denk daran, sie herunterzuladen und ins Datapack zu legen.'),
                    T().type !== 'entity' && T().type !== 'generic' ? h('div', { class: 'cond-warn' }, `⚠ Die Loot-Table ist vom Typ „${TYPE_BY_ID.get(T().type)?.label}“. Für Mob-Drops sollte sie den Typ „Mob-Drops“ haben, sonst funktionieren Bedingungen wie „von Spieler getötet“ nicht.`) : null,
                    h('button', { class: 'btn btn-small', onclick: () => showView('loot') }, 'Loot-Table ansehen / bearbeiten')) : null,
                l.mode === 'vanilla' ? field('Drops wie', selectInput(l, 'value', [['', '– wählen –'], ...vanilla.map(p => {
                    const id = p.replace(/^entities\//, '');
                    return [p, (ENTITIES.get(id.split('/')[0]) || id) + (id.includes('/') ? ' (' + id.split('/').slice(1).join('/') + ')' : '')];
                }).sort((a, b) => a[1].localeCompare(b[1], 'de'))], { ch: mobChanged, style: 'max-width:320px' }), 'Der Mob lässt die Beute eines anderen Mobs fallen – z. B. ein Zombie mit Blaze-Drops.') : null,
                l.mode === 'custom' ? field('Loot-Table-ID', textInput(l, 'value', { ch: mobChanged, placeholder: 'meinserver:entities/boss' }), 'namespace:pfad deiner eigenen Loot-Table') : null),
            h('hr', { class: 'sep' }),
            h('div', { class: 'row', style: 'flex-wrap:wrap' },
                h('button', { class: 'btn btn-small btn-accent', onclick: createLootForMob }, '+ Neue Loot-Table für diesen Mob bauen'),
                infoBtn(HELP_MOB.lootLink, 'Loot-Table verknüpfen')));
    };
    draw();
    return wrap;
}

function createLootForMob() {
    const t = T();
    if (t.pools.some(p => p.entries.length) && !confirm('Im Loot-Bereich ist schon eine Loot-Table offen. Sie wird durch eine neue für diesen Mob ersetzt (vorher ggf. dort „Projekt speichern“). Fortfahren?')) return;
    const slug = functionIds().name;
    state.table = newTable();
    state.table.type = 'entity';
    state.table.namespace = t.namespace || 'meinserver';
    state.table.path = 'entities/' + slug;
    mob.loot = { mode: 'current', value: '' };
    saveMob();
    renderSettings();
    refresh();
    showView('loot');
    toast('Neue Mob-Loot-Table angelegt – sie ist automatisch mit deinem Mob verknüpft.');
}

/* ---------- Handel ---------- */
function tradeEditor(fm) {
    const wrap = h('div');
    const itemButton = (obj, key, title, allowEdit) => {
        const it = obj[key];
        return h('div', { class: 'trade-item' },
            h('button', { class: 'slot', title: it?.id ? itemName(it.id) : title, onclick: () => openItemPicker({ title, onPick: id => { obj[key] = { ...newItem(id), count: it?.count || 1 }; mobChanged(); draw(); } }) },
                it?.id ? icon(it.id) : h('span', { class: 'plus' }, '+'), it?.id && it.count > 1 ? h('span', { class: 'count' }, it.count) : null),
            it?.id ? h('div', { class: 'range-input', style: 'justify-content:center' }, h('span', null, '×'),
                h('input', { type: 'number', min: 1, max: 99, value: it.count, style: 'width:56px', oninput: ev => { it.count = +ev.target.value || 1; mobChanged(); } })) : h('div', { class: 'hint' }, title),
            it?.id ? h('div', { class: 'row', style: 'gap:2px;justify-content:center' },
                allowEdit ? h('button', { class: 'btn btn-small', onclick: () => openMobItemEditor(null, it) }, 'Extras') : null,
                h('button', { class: 'icon-btn', title: 'Entfernen', onclick: () => { obj[key] = null; mobChanged(); draw(); } }, '🗑')) : null);
    };
    const draw = () => {
        const vd = mob.spec.VillagerData || {};
        const prof = vd.profession;
        const needsProf = curMob().id === 'villager' && (!prof || prof === 'none' || prof === 'nitwit');
        wrap.replaceChildren(
            explain('Eigene Handelsangebote: links, was der Spieler bezahlt (bis zu zwei Items), rechts, was er bekommt. Das Verkaufs-Item kannst du über „Extras“ verzaubern oder benennen.'),
            needsProf ? h('div', { class: 'cond-warn', style: 'margin-bottom:10px' }, '⚠ Ein Dorfbewohner ohne Beruf (oder ein Nichtsnutz) öffnet kein Handelsmenü. ',
                h('button', { class: 'btn btn-small', onclick: () => {
                    mob.spec.VillagerData = { ...(mob.spec.VillagerData || {}), profession: 'mason', level: vd.level || 5 };
                    mobRedraw();
                } }, 'Beruf auf „Maurer“ setzen')) : null,
            ...mob.trades.map((tr, i) => h('div', { class: 'trade-row' },
                itemButton(tr, 'buy', 'Preis', false), h('span', { class: 'trade-plus' }, '+'), itemButton(tr, 'buyB', '2. Preis (optional)', false),
                h('span', { class: 'trade-arrow' }, '➜'), itemButton(tr, 'sell', 'Ware', true),
                h('div', { class: 'trade-opts' },
                    field('Max. Nutzungen', numInput(tr, 'maxUses', { min: 1, step: 1, width: 90, ch: mobChanged })),
                    field('Händler-EP', numInput(tr, 'xp', { min: 0, step: 1, width: 80, ch: mobChanged })),
                    field('Preis-Schwankung', numInput(tr, 'priceMultiplier', { min: 0, step: 0.01, width: 80, ch: mobChanged }), null, HELP_MOB.priceMultiplier),
                    checkInput(tr, 'rewardExp', 'Spieler bekommt EP', { ch: mobChanged })),
                h('button', { class: 'icon-btn', title: 'Angebot löschen', onclick: () => { mob.trades.splice(i, 1); mobChanged(); draw(); } }, '🗑'))),
            h('button', { class: 'btn btn-small', onclick: () => {
                mob.trades.push({ buy: { ...newItem('emerald'), count: 5 }, buyB: null, sell: newItem('diamond'), maxUses: 12, xp: 5, rewardExp: true, priceMultiplier: 0.05 });
                mobChanged(); draw();
            } }, '+ Angebot'));
    };
    draw();
    return wrap;
}

/* ---------- Reiter ---------- */
function riderEditor() {
    const wrap = h('div');
    const draw = () => {
        const opts = MD.mobs.filter(m => mobAvailable(m)).map(m => [m.id, m.de]).sort((a, b) => a[1].localeCompare(b[1], 'de'));
        wrap.replaceChildren(
            explain('Lass andere Mobs auf deinem Mob reiten (z. B. ein Skelett auf einer Spinne) – oder setz deinen Mob auf ein Reittier.'),
            field('Reitet auf (Reittier)', selectInput(mob, 'mount', [['', '– reitet auf nichts –'], ...opts], { ch: mobChanged, style: 'max-width:280px' }),
                'Der Befehl beschwört dann das Reittier mit deinem Mob obendrauf.'),
            h('div', { class: 'field-label', style: 'margin:6px 0' }, 'Reiter auf diesem Mob'),
            ...mob.passengers.map((p, i) => h('div', { class: 'list-row' },
                h('select', { value: p.id, onchange: ev => { p.id = ev.target.value; mobChanged(); draw(); } }, opts.map(([id, l]) => h('option', { value: id }, l))),
                h('input', { type: 'text', value: p.name || '', placeholder: 'Name (optional)', style: 'width:160px', oninput: ev => { p.name = ev.target.value; mobChanged(); } }),
                checkInput(p, 'baby', 'Baby', { ch: mobChanged }),
                h('button', { class: 'icon-btn', onclick: () => { mob.passengers.splice(i, 1); mobChanged(); draw(); } }, '🗑'))),
            h('button', { class: 'btn btn-small', onclick: () => { mob.passengers.push({ id: 'skeleton', name: '', baby: false }); mobChanged(); draw(); } }, '+ Reiter'));
    };
    draw();
    return wrap;
}

/* ---------- Ausgabe ---------- */
function renderMobOutput() {
    const el = $('#mob-output');
    if (!el) return;
    const m = curMob();
    const o = mob.out;
    if (!mobAvailable(m)) { el.replaceChildren(h('h2', null, 'Befehl'), h('div', { class: 'hint' }, 'Wähle einen Mob, den es in dieser Version gibt.')); return; }
    const cmd = currentCommand() || '';
    const warnings = mobWarnings(cmd);
    const typeOpts = [['summon', '/summon'], ['egg', 'Spawn-Ei'], ['spawner', 'Spawner'], ['function', '.mcfunction']];
    const opts = [];
    if (o.type === 'summon' || o.type === 'spawner') {
        opts.push(field('Position', textInput(o, 'pos', { ch: () => renderMobOutputSoon(), placeholder: '~ ~ ~' }), '~ ~ ~ = deine Position · ^ ^ ^2 = 2 Blöcke vor dir', HELP_MOB.pos));
    }
    if (o.type === 'egg') {
        opts.push(h('div', { class: 'grid-2' },
            field('Für Spieler', textInput(o, 'target', { ch: () => renderMobOutputSoon(), placeholder: '@p' }), '@p = nächster, @s = du selbst'),
            field('Anzahl', numInput(o, 'eggCount', { min: 1, max: 64, step: 1, ch: () => renderMobOutputSoon() }))),
            field('Name des Spawn-Eis (optional)', textInput(o, 'eggName', { ch: () => renderMobOutputSoon(), placeholder: 'z. B. Boss-Zombie' })));
    }
    if (o.type === 'spawner') {
        const sp = o.spawner;
        const ch = () => renderMobOutputSoon();
        opts.push(h('div', { class: 'grid-2' },
            field('Mobs pro Spawn', numInput(sp, 'SpawnCount', { min: 1, step: 1, ch })),
            field('Spawn-Bereich', numInput(sp, 'SpawnRange', { min: 1, step: 1, ch }), 'Blöcke um den Spawner'),
            field('Min. Pause (Ticks)', numInput(sp, 'MinSpawnDelay', { min: 0, step: 1, ch }), '200 = 10 Sek.'),
            field('Max. Pause (Ticks)', numInput(sp, 'MaxSpawnDelay', { min: 0, step: 1, ch }), '800 = 40 Sek.'),
            field('Max. Mobs in der Nähe', numInput(sp, 'MaxNearbyEntities', { min: 1, step: 1, ch })),
            field('Aktiv ab Spieler-Abstand', numInput(sp, 'RequiredPlayerRange', { min: 1, step: 1, ch }), 'Blöcke')),
            h('div', { class: 'field' }, checkInput(sp, 'light', 'Nur bei bestimmtem Licht spawnen', { ch, after: renderMobOutput })),
            sp.light ? h('div', { class: 'grid-2' },
                field('Max. Blocklicht (0–15)', numInput(sp, 'blockLight', { min: 0, max: 15, step: 1, ch })),
                field('Max. Himmelslicht (0–15)', numInput(sp, 'skyLight', { min: 0, max: 15, step: 1, ch }))) : null);
    }
    if (o.type === 'function') {
        const ids = functionIds();
        const ch = () => renderMobOutputSoon();
        opts.push(h('div', { class: 'grid-2' },
            field('Namespace', textInput(o.fn, 'ns', { ch, placeholder: T().namespace || 'meinserver' })),
            field('Name der Funktion', textInput(o.fn, 'name', { ch, placeholder: ids.name }))),
            field('Befehl in der Datei', seg(o.fn, 'cmd', [['summon', '/summon'], ['egg', 'Spawn-Ei'], ['spawner', 'Spawner']], { ch: () => {}, after: renderMobOutput })),
            h('div', { class: 'path-box' }, `data/${ids.ns}/function/${ids.name}.mcfunction`),
            h('div', { class: 'hint', style: 'margin:6px 0' }, 'Aufruf im Spiel: ', h('code', null, `/function ${ids.ns}:${ids.name}`)));
    }
    const text = o.type === 'function' ? functionFile() : cmd;
    el.replaceChildren(
        h('div', { class: 'output-head' },
            h('h2', null, h('span', { class: 'step-no' }, '3'), 'Befehl', infoBtn(HELP_MOB.output, 'Ausgabe')),
            h('div', { class: 'output-actions' }, o.type === 'function'
                ? h('button', { class: 'btn btn-small btn-primary', onclick: () => downloadFile(functionIds().name + '.mcfunction', functionFile()) }, 'Herunterladen')
                : h('button', { class: 'btn btn-small', onclick: () => copyText(cmd) }, 'Kopieren'))),
        seg(o, 'type', typeOpts, { ch: () => saveMob(), after: renderMobOutput }),
        h('div', { class: 'hint explain-inline', style: 'margin:8px 0' }, {
            summon: 'Lässt den Mob sofort erscheinen. Im Chat oder in einem Befehlsblock eingeben.',
            egg: 'Gibt ein Spawn-Ei, das genau diesen Mob erzeugt – praktisch zum Verteilen oder für Kreativ-Inventare.',
            spawner: 'Setzt einen Monster-Spawner, der immer wieder diesen Mob erzeugt.',
            function: 'Speichert den Befehl als Funktion für dein Datapack – ohne Längenbegrenzung.'
        }[o.type]),
        h('div', { class: 'mob-out-opts' }, opts),
        h('ul', { class: 'warnings' }, (warnings.length ? warnings : [['ok', `Fertig für ${versionLabel()} – ${cmd.length} Zeichen.`]]).map(([c, t]) => h('li', { class: c }, t))),
        h('pre', { class: 'json cmd-out' }, highlightCmd(text || '')));
}
const renderMobOutputSoon = debounce(() => { saveMob(); renderMobOutput(); }, 150);

function highlightCmd(s) {
    const frag = document.createElement('span');
    frag.innerHTML = esc(s)
        .replace(/(&quot;(?:\\.|[^&\\]|&(?!quot;))*?&quot;|'(?:\\.|[^'\\])*')/g, '<span class="s">$1</span>')
        .replace(/(^|[{,\[])([A-Za-z_][A-Za-z0-9_]*)(?=:)/g, '$1<span class="k">$2</span>')
        .replace(/(^\/[a-z]+|\n[a-z]+)/g, '<span class="b">$1</span>');
    return frag;
}

function mobWarnings(cmd) {
    const out = [];
    const m = curMob();
    const o = mob.out;
    if (o.type === 'egg' && !(m.egg && availIn('items', m.egg))) out.push(['err', `${mobName(m)} hat kein Spawn-Ei. Nutze /summon, einen Spawner oder eine Funktion.`]);
    if (o.type !== 'function' && cmd.length > 256) out.push(['warn', `Der Befehl hat ${cmd.length} Zeichen – im Chat sind nur 256 erlaubt. Nutze einen Befehlsblock oder eine .mcfunction.`]);
    if (m.id === 'villager' && mob.trades.length) {
        const p = mob.spec.VillagerData?.profession;
        if (!p || p === 'none' || p === 'nitwit') out.push(['warn', 'Handel: Der Dorfbewohner braucht einen Beruf, sonst öffnet sich kein Handelsmenü.']);
    }
    if (mob.loot.mode === 'current') out.push(['ok', `Drops: Denk daran, die Loot-Table ${T().namespace}:${T().path} ins Datapack zu legen.`]);
    for (const [slot, it] of Object.entries(mob.equip)) {
        if (it?.id && !availIn('items', it.id)) out.push(['err', `Ausrüstung: „${itemName(it.id)}“ gibt es ${missingIn('items', it.id)} – wird weggelassen.`]);
    }
    if (mob.extra.trim() && /[{}]/.test(mob.extra) && (mob.extra.match(/\{/g) || []).length !== (mob.extra.match(/\}/g) || []).length) {
        out.push(['err', 'Eigenes NBT: Die geschweiften Klammern sind nicht ausgeglichen.']);
    }
    if (mob.base.NoAI && (mob.rot.yaw === '' && mob.rot.pitch === '')) out.push(['ok', 'Tipp: Mit „Keine KI“ kannst du unter „Name & Aussehen“ die Blickrichtung festlegen.']);
    return out;
}

/* ---------- Ansicht wechseln ---------- */
function showView(name) {
    const isMob = name === 'mob';
    $('#view-loot').hidden = isMob;
    $('#view-mob').hidden = !isMob;
    $('#tab-loot').classList.toggle('on', !isMob);
    $('#tab-mob').classList.toggle('on', isMob);
    try { localStorage.setItem('tools.view', name); } catch { /* egal */ }
    if (isMob) renderMobView();
    window.scrollTo(0, 0);
}
const currentView = () => ($('#view-mob').hidden ? 'loot' : 'mob');

function initMob() {
    loadMobState();
    $('#tab-icon-loot').append(icon('chest', { eager: true }));
    $('#tab-icon-mob').append(icon('zombie_spawn_egg', { eager: true }));
    $('#tab-loot').addEventListener('click', () => showView('loot'));
    $('#tab-mob').addEventListener('click', () => showView('mob'));
    $('#mob-new').addEventListener('click', () => {
        if (!confirm(`Alle Einstellungen für ${mobName(curMob())} zurücksetzen?`)) return;
        mob = newMobState(mob.id);
        saveMob();
        renderMobView();
    });
    $('#mob-save').addEventListener('click', () => {
        downloadFile(functionIds().name + '.mob.json', JSON.stringify({ app: 'mob-generator', version: state.version, mob }, null, 2));
    });
    $('#mob-load').addEventListener('click', () => $('#mob-file').click());
    $('#mob-file').addEventListener('change', async e => {
        const f = e.target.files[0];
        e.target.value = '';
        if (!f) return;
        try {
            const json = JSON.parse(await f.text());
            if (json.app !== 'mob-generator' || !json.mob?.id) throw new Error();
            mob = withDefaults(newMobState(json.mob.id), json.mob);
            saveMob();
            renderMobView();
            toast('Mob geladen');
        } catch { toast('Das ist keine gespeicherte Mob-Datei.'); }
    });
    $('#mob-copy').addEventListener('click', () => {
        const c = mob.out.type === 'function' ? functionFile() : currentCommand();
        if (c) copyText(c); else toast('Für diesen Mob gibt es diese Ausgabe nicht.');
    });
    versionListeners.push(() => { if (currentView() === 'mob') renderMobView(); });
    let view = 'loot';
    try { view = localStorage.getItem('tools.view') || 'loot'; } catch { /* egal */ }
    showView(view);
}

initMob();

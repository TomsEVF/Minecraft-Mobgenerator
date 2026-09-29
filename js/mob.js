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
const MOB_CATS = [['all', tr('Alle')], ['passive', tr('Friedlich')], ['neutral', tr('Neutral')], ['hostile', tr('Feindlich')], ['boss', tr('Bosse')], ['other', tr('Sonstige')]];
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
    'IsSitting', 'LastPoseTick', 'PlayerSpawned',
    // reine Zeitzähler des Spiels (Abklingzeiten), für eigene Mobs nicht sinnvoll
    'SpellTicks', 'AttackTick', 'RoarTick', 'StunTick', 'SkeletonTrapTime'
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
    NoAI: [tr('Keine KI (steht still)'), tr('Der Mob bewegt sich nicht, dreht sich nicht und greift nicht an. Ideal für Deko-Mobs oder Händler an festen Plätzen.')],
    Invulnerable: [tr('Unverwundbar'), tr('Nimmt keinen Schaden – außer von Spielern im Kreativmodus und durch /kill.')],
    PersistenceRequired: [tr('Verschwindet nie'), tr('Mobs verschwinden normalerweise, wenn kein Spieler in der Nähe ist (Despawn). Angehakt bleibt der Mob für immer.')],
    Silent: [tr('Lautlos'), tr('Der Mob macht keine Geräusche.')],
    Glowing: [tr('Leuchtender Umriss'), tr('Der Mob ist durch Wände als Umriss sichtbar – wie mit dem Effekt „Leuchten“.')],
    NoGravity: [tr('Keine Schwerkraft (schwebt)'), tr('Der Mob fällt nicht herunter und bleibt in der Luft stehen.')],
    CanPickUpLoot: [tr('Hebt Items auf'), tr('Der Mob sammelt herumliegende Items und Rüstung auf und benutzt sie.')],
    LeftHanded: [tr('Linkshänder'), tr('Hält die Waffe in der linken Hand.')],
    HasVisualFire: [tr('Brennt (nur optisch)'), tr('Der Mob sieht aus, als würde er brennen, nimmt aber keinen Schaden.')],
    Fire: [tr('Brennt für … Ticks'), tr('20 Ticks = 1 Sekunde. Der Mob brennt so lange (und nimmt Schaden).')],
    AbsorptionAmount: [tr('Extra-Herzen (Absorption)'), tr('Goldene Zusatz-Herzen. 2 = ein ganzes Herz.')],
    Air: [tr('Luft unter Wasser (Ticks)'), tr('Wie lange der Mob noch unter Wasser atmen kann. 300 = voll (15 Sekunden).')],
    TicksFrozen: [tr('Eingefroren (Ticks)'), tr('Wie lange der Mob schon im Pulverschnee steckt. Ab 140 friert er und nimmt Schaden.')],
    Team: ['Team', tr('Der Mob tritt beim Erscheinen diesem Team bei. Das Team legst du vorher mit /team add … an.')],
    home_pos: [tr('Heimat-Position (x y z)'), tr('Der Mob bleibt in der Nähe dieses Punktes – zusammen mit dem Heimat-Radius.')],
    home_radius: [tr('Heimat-Radius'), tr('Wie weit (in Blöcken) sich der Mob von seiner Heimat entfernen darf. -1 = keine Heimat.')],
    invulnerable_time: [tr('Kurz unverwundbar (Ticks)'), tr('Der Mob ist für diese Zeit unverwundbar, danach wieder normal.')],
    Age: [tr('Alter (Ticks)'), tr('Negativ = Baby, z. B. -24000 = in 20 Minuten erwachsen. 0 = erwachsen. Oben gibt es dafür auch den Schalter „Baby“.')],
    ForcedAge: [tr('Erzwungenes Alter'), tr('Wert, den das Alter beim Erwachsenwerden bekommt. Meist 0 lassen.')],
    AgeLocked: [tr('Wächst nie auf'), tr('Das Baby bleibt für immer ein Baby.')],
    InLove: [tr('Paarungsbereit (Ticks)'), tr('Wie lange der Mob im „Liebesmodus“ mit Herzchen ist.')],
    IsBaby: [tr('Baby'), tr('Der Mob ist ein Baby (kleiner und schneller).')],
    Sitting: [tr('Sitzt'), tr('Gezähmte Tiere bleiben sitzen, bis man sie anklickt.')],
    AngerTime: [tr('Wütend für … Ticks'), tr('So lange greift der Mob an. 20 Ticks = 1 Sekunde.')],
    Anger: [tr('Wütend für … Ticks'), tr('So lange greift die Biene an.')],
    variant: [tr('Variante'), tr('Das Aussehen des Mobs, z. B. Fellfarbe oder Muster.')],
    sound_variant: [tr('Stimme'), tr('Welche Geräusche der Mob macht.')],
    Variant: [tr('Variante'), tr('Das Aussehen des Mobs.')],
    Size: [tr('Größe'), tr('Größe des Schleims. 0 = klein, 1 = mittel, 3 = groß. Höhere Werte gehen auch (bis 126) – Achtung, riesig!')],
    size: [tr('Größe'), tr('Größe des Phantoms. 0 = normal, höhere Werte = größer und stärker.')],
    CanBreakDoors: [tr('Kann Türen einschlagen'), tr('Der Zombie kann Holztüren zerstören (normalerweise nur auf „Schwer“).')],
    DrownedConversionTime: [tr('Wird Ertrunkener in … Ticks'), tr('-1 = verwandelt sich gerade nicht.')],
    InWaterTime: [tr('Zeit unter Wasser (Ticks)'), tr('Ab 600 Ticks unter Wasser beginnt die Verwandlung zum Ertrunkenen.')],
    FromBucket: [tr('Aus einem Eimer (verschwindet nie)'), tr('Mobs aus einem Eimer despawnen nicht.')],
    IsImmuneToZombification: [tr('Wird nie zum Zombie'), tr('Piglins und Hoglins verwandeln sich in der Oberwelt normalerweise nach 15 Sekunden in Zombies. Angehakt passiert das nie.')],
    TimeInOverworld: [tr('Zeit in der Oberwelt (Ticks)'), tr('Ab 300 Ticks verwandelt sich der Mob in einen Zombie.')],
    CollarColor: [tr('Halsbandfarbe'), tr('Farbe des Halsbands (nur bei gezähmten Tieren sichtbar).')],
    Color: [tr('Farbe'), tr('Farbe der Wolle bzw. der Schale.')],
    Type: [tr('Art'), tr('Welche Art bzw. Farbe der Mob hat.')],
    AttachFace: [tr('Hängt an Seite'), tr('An welcher Blockseite der Shulker festsitzt.')],
    BatFlags: [tr('Hängt kopfüber'), tr('Die Fledermaus schläft kopfüber an der Decke.')],
    Bred: [tr('Wurde gezüchtet'), tr('Nur ein interner Merker.')],
    CanDuplicate: [tr('Kann sich vervielfältigen'), tr('Ein Allay vervielfältigt sich beim Tanzen, wenn man ihm eine Amethystscherbe gibt.')],
    CanJoinRaid: [tr('Kann an Überfällen teilnehmen'), tr('Der Mob schließt sich einem Überfall in der Nähe an.')],
    CannotBeHunted: [tr('Wird nicht von Piglins gejagt'), tr('Piglins greifen diesen Hoglin nicht an.')],
    CannotHunt: [tr('Jagt keine Hoglins'), tr('Dieser Piglin greift keine Hoglins an.')],
    Crouching: [tr('Duckt sich'), tr('Der Fuchs duckt sich (Anschleichen).')],
    DarkTicksRemaining: [tr('Dunkel für … Ticks'), tr('Nach Schaden leuchtet der Leuchttintenfisch eine Weile nicht.')],
    DespawnDelay: [tr('Verschwindet nach … Ticks'), tr('Nach dieser Zeit verschwindet der wandernde Händler. 0 = nie.')],
    DisabledSlots: [tr('Gesperrte Plätze (Bitmaske)'), tr('Verhindert, dass Spieler Rüstung/Items vom Rüstungsständer nehmen oder anlegen. 4144959 sperrt alles.')],
    DragonPhase: [tr('Flugverhalten'), tr('Was der Enderdrache gerade tut.')],
    EggLayTime: [tr('Nächstes Ei in … Ticks'), tr('Zeit, bis das Huhn wieder ein Ei legt.')],
    ExplosionPower: [tr('Explosionsstärke'), tr('Stärke der Feuerbälle. Standard 1 – höhere Werte zerstören sehr viel!')],
    ExplosionRadius: [tr('Explosionsradius'), tr('Standard 3. Achtung: große Werte zerstören sehr viel!')],
    FoodLevel: [tr('Nahrungsvorrat'), tr('Ab 12 kann sich der Dorfbewohner vermehren.')],
    Fuse: [tr('Zündschnur (Ticks)'), tr('Zeit vom Zischen bis zur Explosion. Standard 30 = 1,5 Sekunden.')],
    fuse: [tr('Zündschnur (Ticks)'), tr('Zeit bis zur Explosion.')],
    GotFish: [tr('Hat einen Fisch bekommen'), tr('Der Delfin führt dann zu einem Schatz.')],
    HasEgg: [tr('Trägt ein Ei'), tr('Die Schildkröte legt bald Eier am Heimatstrand.')],
    has_egg: [tr('Trägt ein Ei'), tr('Die Schildkröte legt bald Eier am Heimatstrand.')],
    HasLeftHorn: [tr('Hat linkes Horn'), tr('Ziegen haben normalerweise zwei Hörner.')],
    HasRightHorn: [tr('Hat rechtes Horn'), tr('Ziegen haben normalerweise zwei Hörner.')],
    HasNectar: [tr('Hat Nektar'), tr('Die Biene trägt Pollen.')],
    HasStung: [tr('Hat gestochen'), tr('Die Biene hat ihren Stachel verloren und stirbt bald.')],
    HiddenGene: [tr('Verstecktes Gen'), tr('Wird an Nachwuchs vererbt.')],
    MainGene: [tr('Sichtbares Gen (Persönlichkeit)'), tr('Bestimmt Aussehen und Verhalten des Pandas.')],
    HomePosX: [tr('Heimatstrand X'), tr('Wo die Schildkröte ihre Eier ablegt.')],
    HomePosY: [tr('Heimatstrand Y'), tr('Wo die Schildkröte ihre Eier ablegt.')],
    HomePosZ: [tr('Heimatstrand Z'), tr('Wo die Schildkröte ihre Eier ablegt.')],
    Invisible: [tr('Unsichtbar'), tr('Der Rüstungsständer selbst ist unsichtbar – Rüstung und Items bleiben sichtbar.')],
    Invul: [tr('Aufladezeit beim Erscheinen (Ticks)'), tr('So lange ist der Wither nach dem Erscheinen unverwundbar und lädt sich auf. 220 = wie beim Bauen.')],
    IsChickenJockey: [tr('Hühnerreiter'), tr('Das Huhn trägt einen Baby-Zombie und verschwindet wie ein Monster.')],
    IsScreamingGoat: [tr('Schreiende Ziege'), tr('Macht lautere Geräusche und rammt öfter.')],
    LifeTicks: [tr('Lebensdauer (Ticks)'), tr('Danach nimmt der Plagegeist Schaden und stirbt.')],
    life_ticks: [tr('Lebensdauer (Ticks)'), tr('Danach nimmt der Plagegeist Schaden und stirbt.')],
    Lifetime: [tr('Alter (Ticks)'), tr('Nach 2400 Ticks (2 Minuten) verschwindet die Endermite.')],
    Marker: [tr('Marker (keine Hitbox)'), tr('Winzige Hitbox, kann nicht angeklickt werden – gut für Deko.')],
    NoBasePlate: [tr('Ohne Bodenplatte'), tr('Blendet die Steinplatte am Boden aus.')],
    ShowArms: [tr('Mit Armen'), tr('Zeigt Arme, damit der Rüstungsständer Items halten kann.')],
    Small: [tr('Klein'), tr('Halb so großer Rüstungsständer.')],
    Pose: [tr('Körperhaltung (Grad)'), tr('Drehung der Körperteile in Grad (x, y, z).')],
    Moistness: [tr('Feuchtigkeit'), tr('Delfine an Land trocknen langsam aus. 2400 = voll.')],
    PatrolLeader: [tr('Patrouillen-Anführer'), tr('Trägt ein Banner und gibt beim Tod „Böses Omen“.')],
    Patrolling: [tr('Auf Patrouille'), tr('Der Mob läuft als Teil einer Patrouille herum.')],
    Peek: [tr('Öffnet die Schale'), tr('Wie weit der Shulker seine Schale geöffnet hat.')],
    PlayerCreated: [tr('Von Spieler gebaut'), tr('Ein von Spielern gebauter Eisengolem greift Spieler nie an.')],
    PlayerSpawned: [tr('Von Spieler erzeugt'), tr('Nur ein interner Merker.')],
    Pumpkin: [tr('Trägt Kürbis'), tr('Ohne Kürbis sieht man das Gesicht des Schneegolems.')],
    RabbitType: [tr('Kaninchenart'), tr('Fellfarbe – oder das feindliche Killerkaninchen.')],
    Sheared: [tr('Geschoren'), tr('Das Schaf hat keine Wolle.')],
    sheared: [tr('Geschoren'), tr('Der Sumpfskelett hat keine Pilze mehr.')],
    StrayConversionTime: [tr('Wird Eiswanderer in … Ticks'), tr('-1 = verwandelt sich gerade nicht.')],
    Tame: [tr('Gezähmt'), tr('Das Pferd ist gezähmt und kann geritten werden.')],
    Temper: [tr('Zähmungsfortschritt'), tr('Je höher, desto leichter lässt sich das Tier zähmen (0–100).')],
    Trusting: [tr('Vertraut Spielern'), tr('Der Ozelot flieht nicht vor Spielern.')],
    VillagerData: [tr('Dorfbewohner-Daten'), tr('Beruf, Stufe und Aussehen.')],
    'VillagerData.level': [tr('Stufe (1–5)'), tr('1 = Neuling … 5 = Meister. Bestimmt das Abzeichen am Gürtel.')],
    'VillagerData.profession': [tr('Beruf'), tr('Nur Dorfbewohner mit Beruf können handeln (nicht „Ohne Beruf“ oder „Nichtsnutz“).')],
    'VillagerData.type': [tr('Aussehen (Biom)'), tr('Kleidung passend zum Biom.')],
    VillagerDataFinalized: [tr('Beruf festgelegt'), tr('Der Dorfbewohner wechselt seinen Beruf nicht mehr.')],
    Xp: [tr('Handels-Erfahrung'), tr('Bestimmt, wann der Dorfbewohner die nächste Stufe erreicht (10 / 70 / 150 / 250).')],
    anchor_pos: [tr('Kreis-Mittelpunkt (x y z)'), tr('Um diesen Punkt kreist das Phantom.')],
    bound_pos: [tr('Bewegungsbereich (x y z)'), tr('In der Nähe dieses Punktes fliegt der Plagegeist.')],
    BoundX: [tr('Bewegungsbereich X'), tr('In der Nähe dieses Punktes fliegt der Plagegeist.')],
    BoundY: [tr('Bewegungsbereich Y'), tr('In der Nähe dieses Punktes fliegt der Plagegeist.')],
    BoundZ: [tr('Bewegungsbereich Z'), tr('In der Nähe dieses Punktes fliegt der Plagegeist.')],
    AX: [tr('Kreis-Mittelpunkt X'), tr('Um diesen Punkt kreist das Phantom.')],
    AY: [tr('Kreis-Mittelpunkt Y'), tr('Um diesen Punkt kreist das Phantom.')],
    AZ: [tr('Kreis-Mittelpunkt Z'), tr('Um diesen Punkt kreist das Phantom.')],
    carriedBlockState: [tr('Hält Block'), tr('Den Block, den der Enderman in den Händen trägt.')],
    flower_pos: [tr('Lieblingsblume (x y z)'), tr('Die Biene fliegt zu dieser Blume.')],
    hive_pos: [tr('Bienenstock (x y z)'), tr('Das Zuhause der Biene.')],
    ignited: [tr('Gezündet (explodiert sofort)'), tr('Der Creeper beginnt sofort zu zischen und explodiert.')],
    powered: [tr('Geladen (Blitz-Creeper)'), tr('Blau leuchtender Creeper mit doppelt so starker Explosion.')],
    scute_time: [tr('Nächstes Hornschild in … Ticks'), tr('Zeit, bis das Gürteltier wieder ein Hornschild abwirft.')],
    state: [tr('Zustand'), tr('Ob das Gürteltier eingerollt ist.')],
    next_weather_age: [tr('Nächste Oxidation (Ticks)'), tr('-2 = gewachst (oxidiert nie), -1 = zufällige Zeit.')],
    weather_state: [tr('Oxidationsstufe'), tr('Wie stark der Kupfergolem schon angelaufen ist.')],
    profile: [tr('Skin (Spielername)'), tr('Der Mannequin trägt den Skin dieses Spielers.')],
    hidden_layers: [tr('Ausgeblendete Skin-Ebenen'), tr('Diese Teile der zweiten Skin-Ebene werden versteckt.')],
    main_hand: [tr('Haupthand'), tr('Welche Hand die Haupthand ist.')],
    pose: ['Pose', tr('Körperhaltung des Mannequins.')],
    immovable: [tr('Unbeweglich'), tr('Kann nicht weggeschoben werden.')],
    description: [tr('Beschreibung'), tr('Zweite Textzeile unter dem Namen. Wird ignoriert, wenn „Beschreibung ausblenden“ aktiv ist.')],
    hide_description: [tr('Beschreibung ausblenden'), tr('Blendet die Zeile unter dem Namen aus.')],
    ChestedHorse: [tr('Trägt eine Truhe'), tr('Esel, Maultiere und Lamas können eine Truhe tragen.')],
    Strength: [tr('Stärke (Truhenplätze)'), tr('1–5: bestimmt, wie viele Plätze die Truhe eines Lamas hat (3 je Stärke).')],
    ConversionTime: [tr('Heilung abgeschlossen in … Ticks'), tr('-1 = wird gerade nicht geheilt.')],
    PuffState: [tr('Aufgeblasen'), tr('Wie weit der Kugelfisch aufgebläht ist.')],
    Sleeping: [tr('Schläft'), tr('Der Fuchs liegt schlafend auf dem Boden.')],
    SkeletonTrap: [tr('Skelettfalle'), tr('Kommt ein Spieler in die Nähe, schlägt ein Blitz ein und es erscheinen vier Skelettreiter – wie bei Gewittern im Spiel.')],
    Johnny: [tr('„Johnny“ (greift alles an)'), tr('Der Diener greift jeden Mob an – wie das Oster-Ei, wenn man ihn „Johnny“ nennt.')],
    'Pose.Head': [tr('Kopf'), tr('Drehung in Grad (x, y, z).')],
    'Pose.Body': [tr('Körper'), tr('Drehung in Grad (x, y, z).')],
    'Pose.LeftArm': [tr('Linker Arm'), tr('Drehung in Grad (x, y, z).')],
    'Pose.RightArm': [tr('Rechter Arm'), tr('Drehung in Grad (x, y, z).')],
    'Pose.LeftLeg': [tr('Linkes Bein'), tr('Drehung in Grad (x, y, z).')],
    'Pose.RightLeg': [tr('Rechtes Bein'), tr('Drehung in Grad (x, y, z).')]
};

// Muster für Tropenfische (Größe 0 = klein, 1 = groß)
const FISH_PATTERNS = [
    [0, 0, tr('Kob')], [0, 1, tr('Sonnenstreifen')], [0, 2, tr('Schnüffler')], [0, 3, tr('Flitzer')], [0, 4, tr('Brinely')], [0, 5, tr('Gefleckt')],
    [1, 0, tr('Flopper')], [1, 1, tr('Streifen')], [1, 2, tr('Glitzer')], [1, 3, tr('Blockfisch')], [1, 4, tr('Betty')], [1, 5, tr('Tonfisch')]
];
const DYES = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
const DYE_DE = [tr('Weiß'), tr('Orange'), tr('Magenta'), tr('Hellblau'), tr('Gelb'), tr('Hellgrün'), tr('Rosa'), tr('Grau'), tr('Hellgrau'), tr('Türkis'), tr('Violett'), tr('Blau'), tr('Braun'), tr('Grün'), tr('Rot'), tr('Schwarz')];

// Bekannte Attribute: [min, max, Hinweis]
const ATTR_INFO = {
    max_health: [1, 1024, tr('Standard meist 20 (= 10 Herzen)')], movement_speed: [0, 1024, tr('Zombie 0,23 · Spieler 0,1')],
    attack_damage: [0, 2048, tr('Schaden pro Treffer (2 = 1 Herz)')], armor: [0, 30, tr('Wie Rüstungspunkte (20 = volle Diamantrüstung)')],
    armor_toughness: [0, 20, tr('Diamant 2 pro Teil, Netherit 3')], knockback_resistance: [0, 1, tr('1 = kein Rückstoß')],
    follow_range: [0, 2048, tr('Wie weit der Mob Spieler bemerkt (Blöcke)')], attack_knockback: [0, 5, tr('Stärke des Rückstoßes')],
    attack_speed: [0, 1024, ''], scale: [0.0625, 16, tr('1 = normal, 2 = doppelt so groß')], step_height: [0, 10, tr('Blöcke, die er hochlaufen kann (0,6 = Stufe)')],
    jump_strength: [0, 32, tr('Sprungkraft')], gravity: [-1, 1, tr('Standard 0,08')], safe_fall_distance: [-1024, 1024, tr('Fallhöhe ohne Schaden (3)')],
    fall_damage_multiplier: [0, 100, tr('0 = kein Fallschaden')], burning_time: [0, 1024, tr('0 = brennt nicht lange')],
    explosion_knockback_resistance: [0, 1, ''], movement_efficiency: [0, 1, ''], water_movement_efficiency: [0, 1, tr('1 = wie an Land')],
    oxygen_bonus: [0, 1024, tr('Längere Luft unter Wasser')], flying_speed: [0, 1024, ''], luck: [-1024, 1024, ''],
    max_absorption: [0, 2048, ''], spawn_reinforcements: [0, 1, tr('Chance, dass Zombies Verstärkung rufen')],
    tempt_range: [0, 2048, tr('Wie weit Futter das Tier anlockt')], camera_distance: [0, 32, '']
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
        chest: { mode: 'none', value: '' },
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
    // früher: „Aus Loot-Bereich“ = die eine offene Loot-Table
    if (mob.loot.mode === 'current') mob.loot = { mode: 'library', value: state.current };
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
// Attribute, die dieser Mob wirklich hat (auf echten Servern abgefragt), in der gewählten Version
function mobAttrOptions(m = curMob()) {
    const all = regOptions('attribute') || [];
    return m.at ? all.filter(([id]) => shortAttr(id) in m.at) : all;
}
const attrDefault = (m, id) => m.at?.[shortAttr(id)];
const fmtNum = n => String(+Number(n).toFixed(4)).replace('.', ',');

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
    return def?.d ? def.d + tr('\n\n(Originalbeschreibung aus der Minecraft-Dokumentation, englisch)') : null;
}
/* Welche Ausrüstung ein Mob sichtbar trägt, steht in m.eq (aus dem Spiel-Client ausgelesen):
 *  armor = Rüstung an Kopf/Brust/Beinen/Füßen · head = Block/Kopf auf dem Kopf · hands = beide Hände
 *  crossed/mouth/paws/hand = genau ein Item (verschränkte Arme, Maul, Pfoten, Hand) · wings = Elytra
 * Körper- und Sattel-Platz kommen aus den ausrüstbaren Items (Pferderüstung, Wolfsrüstung, Sattel …). */
const HOLD_LABEL = { crossed: tr('Hält (verschränkte Arme)'), mouth: tr('Im Maul'), paws: tr('In den Pfoten'), hand: tr('In der Hand') };
function slotsOf(m = curMob()) {
    const eq = m.eq || [];
    const extra = MD.slots[m.id] || [];
    const list = [];
    if (eq.includes('armor') || eq.includes('head')) list.push(['head', tr('Kopf')]);
    if (eq.includes('armor')) list.push(['chest', tr('Brust')], ['legs', tr('Beine')], ['feet', tr('Füße')]);
    if (eq.includes('hands')) list.push(['mainhand', tr('Haupthand')], ['offhand', tr('Nebenhand')]);
    else {
        const hold = ['crossed', 'mouth', 'paws', 'hand'].find(k => eq.includes(k));
        if (hold) list.push(['mainhand', HOLD_LABEL[hold]]);
    }
    if (extra.includes('body')) list.push(['body', bodyLabel(m)]);
    if (extra.includes('saddle')) list.push(['saddle', tr('Sattel')]);
    return list;
}
function bodyLabel(m) {
    return { wolf: tr('Wolfsrüstung'), llama: tr('Teppich'), trader_llama: tr('Teppich'), happy_ghast: tr('Geschirr') }[m.id] || tr('Körper (Rüstung)');
}
const hasHands = (m = curMob()) => (m.eq || []).some(k => ['hands', 'crossed', 'mouth', 'paws', 'hand'].includes(k));

// Welche Items passen in einen Platz – so, wie das Spiel sie auch sichtbar darstellt
function slotFilter(m, slot) {
    const eq = m.eq || [];
    if (slot === 'body' || slot === 'saddle') return id => { const e = D.equip[id]; return !!e && e[0] === slot && (!e[1] || e[1].includes(m.id)); };
    if (slot === 'head') {
        const armor = eq.includes('armor');
        return id => {
            const e = D.equip[id];
            if (e && e[0] === 'head') return armor || !/_helmet$/.test(id);   // Helme sieht man nur bei Mobs mit Rüstung
            if (e) return false;                                              // andere Rüstungsteile gehören nicht auf den Kopf
            return !!ITEMS.get(id)?.block;                                    // Blöcke (z. B. Glas, Kürbis) werden auf dem Kopf gezeigt
        };
    }
    if (slot === 'chest') return id => { const e = D.equip[id]; return !!e && e[0] === 'chest' && (id !== 'elytra' || eq.includes('wings')); };
    if (slot === 'legs' || slot === 'feet') return id => { const e = D.equip[id]; return !!e && e[0] === slot; };
    return null;   // Hände: jedes Item
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

// Kann das Item im Spiel verzaubert werden? (Pferde-/Wolfsrüstung, Sattel, Teppich … nicht)
const isEnchantable = id => BOOKS.has(strip(id)) || ENCH_LIST.some(x => x.items.has(strip(id)));

function itemComponents(it) {
    const c = [];
    const ench = isEnchantable(it.id) ? it.ench.filter(e => e.id && availIn('enchantments', e.id)) : [];
    if (ench.length) {
        const map = '{' + ench.map(e => `${q(nsId(e.id))}:${Math.max(1, Math.round(Number(e.lvl) || 1))}`).join(',') + '}';
        // Verzauberte Bücher speichern ihre Verzauberungen als „stored_enchantments“
        const key = strip(it.id) === 'enchanted_book' ? 'stored_enchantments' : 'enchantments';
        c.push(`"minecraft:${key}":${vAtLeast('1.21.5') ? map : '{levels:' + map + '}'}`);
    }
    if (it.name.text) c.push(`"minecraft:custom_name":${textComponent(it.name, { italic: false })}`);
    const lore = it.lore.filter(l => l.text);
    if (lore.length) c.push(`"minecraft:lore":[${lore.map(l => textComponent(l, { color: 'gray', italic: false })).join(',')}]`);
    if (it.unbreakable && itemInfo(it.id)?.maxDamage) c.push('"minecraft:unbreakable":{}');
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
        render: (store, key, ch) => textInput(store, key, { ch, placeholder: tr('z. B. Notch'), style: 'max-width:240px' }),
        emit: v => v ? `{name:${q(v)}}` : null
    },
    description: {
        render: (store, key, ch) => textInput(store, key, { ch, placeholder: tr('Text unter dem Namen'), style: 'max-width:320px' }),
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
    BEHAVIOR.filter(n => behaviorMakesSense(n, m)).forEach(n => emitField(n, mob.base));
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
    const attrs = mob.attrs.filter(a => a.id && a.base !== '' && mobAttrOptions(m).some(([id]) => id === a.id));
    const maxHealthId = mobAttrOptions(m).find(([id]) => shortAttr(id) === 'max_health')?.[0];
    const maxDefault = attrDefault(m, 'max_health') ?? 20;
    if (mob.health !== '' && hp > maxDefault && maxHealthId && !attrs.some(a => a.id === maxHealthId)) attrs.push({ id: maxHealthId, base: hp });
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
    // Truhe (Esel, Maultier, Lama): Inhalt kommt per /loot nach dem Beschwören – dafür eine Markierung
    if (hasChestLoot() && !opts.noChestTag) {
        if (!parts.some(x => x.startsWith('ChestedHorse:'))) parts.push('ChestedHorse:1b');
        const ti = parts.findIndex(x => x.startsWith('Tags:['));
        if (ti >= 0) parts[ti] = parts[ti].replace('Tags:[', `Tags:[${q(CHEST_TAG)},`);
        else parts.push(`Tags:[${q(CHEST_TAG)}]`);
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
    const fits = s => { const f = slotFilter(m, s); return !f || f(strip(mob.equip[s].id)); };
    const items = Object.fromEntries(slots.filter(s => mob.equip[s]?.id && availIn('items', mob.equip[s].id) && fits(s)).map(s => [s, mob.equip[s]]));
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

// Quelle = { mode: default | none | library | vanilla | custom, value } → Loot-Table-ID
function lootSourceId(l) {
    if (l.mode === 'none') return 'minecraft:empty';
    if (l.mode === 'library') { const t = tableById(l.value); return t ? tableId(t) : ''; }
    if (l.mode === 'vanilla' && l.value) return 'minecraft:' + l.value;
    if (l.mode === 'custom' && l.value.trim()) return nsId(l.value.trim());
    return '';
}
const lootTableId = () => lootSourceId(mob.loot);
const chestLootId = () => (mob.chest.mode === 'none' ? '' : lootSourceId(mob.chest));
const CHEST_TAG = 'mt_truhe';
const hasChestLoot = () => fieldMap().has('ChestedHorse') && !!chestLootId();

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
    const data = `{${buildMobNbt({ withId: true, noChestTag: true }).join(',')}}`;
    const comps = [`minecraft:entity_data=${data}`];
    if (mob.out.eggName) comps.push(`minecraft:custom_name=${textComponent({ text: mob.out.eggName }, { italic: false })}`);
    const n = Math.max(1, Math.round(Number(mob.out.eggCount) || 1));
    return `/give ${mob.out.target || '@p'} ${nsId(egg)}[${comps.join(',')}]${n !== 1 ? ' ' + n : ''}`;
}

function spawnerCommand(pos = mob.out.pos) {
    const sp = mob.out.spawner;
    const entity = `{${buildMobNbt({ withId: true, noChestTag: true }).join(',')}}`;
    let spawnData = `{entity:${entity}`;
    if (sp.light) spawnData += `,custom_spawn_rules:{block_light_limit:[0,${Math.round(sp.blockLight)}],sky_light_limit:[0,${Math.round(sp.skyLight)}]}`;
    spawnData += '}';
    const keys = ['SpawnCount', 'SpawnRange', 'Delay', 'MinSpawnDelay', 'MaxSpawnDelay', 'MaxNearbyEntities', 'RequiredPlayerRange'];
    const extra = keys.map(k => `${k}:${Math.max(0, Math.round(Number(sp[k]) || 0))}s`).join(',');
    return `/setblock ${pos} minecraft:spawner{SpawnData:${spawnData},${extra}} replace`;
}

// Zusätzliche Befehle nach dem Beschwören (Truhe füllen, Markierung entfernen)
function followUpCommands() {
    if (!hasChestLoot()) return [];
    return [
        `/execute as @e[tag=${CHEST_TAG},limit=1,sort=nearest] run loot replace entity @s horse.0 15 loot ${chestLootId()}`,
        `/tag @e[tag=${CHEST_TAG}] remove ${CHEST_TAG}`
    ];
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
    const lines = [cmd || ''];
    if (mob.out.fn.cmd === 'summon') lines.push(...followUpCommands());
    return `# ${mob.name.text || mobName(m)} – ` + tr`erstellt mit Minecraft Tools (${versionLabel()})` + `\n${lines.map(l => l.replace(/^\//, '')).join('\n')}\n`;
}
function functionIds() {
    const ns = (mob.out.fn.ns || T().namespace || tr('meinserver')).toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
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
    const input = h('input', { type: 'text', placeholder: tr('Mob suchen…'), value: mobSearch, spellcheck: 'false' });
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
        }, icon(mobIconId(m)), h('span', null, m.de), m.avail[0] > 0 ? h('small', null, tr('ab ') + VERSIONS[m.avail[0]].id) : null)),
        ...(list.length ? [] : [h('div', { class: 'picker-empty' }, tr('Kein Mob gefunden.'))]));
    };
    input.addEventListener('input', debounce(() => { mobSearch = input.value; draw(); }, 100));
    const total = MD.mobs.filter(m => mobAvailable(m, vi)).length;
    el.replaceChildren(
        h('h2', null, h('span', { class: 'step-no' }, '1'), tr('Mob wählen'), infoBtn(HELP_MOB.list, tr('Mob wählen'))),
        explain(tr`${total} Mobs gibt es in ${versionLabel()}. Neuere Mobs erscheinen automatisch, wenn du oben eine passende Version wählst.`),
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
            h('p', null, tr`Diesen Mob gibt es in ${versionLabel()} nicht (${vi < a[0] ? tr('erst ab ') + VERSIONS[a[0]].id : tr('nur bis ') + VERSIONS[a[1]].id}). Wähle links einen anderen Mob oder oben eine andere Version.`)));
        return;
    }
    const sections = [];

    // Kopf-Banner
    const specCount = mobFields(m).filter(d => !BASE_ORIGINS.has(d.o) && !HIDE.has(d.n) && !OWN_UI.has(d.n) && (simpleType(d.t) || mobSpecialFor(d.n))).length;
    sections.push(h('div', { class: 'scene mob-scene scene-' + m.cat },
        h('div', { class: 'scene-icon bob' }, icon(mobIconId(m), { eager: true, cls: 'big' })),
        h('div', { style: 'flex:1;min-width:0' },
            h('h2', null, mob.name.text || mobName(m), infoBtn(HELP_MOB.scene, tr('Mob-Generator'))),
            h('p', null, `minecraft:${m.id} · ${CAT_LABEL[m.cat] || tr('Sonstige')} · ` + tr`${specCount} eigene Einstellungen in ${versionLabel()}`)),
        h('div', { class: 'scene-meta' },
            h('span', { class: 'badge' }, m.avail[0] > 0 ? tr('Seit ') + VERSIONS[m.avail[0]].id : tr('Seit vor 1.21')),
            h('span', { class: 'badge' }, m.egg && availIn('items', m.egg) ? tr('Hat Spawn-Ei') : tr('Kein Spawn-Ei')))));
    sections.push(explain(h('span', { class: 'step-no' }, '2'), h('span', null, h('b', null, tr('Mob einstellen: ')),
        tr('Öffne die Bereiche und stelle ein, was du brauchst – alles andere bleibt wie im normalen Spiel. Rechts entsteht sofort der fertige Befehl.'))));

    // 1. Name & Aussehen
    const hasBaby = fm.has('IsBaby') || fm.has('Age');
    const scaleId = mobAttrOptions(m).find(([id]) => shortAttr(id) === 'scale')?.[0];
    const scaleAttr = scaleId ? mob.attrs.find(a => a.id === scaleId) : null;
    sections.push(mobSection('look', tr('Name & Aussehen'), mob.name.text ? `„${mob.name.text}“` : null, h('div', null,
        fm.has('CustomName') ? field(tr('Name über dem Kopf'), h('div', { class: 'list-row', style: 'margin:0' },
            h('input', { type: 'text', value: mob.name.text, placeholder: mobName(m), style: 'flex:1;min-width:160px',
                oninput: ev => { mob.name.text = ev.target.value; mobChanged(); } }),
            colorInput(mob.name, 'color', mobChanged),
            checkInput(mob.name, 'bold', tr('fett'), { ch: mobChanged }),
            checkInput(mob.name, 'italic', tr('kursiv'), { ch: mobChanged })), null, HELP_MOB.name) : null,
        mob.name.text ? h('div', { class: 'field' }, checkInput(mob.name, 'visible', tr('Name immer sichtbar (nicht nur beim Anschauen)'), { ch: mobChanged })) : null,
        h('div', { class: 'grid-2' },
            hasBaby ? h('div', { class: 'field' }, checkInput(mob, 'baby', tr('Baby'), { ch: mobChanged, after: mobRedraw, help: HELP_MOB.baby })) : null,
            scaleId ? field(tr('Größe (1 = normal)'), h('input', {
                type: 'number', min: 0.0625, max: 16, step: 0.1, value: scaleAttr ? scaleAttr.base : '', placeholder: '1',
                oninput: ev => {
                    const v = ev.target.value;
                    const idx = mob.attrs.findIndex(a => a.id === scaleId);
                    if (v === '') { if (idx >= 0) mob.attrs.splice(idx, 1); } else if (idx >= 0) mob.attrs[idx].base = +v; else mob.attrs.push({ id: scaleId, base: +v });
                    mobChanged();
                }
            }), tr('0,0625 bis 16 – z. B. 3 für einen Riesen'), HELP_MOB.scale) : null),
        fm.has('Rotation') ? field(tr('Blickrichtung'), h('div', { class: 'range-input' },
            numInput(mob.rot, 'yaw', { ch: mobChanged, width: 90, placeholder: tr('Drehung') }), h('span', null, tr('° Drehung')),
            numInput(mob.rot, 'pitch', { ch: mobChanged, width: 90, placeholder: tr('Neigung') }), h('span', null, tr('° Neigung'))),
            tr('0 = Süden, 90 = Westen, 180 = Norden, -90 = Osten. Wirkt dauerhaft nur mit „Keine KI“.'), HELP_MOB.rotation) : null
    ), HELP_MOB.look));

    // 2. Leben & Verhalten
    const behaviorEls = BEHAVIOR.filter(n => fm.has(n) && behaviorMakesSense(n, m)).map(n => genericField(fm.get(n), mob.base, n, mobChanged)).filter(Boolean);
    sections.push(mobSection('behavior', tr('Leben & Verhalten'), null, h('div', null,
        fm.has('Health') ? field(tr('Lebenspunkte'), numInput(mob, 'health', { min: 0, step: 1, width: 120, ch: mobChanged, placeholder: attrDefault(m, 'max_health') != null ? fmtNum(attrDefault(m, 'max_health')) : tr('Standard') }),
            tr`2 = ein Herz. Standard bei ${mobName(m)}: ${fmtNum(attrDefault(m, 'max_health') ?? 20)}. Mehr wird automatisch auch als maximale Gesundheit gesetzt.`, HELP_MOB.health) : null,
        h('div', { class: 'gen-grid' }, behaviorEls),
        fm.has('Tags') ? field('Tags', chipList(mob.tags, new Map(), { ch: mobChanged, placeholder: tr('Tag eingeben und Enter …'), emptyText: tr('Keine Tags') }),
            null, HELP_MOB.tags) : null
    ), HELP_MOB.behavior));

    // 3. Mob-spezifisch
    const specDefs = mobFields(m).filter(d => !BASE_ORIGINS.has(d.o) && !BEHAVIOR.includes(d.n) && !HIDE.has(d.n) && !OWN_UI.has(d.n) && !CHEST_FIELDS.has(d.n));
    const specEls = specDefs.filter(d => d.n !== 'IsBaby' && !(mob.baby && d.n === 'Age')).map(d => genericField(d, mob.spec, d.n, mobChanged)).filter(Boolean);
    sections.push(mobSection('spec', tr`Eigenschaften: ${mobName(m)}`, specEls.length ? tr`${specEls.length} Optionen` : tr('keine'),
        specEls.length ? h('div', { class: 'gen-grid' }, specEls)
            : h('div', { class: 'empty-note' }, tr`${mobName(m)} hat in ${versionLabel()} keine eigenen Einstellungen – nutze die allgemeinen Bereiche.`),
        HELP_MOB.spec));

    // 4. Ausrüstung
    if ((fm.has('equipment') || fm.has('ArmorItems') || fm.has('HandItems')) && slotsOf(m).length) {
        sections.push(mobSection('equip', tr('Ausrüstung'), Object.values(mob.equip).filter(x => x?.id).length ? tr`${Object.values(mob.equip).filter(x => x?.id).length} Teile` : null,
            equipmentEditor(m, fm), HELP_MOB.equip));
    }

    // Truhe (Esel, Maultier, Lama, Händlerlama)
    if (fm.has('ChestedHorse')) sections.push(mobSection('chest', tr('Truhe'), mob.spec.ChestedHorse || chestLootId() ? (chestLootId() ? tr('mit Inhalt') : tr('trägt Truhe')) : null, chestEditor(m, fm), HELP_MOB.chest));

    // 5. Attribute
    if (fm.has('attributes')) sections.push(mobSection('attrs', tr('Attribute (Werte)'), mob.attrs.length ? `${mob.attrs.length}` : null, attributeEditor(), HELP_MOB.attrs));
    // 6. Effekte
    if (fm.has('active_effects')) sections.push(mobSection('effects', tr('Effekte'), mob.effects.length ? `${mob.effects.length}` : null, effectEditor(), HELP_MOB.effects));
    // 7. Drops
    if (fm.has('DeathLootTable')) sections.push(mobSection('loot', tr('Drops (Loot-Table)'), lootTableId() || null, lootEditor(), HELP_MOB.loot));
    // 8. Handel
    if (fm.has('Offers')) sections.push(mobSection('trades', tr('Handel'), mob.trades.length ? tr`${mob.trades.length} Angebote` : null, tradeEditor(fm), HELP_MOB.trades));
    // 9. Reiter
    if (fm.has('Passengers')) sections.push(mobSection('riders', tr('Reiter & Reittier'), (mob.passengers.length || mob.mount) ? tr('aktiv') : null, riderEditor(), HELP_MOB.riders));
    // 10. Erweitert
    sections.push(mobSection('extra', tr('Eigenes NBT (Experten)'), mob.extra.trim() ? tr('aktiv') : null, h('div', null,
        explain(tr('Für alles, was es oben nicht gibt: zusätzliche NBT-Einträge, die unverändert angehängt werden. Beispiel: '), h('code', null, 'Motion:[0.0d,1.0d,0.0d]')),
        h('textarea', { rows: 3, spellcheck: 'false', placeholder: tr('Schlüssel:Wert,Schlüssel:Wert'), value: mob.extra,
            oninput: ev => { mob.extra = ev.target.value; mobChanged(); }, style: 'font-family:var(--mono);font-size:12.5px' })
    ), HELP_MOB.extra));

    el.replaceChildren(...sections);
}

// Linkshänder/Items aufheben nur bei Mobs, die überhaupt etwas halten oder tragen können
function behaviorMakesSense(name, m) {
    if (name === 'LeftHanded') return (m.eq || []).includes('hands');
    if (name === 'CanPickUpLoot') return hasHands(m) || (m.eq || []).includes('armor');
    return true;
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
    const hintFromRange = range ? tr`${range[0] ?? '…'} bis ${range[1] ?? '…'}` : null;
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
                min: range?.[0] ?? undefined, max: range?.[1] ?? undefined, step: intLike ? 1 : 'any', width: 130, ch, placeholder: tr('Standard')
            }), hintFromRange, help);
        }
        case 'id': {
            const opts = regOptions(t.reg);
            if (opts) return field(label, selectInput(store, key, [['', tr('– Standard –')], ...opts], { ch, style: 'max-width:260px' }), null, help);
            return field(label, textInput(store, key, { ch, placeholder: 'minecraft:…', style: 'max-width:260px' }), null, help);
        }
        case 'string':
            return field(label, textInput(store, key, { ch, style: 'max-width:260px' }), null, help);
        case 'enum':
            return field(label, selectInput(store, key, [['', tr('– Standard –')], ...t.values.map(v => [v[0], v[1]])], { ch, style: 'max-width:260px' }), null, help);
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
    }, FISH_PATTERNS.map(([s, p, l]) => h('option', { value: `${s}:${p}` }, `${l} (${s ? tr('groß') : tr('klein')})`)));
    const colorSel = k => h('select', { value: String(v[k]), onchange: e => { v[k] = +e.target.value; ch(); } }, DYE_DE.map((l, i) => h('option', { value: String(i) }, l)));
    return h('div', { class: 'gen-grid' },
        field(tr('Muster'), patternSel), field(tr('Grundfarbe'), colorSel('base')), field(tr('Musterfarbe'), colorSel('patternColor')));
}

function blockPickField(store, key, ch) {
    const wrap = h('div', { class: 'row' });
    const draw = () => wrap.replaceChildren(
        store[key] ? h('span', { class: 'chip' }, icon(store[key]), itemName(store[key]),
            h('button', { type: 'button', onclick: () => { delete store[key]; ch(); draw(); } }, '×')) : h('span', { class: 'muted' }, tr('kein Block')),
        h('button', { type: 'button', class: 'btn btn-small', onclick: () => openItemPicker({
            title: tr('Block wählen'), filter: id => ITEMS.get(id)?.block, onPick: id => { store[key] = id; ch(); draw(); }
        }) }, tr('Block wählen…')));
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
            const slotItemsFilter = slotFilter(m, slot);
            const pick = () => openItemPicker({
                title: tr`${label}: Item wählen`, filter: slotItemsFilter,
                onPick: id => { mob.equip[slot] = newItem(id); mobChanged(); draw(); openMobItemEditor(slot); }
            });
            const d = mob.drop[slot] || { mode: 'default', pct: 50 };
            return h('div', { class: 'equip-card' + (valid ? '' : ' empty') },
                h('div', { class: 'equip-slot-label' }, label),
                h('button', { class: 'slot equip-slot' + (valid && isItemGlint(it) ? ' glint' : ''), title: valid ? itemName(it.id) : tr('Item wählen'), onclick: () => valid ? openMobItemEditor(slot) : pick() },
                    valid ? icon(it.id) : h('span', { class: 'plus' }, '+'), valid && it.count > 1 ? h('span', { class: 'count' }, it.count) : null),
                h('div', { class: 'equip-name' }, valid ? (it.name.text || itemName(it.id)) : tr('leer')),
                valid ? h('div', { class: 'row', style: 'gap:4px;justify-content:center' },
                    h('button', { class: 'btn btn-small', onclick: () => openMobItemEditor(slot) }, tr('Bearbeiten')),
                    h('button', { class: 'icon-btn', title: tr('Entfernen'), onclick: () => { delete mob.equip[slot]; mobChanged(); draw(); } }, '🗑')) : null,
                h('select', {
                    class: 'drop-select', title: tr('Chance, dass der Mob dieses Teil beim Tod fallen lässt'),
                    value: d.mode, onchange: e => { mob.drop[slot] = { ...d, mode: e.target.value }; mobChanged(); draw(); }
                }, [['default', tr('Drop: Standard')], ['never', tr('Drop: nie')], ['always', tr('Drop: immer')], ['custom', tr('Drop: eigene %')]].map(([v, l]) => h('option', { value: v }, l))),
                d.mode === 'custom' ? h('div', { class: 'range-input', style: 'justify-content:center' },
                    h('input', { type: 'number', min: 0, max: 100, value: d.pct, style: 'width:70px', oninput: e => { mob.drop[slot] = { ...d, mode: 'custom', pct: e.target.value }; mobChanged(); } }), h('span', null, '%')) : null);
        });
        wrap.replaceChildren(...[
            explain(tr('Klicke einen Platz an, um ein Item auszuwählen – danach kannst du Verzauberungen, Namen, Farbe und mehr einstellen. Darunter legst du fest, ob der Mob das Teil beim Tod fallen lässt.')),
            h('div', { class: 'equip-grid' }, cards),
            !fm.has('equipment') ? h('div', { class: 'hint', style: 'margin-top:8px' }, tr`In ${versionLabel()} wird die Ausrüstung noch im alten Format (ArmorItems/HandItems) geschrieben – das erledigt der Generator automatisch.`) : null
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

// opts.onDone: wird nach dem Schließen aufgerufen · opts.noCount: keine Anzahl anbieten (z. B. Bücherregal)
function openMobItemEditor(slot, target, opts = {}) {
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
        it.unbreakable ? h('div', { style: 'color:#5555FF' }, tr('Unzerbrechlich')) : null,
        h('div', { class: 'muted' }, 'minecraft:' + strip(it.id))));
    const enchBox = h('div');
    const drawEnch = () => {
        const opts = ENCH_LIST.filter(x => availIn('enchantments', x.id) && (BOOKS.has(strip(it.id)) || x.items.has(strip(it.id))));
        const all = ENCH_LIST.filter(x => availIn('enchantments', x.id));
        enchBox.replaceChildren(
            ...it.ench.map((e, i) => h('div', { class: 'list-row' },
                h('select', { value: e.id, onchange: ev => { e.id = ev.target.value; ch(); } },
                    (opts.some(o => o.id === e.id) ? opts : [ENCH.get(e.id), ...opts].filter(Boolean)).map(o => h('option', { value: o.id }, o.de))),
                h('span', { class: 'hint' }, tr('Stufe')),
                numInput(e, 'lvl', { min: 1, max: 255, step: 1, width: 70, ch }),
                h('span', { class: 'hint' }, tr`normal max. ${roman(ENCH.get(e.id)?.max || 1)}`),
                h('button', { class: 'icon-btn', onclick: () => { it.ench.splice(i, 1); ch(); drawEnch(); } }, '🗑'))),
            h('button', { class: 'btn btn-small', onclick: () => {
                const used = new Set(it.ench.map(e => e.id));
                const next = (opts.length ? opts : all).find(o => !used.has(o.id));
                if (next) { it.ench.push({ id: next.id, lvl: next.max }); ch(); drawEnch(); }
            } }, tr('+ Verzauberung')),
);
    };
    const loreBox = h('div');
    const drawLore = () => loreBox.replaceChildren(
        ...it.lore.map((l, i) => h('div', { class: 'list-row' },
            h('input', { type: 'text', value: l.text, placeholder: tr`Zeile ${i + 1}`, style: 'flex:1;min-width:160px', oninput: ev => { l.text = ev.target.value; ch(); } }),
            colorInput(l, 'color', ch),
            h('button', { class: 'icon-btn', onclick: () => { it.lore.splice(i, 1); ch(); drawLore(); } }, '🗑'))),
        h('button', { class: 'btn btn-small', onclick: () => { it.lore.push({ text: '', color: 'gray', italic: false }); drawLore(); } }, tr('+ Zeile')));
    drawEnch();
    drawLore();
    drawPreview();
    const isDye = D.dyeable.includes(strip(it.id));
    const isTrim = D.trimmable.includes(strip(it.id));
    body.append(h('div', { class: 'editor' },
        h('div', null,
            info && info.maxStack > 1 && !opts.noCount ? field(tr('Anzahl'), numInput(it, 'count', { min: 1, max: 99, step: 1, width: 90, ch })) : null,
            isEnchantable(it.id) ? [h('div', { class: 'field-label', style: 'margin-bottom:6px' }, tr('Verzauberungen'), infoBtn(HELP.ench, tr('Verzauberungen'))), enchBox, h('hr', { class: 'sep' })] : null,
            field(tr('Name'), h('div', { class: 'list-row', style: 'margin:0' },
                h('input', { type: 'text', value: it.name.text, placeholder: itemName(it.id), style: 'flex:1;min-width:160px', oninput: ev => { it.name.text = ev.target.value; ch(); } }),
                colorInput(it.name, 'color', ch), checkInput(it.name, 'bold', tr('fett'), { ch })), null, HELP.name),
            h('div', { class: 'field-label', style: 'margin:4px 0 6px' }, tr('Beschreibung (Lore)'), infoBtn(HELP.lore, tr('Lore'))), loreBox, h('hr', { class: 'sep' }),
            h('div', { class: 'grid-2' },
                info?.maxDamage ? h('div', { class: 'field' }, checkInput(it, 'unbreakable', tr('Unzerbrechlich'), { ch, help: HELP.unbreakable })) : null,
                field(tr('Verzauberungs-Glanz'), selectInput(it, 'glint', [['', tr('Automatisch')], ['on', tr('Immer')], ['off', tr('Nie')]], { ch }), null, HELP.glint)),
            info?.maxDamage ? field(tr('Haltbarkeit (%)'), numInput(it, 'damage', { min: 0, max: 100, step: 1, width: 90, ch, placeholder: '100' }), tr('100 = neu, 10 = fast kaputt'), HELP.damage) : null,
            isDye ? field(tr('Farbe'), h('div', { class: 'row' },
                h('input', { type: 'color', value: it.color || '#a06540', style: 'width:48px;height:34px;padding:2px', oninput: ev => { it.color = ev.target.value; ch(); } }),
                h('button', { class: 'btn btn-small', onclick: () => { it.color = ''; ch(); modal.close(); openMobItemEditor(slot, target); } }, tr('Standardfarbe'))), tr('Für Leder-Rüstung, Wolfsrüstung usw.')) : null,
            isTrim ? h('div', { class: 'grid-2' },
                field(tr('Rüstungsbesatz: Material'), selectInput(it.trim, 'material', [['', tr('– keiner –')], ...(regOptions('trim_material') || [])], { ch })),
                field(tr('Rüstungsbesatz: Muster'), selectInput(it.trim, 'pattern', [['', tr('– keines –')], ...(regOptions('trim_pattern') || [])], { ch }))) : null),
        h('div', { class: 'editor-side' },
            h('div', { class: 'editor-item' }, icon(it.id), h('div', null, h('div', { class: 'name' }, itemName(it.id)), h('div', { class: 'id' }, 'minecraft:' + strip(it.id)))),
            h('div', { class: 'field-label' }, tr('Vorschau im Spiel')), preview)));
    const modal = openModal({ title: tr('Item einstellen'), wide: true, body, iconEl: icon(it.id, { eager: true }),
        foot: h('button', { class: 'btn btn-primary', onclick: () => modal.close() }, tr('Fertig')),
        onClose: () => {
            if (opts.onDone) { opts.onDone(); return; }
            if (!target) renderMobEditor(); else mobRedraw();
            renderMobOutput();
        } });
}

/* ---------- Attribute ---------- */
function attributeEditor() {
    const wrap = h('div');
    const m = curMob();
    const draw = () => {
        const opts = mobAttrOptions(m);
        const sorted = [...opts].sort((a, b) => a[1].localeCompare(b[1], 'de'));
        wrap.replaceChildren(
            explain(tr`Attribute sind die Grundwerte des Mobs: Lebenspunkte, Tempo, Schaden, Rüstung, Größe … Es stehen nur die ${opts.length} Attribute zur Auswahl, die ${mobName(m)} im Spiel wirklich hat.`),
            ...mob.attrs.map((a, i) => {
                const inf = ATTR_INFO[shortAttr(a.id)];
                return h('div', { class: 'list-row' },
                    h('select', { value: a.id, onchange: ev => { a.id = ev.target.value; mobChanged(); draw(); } },
                        (sorted.some(o => o[0] === a.id) ? sorted : [[a.id, a.id + tr(' (hat dieser Mob nicht)')], ...sorted]).map(([id, l]) => h('option', { value: id }, l))),
                    h('input', { type: 'number', step: 'any', value: a.base, min: inf?.[0], max: inf?.[1], style: 'width:110px',
                        oninput: ev => { a.base = ev.target.value === '' ? '' : +ev.target.value; mobChanged(); } }),
                    h('span', { class: 'hint' }, [attrDefault(m, a.id) != null ? tr`Standard ${fmtNum(attrDefault(m, a.id))}` : null, inf ? `${inf[0]} – ${inf[1]}` : null].filter(Boolean).join(' · ')),
                    h('button', { class: 'icon-btn', title: tr('Entfernen'), onclick: () => { mob.attrs.splice(i, 1); mobChanged(); draw(); } }, '🗑'));
            }),
            h('button', { class: 'btn btn-small', onclick: () => {
                const used = new Set(mob.attrs.map(a => a.id));
                const next = sorted.find(([id]) => !used.has(id) && shortAttr(id) === 'movement_speed') || sorted.find(([id]) => !used.has(id));
                if (next) { mob.attrs.push({ id: next[0], base: '' }); mobChanged(); draw(); }
            } }, tr('+ Attribut')));
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
            explain(tr('Trank-Effekte, die der Mob beim Erscheinen hat – z. B. Unsichtbarkeit, Feuerresistenz oder Stärke.')),
            ...mob.effects.map((e, i) => h('div', { class: 'list-row effect-row' },
                h('select', { value: e.id, onchange: ev => { e.id = ev.target.value; mobChanged(); } }, opts.map(([id, l]) => h('option', { value: id }, l))),
                h('span', { class: 'hint' }, tr('Stufe')),
                numInput(e, 'level', { min: 1, max: 256, step: 1, width: 64, ch: mobChanged }),
                checkInput(e, 'infinite', tr('dauerhaft'), { ch: mobChanged, after: draw }),
                e.infinite ? null : [numInput(e, 'seconds', { min: 1, step: 1, width: 80, ch: mobChanged }), h('span', { class: 'hint' }, tr('Sek.'))],
                checkInput(e, 'particles', tr('Partikel'), { ch: mobChanged }),
                h('button', { class: 'icon-btn', title: tr('Entfernen'), onclick: () => { mob.effects.splice(i, 1); mobChanged(); draw(); } }, '🗑'))),
            h('button', { class: 'btn btn-small', onclick: () => {
                mob.effects.push({ id: opts[0]?.[0] || 'speed', level: 1, seconds: 60, infinite: true, particles: true, ambient: false });
                mobChanged(); draw();
            } }, tr('+ Effekt')));
    };
    draw();
    return wrap;
}

/* ---------- Drops ---------- */
function lootEditor() {
    return lootSourceEditor(mob.loot, 'entity');
}

/* Auswahl einer Loot-Table für Drops (kind = 'entity') oder Truheninhalt (kind = 'chest') */
function lootSourceEditor(src, kind) {
    const wrap = h('div');
    const isChest = kind === 'chest';
    const draw = () => {
        const vanilla = [...VANILLA_TABLES.entries()].filter(([p, type]) => type === (isChest ? 'chest' : 'entity') && availIn('lootTables', p)).map(([p]) => p);
        const modes = isChest
            ? [['none', tr('Leer')], ['library', tr('Meine Loot-Table')], ['vanilla', tr('Vanilla-Truhe')], ['custom', tr('Eigene ID')]]
            : [['default', tr('Standard')], ['library', tr('Meine Loot-Table')], ['vanilla', tr('Wie anderer Mob')], ['custom', tr('Eigene ID')], ['none', tr('Keine Drops')]];
        const t = src.mode === 'library' ? tableById(src.value) : null;
        const wantType = isChest ? 'chest' : 'entity';
        const typeOk = !t || t.type === wantType || t.type === 'generic' || (isChest && t.type === 'display');
        const entries = t ? t.pools.reduce((n, p) => n + p.entries.length, 0) : 0;
        wrap.replaceChildren(
            seg(src, 'mode', modes, { ch: mobChanged, after: () => {
                // „Meine Loot-Table“: passende Loot-Table vorauswählen
                if (src.mode === 'library' && !tableById(src.value)) src.value = (state.tables.find(x => x.type === wantType) || {}).id || '';
                draw();
                renderLibrary();
            } }),
            h('div', { style: 'margin-top:12px' },
                src.mode === 'default' ? h('div', { class: 'hint' }, tr('Der Mob lässt fallen, was er auch normalerweise fallen lässt.')) : null,
                src.mode === 'none' ? h('div', { class: 'hint' }, isChest ? tr('Die Truhe bleibt leer.') : tr('Der Mob lässt nichts fallen (nutzt die leere Loot-Table minecraft:empty).')) : null,
                src.mode === 'library' ? h('div', null,
                    field(tr('Loot-Table aus deiner Liste'), h('div', { class: 'row', style: 'flex-wrap:wrap' },
                        h('select', { value: src.value, style: 'max-width:340px', onchange: ev => { src.value = ev.target.value; mobChanged(); draw(); renderLibrary(); } },
                            h('option', { value: '' }, tr('– Loot-Table wählen –')),
                            state.tables.map(x => h('option', { value: x.id },
                                tr`${tableId(x)} · ${TYPE_BY_ID.get(x.type)?.label || x.type} · ${x.pools.reduce((n, p) => n + p.entries.length, 0)} Einträge`))),
                        t ? h('button', { class: 'btn btn-small', onclick: () => { selectTable(t.id); showView('loot'); } }, tr('Bearbeiten →')) : null),
                        tr('Deine Loot-Tables aus dem Bereich „Loot-Tables“.')),
                    t && !typeOk ? h('div', { class: 'cond-warn' }, tr`⚠ Diese Loot-Table hat den Typ „${TYPE_BY_ID.get(t.type)?.label}“. ${isChest ? tr('Für Truheninhalt passt „Truhe / Behälter“') : tr('Für Drops passt „Mob-Drops“ – sonst funktionieren Bedingungen wie „von Spieler getötet“ nicht')}.`) : null,
                    t && !entries ? h('div', { class: 'cond-warn' }, tr('⚠ Diese Loot-Table ist noch leer – öffne sie mit „Bearbeiten“ und leg Items hinein.')) : null) : null,
                src.mode === 'vanilla' ? field(isChest ? tr('Inhalt wie') : tr('Drops wie'), selectInput(src, 'value', [['', tr('– wählen –')], ...vanilla.map(p => {
                    if (isChest) return [p, p.replace(/^chests\//, '').replace(/_/g, ' ')];
                    const id = p.replace(/^entities\//, '');
                    return [p, (ENTITIES.get(id.split('/')[0]) || id) + (id.includes('/') ? ' (' + id.split('/').slice(1).join('/') + ')' : '')];
                }).sort((a, b) => a[1].localeCompare(b[1], 'de'))], { ch: mobChanged, style: 'max-width:320px' }),
                    isChest ? tr('Die Truhe bekommt Beute wie eine Vanilla-Truhe, z. B. „simple dungeon“ oder „desert pyramid“.') : tr('Der Mob lässt die Beute eines anderen Mobs fallen – z. B. ein Zombie mit Blaze-Drops.')) : null,
                src.mode === 'custom' ? field(tr('Loot-Table-ID'), textInput(src, 'value', { ch: mobChanged, placeholder: isChest ? tr('meinserver:chests/esel_beute') : tr('meinserver:entities/boss') }), tr('namespace:pfad einer Loot-Table aus deinem Datapack')) : null),
            h('hr', { class: 'sep' }),
            h('div', { class: 'row', style: 'flex-wrap:wrap' },
                h('button', { class: 'btn btn-small btn-accent', onclick: () => createLootForMob(src, kind) },
                    isChest ? tr('+ Neue Loot-Table für diese Truhe') : tr('+ Neue Loot-Table für diesen Mob')),
                infoBtn(HELP_MOB.lootLink, tr('Loot-Table verknüpfen'))));
    };
    draw();
    return wrap;
}

// Legt eine neue Loot-Table in der Liste an (nichts wird ersetzt), verknüpft sie und öffnet sie zum Befüllen
function createLootForMob(src = mob.loot, kind = 'entity') {
    const slug = functionIds().name;
    const t = addTable({
        ...newTable(), type: kind === 'chest' ? 'chest' : 'entity', namespace: T().namespace || tr('meinserver'),
        path: (kind === 'chest' ? 'chests/' : 'entities/') + slug
    });
    src.mode = 'library';
    src.value = t.id;
    saveMob();
    renderSettings();
    refresh();
    showView('loot');
    toast(tr`Neue Loot-Table „${tableId(t)}“ angelegt und mit deinem Mob verknüpft – jetzt Items hinzufügen.`);
}

/* ---------- Truhe ---------- */
const CHEST_FIELDS = new Set(['ChestedHorse', 'Strength']);
function chestEditor(m, fm) {
    const wrap = h('div');
    const draw = () => {
        const isLlama = fm.has('Strength');
        const strength = Number(mob.spec.Strength) || 0;
        const slots = isLlama ? (strength ? tr`${strength * 3} Plätze` : tr('3 bis 15 Plätze (je nach Stärke)')) : tr('15 Plätze');
        wrap.replaceChildren(
            explain(tr`${mobName(m)} kann eine Truhe tragen (${slots}). Den Inhalt kannst du aus einer Loot-Table würfeln lassen – er wird direkt nach dem Beschwören hineingelegt.`),
            h('div', { class: 'grid-2' },
                h('div', { class: 'field' }, checkInput(mob.spec, 'ChestedHorse', tr('Trägt eine Truhe'), { ch: mobChanged, after: draw })),
                isLlama ? genericField(fm.get('Strength'), mob.spec, 'Strength', () => { mobChanged(); draw(); }) : null),
            h('div', { class: 'field-label', style: 'margin:6px 0' }, tr('Inhalt der Truhe'), infoBtn(HELP_MOB.chestLoot, tr('Truheninhalt'))),
            lootSourceEditor(mob.chest, 'chest'),
            chestLootId() && !mob.spec.ChestedHorse ? h('div', { class: 'hint', style: 'margin-top:8px' }, tr('Hinweis: Mit Inhalt bekommt der Mob automatisch eine Truhe.')) : null);
    };
    draw();
    return wrap;
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
                allowEdit ? h('button', { class: 'btn btn-small', onclick: () => openMobItemEditor(null, it) }, tr('Extras')) : null,
                h('button', { class: 'icon-btn', title: tr('Entfernen'), onclick: () => { obj[key] = null; mobChanged(); draw(); } }, '🗑')) : null);
    };
    const draw = () => {
        const vd = mob.spec.VillagerData || {};
        const prof = vd.profession;
        const needsProf = curMob().id === 'villager' && (!prof || prof === 'none' || prof === 'nitwit');
        wrap.replaceChildren(
            explain(tr('Eigene Handelsangebote: links, was der Spieler bezahlt (bis zu zwei Items), rechts, was er bekommt. Das Verkaufs-Item kannst du über „Extras“ verzaubern oder benennen.')),
            needsProf ? h('div', { class: 'cond-warn', style: 'margin-bottom:10px' }, tr('⚠ Ein Dorfbewohner ohne Beruf (oder ein Nichtsnutz) öffnet kein Handelsmenü. '),
                h('button', { class: 'btn btn-small', onclick: () => {
                    mob.spec.VillagerData = { ...(mob.spec.VillagerData || {}), profession: 'mason', level: vd.level || 5 };
                    mobRedraw();
                } }, tr('Beruf auf „Maurer“ setzen'))) : null,
            ...mob.trades.map((tr, i) => h('div', { class: 'trade-row' },
                itemButton(tr, 'buy', tr('Preis'), false), h('span', { class: 'trade-plus' }, '+'), itemButton(tr, 'buyB', tr('2. Preis (optional)'), false),
                h('span', { class: 'trade-arrow' }, '➜'), itemButton(tr, 'sell', tr('Ware'), true),
                h('div', { class: 'trade-opts' },
                    field(tr('Max. Nutzungen'), numInput(tr, 'maxUses', { min: 1, step: 1, width: 90, ch: mobChanged })),
                    field(tr('Händler-EP'), numInput(tr, 'xp', { min: 0, step: 1, width: 80, ch: mobChanged })),
                    field(tr('Preis-Schwankung'), numInput(tr, 'priceMultiplier', { min: 0, step: 0.01, width: 80, ch: mobChanged }), null, HELP_MOB.priceMultiplier),
                    checkInput(tr, 'rewardExp', tr('Spieler bekommt EP'), { ch: mobChanged })),
                h('button', { class: 'icon-btn', title: tr('Angebot löschen'), onclick: () => { mob.trades.splice(i, 1); mobChanged(); draw(); } }, '🗑'))),
            h('button', { class: 'btn btn-small', onclick: () => {
                mob.trades.push({ buy: { ...newItem('emerald'), count: 5 }, buyB: null, sell: newItem('diamond'), maxUses: 12, xp: 5, rewardExp: true, priceMultiplier: 0.05 });
                mobChanged(); draw();
            } }, tr('+ Angebot')));
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
            explain(tr('Lass andere Mobs auf deinem Mob reiten (z. B. ein Skelett auf einer Spinne) – oder setz deinen Mob auf ein Reittier.')),
            field(tr('Reitet auf (Reittier)'), selectInput(mob, 'mount', [['', tr('– reitet auf nichts –')], ...opts], { ch: mobChanged, style: 'max-width:280px' }),
                tr('Der Befehl beschwört dann das Reittier mit deinem Mob obendrauf.')),
            h('div', { class: 'field-label', style: 'margin:6px 0' }, tr('Reiter auf diesem Mob')),
            ...mob.passengers.map((p, i) => h('div', { class: 'list-row' },
                h('select', { value: p.id, onchange: ev => { p.id = ev.target.value; mobChanged(); draw(); } }, opts.map(([id, l]) => h('option', { value: id }, l))),
                h('input', { type: 'text', value: p.name || '', placeholder: tr('Name (optional)'), style: 'width:160px', oninput: ev => { p.name = ev.target.value; mobChanged(); } }),
                checkInput(p, 'baby', tr('Baby'), { ch: mobChanged }),
                h('button', { class: 'icon-btn', onclick: () => { mob.passengers.splice(i, 1); mobChanged(); draw(); } }, '🗑'))),
            h('button', { class: 'btn btn-small', onclick: () => { mob.passengers.push({ id: 'skeleton', name: '', baby: false }); mobChanged(); draw(); } }, tr('+ Reiter')));
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
    if (!mobAvailable(m)) { el.replaceChildren(h('h2', null, tr('Befehl')), h('div', { class: 'hint' }, tr('Wähle einen Mob, den es in dieser Version gibt.'))); return; }
    const cmd = currentCommand() || '';
    const warnings = mobWarnings(cmd);
    const typeOpts = [['summon', '/summon'], ['egg', tr('Spawn-Ei')], ['spawner', tr('Spawner')], ['function', '.mcfunction']];
    const opts = [];
    if (o.type === 'summon' || o.type === 'spawner') {
        opts.push(field(tr('Position'), textInput(o, 'pos', { ch: () => renderMobOutputSoon(), placeholder: '~ ~ ~' }), tr('~ ~ ~ = deine Position · ^ ^ ^2 = 2 Blöcke vor dir'), HELP_MOB.pos));
    }
    if (o.type === 'egg') {
        opts.push(h('div', { class: 'grid-2' },
            field(tr('Für Spieler'), textInput(o, 'target', { ch: () => renderMobOutputSoon(), placeholder: '@p' }), tr('@p = nächster, @s = du selbst')),
            field(tr('Anzahl'), numInput(o, 'eggCount', { min: 1, max: 64, step: 1, ch: () => renderMobOutputSoon() }))),
            field(tr('Name des Spawn-Eis (optional)'), textInput(o, 'eggName', { ch: () => renderMobOutputSoon(), placeholder: tr('z. B. Boss-Zombie') })));
    }
    if (o.type === 'spawner') {
        const sp = o.spawner;
        const ch = () => renderMobOutputSoon();
        opts.push(h('div', { class: 'grid-2' },
            field(tr('Mobs pro Spawn'), numInput(sp, 'SpawnCount', { min: 1, step: 1, ch })),
            field(tr('Spawn-Bereich'), numInput(sp, 'SpawnRange', { min: 1, step: 1, ch }), tr('Blöcke um den Spawner')),
            field(tr('Min. Pause (Ticks)'), numInput(sp, 'MinSpawnDelay', { min: 0, step: 1, ch }), tr('200 = 10 Sek.')),
            field(tr('Max. Pause (Ticks)'), numInput(sp, 'MaxSpawnDelay', { min: 0, step: 1, ch }), tr('800 = 40 Sek.')),
            field(tr('Max. Mobs in der Nähe'), numInput(sp, 'MaxNearbyEntities', { min: 1, step: 1, ch })),
            field(tr('Aktiv ab Spieler-Abstand'), numInput(sp, 'RequiredPlayerRange', { min: 1, step: 1, ch }), tr('Blöcke'))),
            h('div', { class: 'field' }, checkInput(sp, 'light', tr('Nur bei bestimmtem Licht spawnen'), { ch, after: renderMobOutput })),
            sp.light ? h('div', { class: 'grid-2' },
                field(tr('Max. Blocklicht (0–15)'), numInput(sp, 'blockLight', { min: 0, max: 15, step: 1, ch })),
                field(tr('Max. Himmelslicht (0–15)'), numInput(sp, 'skyLight', { min: 0, max: 15, step: 1, ch }))) : null);
    }
    if (o.type === 'function') {
        const ids = functionIds();
        const ch = () => renderMobOutputSoon();
        opts.push(h('div', { class: 'grid-2' },
            field(tr('Namespace'), textInput(o.fn, 'ns', { ch, placeholder: T().namespace || tr('meinserver') })),
            field(tr('Name der Funktion'), textInput(o.fn, 'name', { ch, placeholder: ids.name }))),
            field(tr('Befehl in der Datei'), seg(o.fn, 'cmd', [['summon', '/summon'], ['egg', tr('Spawn-Ei')], ['spawner', tr('Spawner')]], { ch: () => {}, after: renderMobOutput })),
            h('div', { class: 'path-box' }, `data/${ids.ns}/function/${ids.name}.mcfunction`),
            h('div', { class: 'hint', style: 'margin:6px 0' }, tr('Aufruf im Spiel: '), h('code', null, `/function ${ids.ns}:${ids.name}`)));
    }
    const text = o.type === 'function' ? functionFile() : cmd;
    const follow = o.type === 'summon' ? followUpCommands() : [];
    el.replaceChildren(
        h('div', { class: 'output-head' },
            h('h2', null, h('span', { class: 'step-no' }, '3'), tr('Befehl'), infoBtn(HELP_MOB.output, tr('Ausgabe'))),
            h('div', { class: 'output-actions' }, o.type === 'function'
                ? h('button', { class: 'btn btn-small btn-primary', onclick: () => downloadFile(functionIds().name + '.mcfunction', functionFile()) }, tr('Herunterladen'))
                : h('button', { class: 'btn btn-small', onclick: () => copyText(cmd) }, tr('Kopieren')))),
        seg(o, 'type', typeOpts, { ch: () => saveMob(), after: renderMobOutput }),
        h('div', { class: 'hint explain-inline', style: 'margin:8px 0' }, {
            summon: tr('Lässt den Mob sofort erscheinen. Im Chat oder in einem Befehlsblock eingeben.'),
            egg: tr('Gibt ein Spawn-Ei, das genau diesen Mob erzeugt – praktisch zum Verteilen oder für Kreativ-Inventare.'),
            spawner: tr('Setzt einen Monster-Spawner, der immer wieder diesen Mob erzeugt.'),
            function: tr('Speichert den Befehl als Funktion für dein Datapack – ohne Längenbegrenzung.')
        }[o.type]),
        h('div', { class: 'mob-out-opts' }, opts),
        h('ul', { class: 'warnings' }, (warnings.length ? warnings : [['ok', tr`Fertig für ${versionLabel()} – ${cmd.length} Zeichen.`]]).map(([c, t]) => h('li', { class: c }, t))),
        follow.length ? h('div', { class: 'cmd-steps' },
            h('div', { class: 'hint', style: 'margin-bottom:6px' }, tr`Diese ${follow.length + 1} Befehle nacheinander ausführen (Chat oder Befehlsblöcke) – oder einfacher als .mcfunction speichern:`),
            [cmd, ...follow].map((c, i) => h('div', { class: 'cmd-step' }, h('span', { class: 'step-no' }, i + 1),
                h('pre', { class: 'json cmd-out' }, highlightCmd(c)),
                h('button', { class: 'icon-btn', title: tr('Kopieren'), onclick: () => copyText(c) }, '⧉'))))
            : h('pre', { class: 'json cmd-out' }, highlightCmd(text || '')));
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
    if (o.type === 'egg' && !(m.egg && availIn('items', m.egg))) out.push(['err', tr`${mobName(m)} hat kein Spawn-Ei. Nutze /summon, einen Spawner oder eine Funktion.`]);
    if (o.type !== 'function' && cmd.length > 256) out.push(['warn', tr`Der Befehl hat ${cmd.length} Zeichen – im Chat sind nur 256 erlaubt. Nutze einen Befehlsblock oder eine .mcfunction.`]);
    if (m.id === 'villager' && mob.trades.length) {
        const p = mob.spec.VillagerData?.profession;
        if (!p || p === 'none' || p === 'nitwit') out.push(['warn', tr('Handel: Der Dorfbewohner braucht einen Beruf, sonst öffnet sich kein Handelsmenü.')]);
    }
    for (const [label, src] of [[tr('Drops'), mob.loot], [tr('Truhe'), mob.chest]]) {
        if (src.mode !== 'library' || (src === mob.chest && !fieldMap().has('ChestedHorse'))) continue;
        const t = tableById(src.value);
        if (!t) out.push(['err', tr`${label}: Keine Loot-Table aus deiner Liste gewählt.`]);
        else if (!t.pools.some(p => p.entries.length)) out.push(['warn', tr`${label}: Die Loot-Table „${tableId(t)}“ ist noch leer.`]);
        else out.push(['ok', tr`${label}: Denk daran, die Loot-Table ${tableId(t)} als JSON ins Datapack zu legen.`]);
    }
    if (hasChestLoot() && (o.type === 'egg' || o.type === 'spawner')) out.push(['warn', tr('Truheninhalt: Spawn-Ei und Spawner können die Truhe nicht füllen – dafür /summon oder .mcfunction nutzen.')]);
    const slotNames = Object.fromEntries(slotsOf(m));
    for (const [slot, it] of Object.entries(mob.equip)) {
        if (!it?.id) continue;
        if (!availIn('items', it.id)) out.push(['err', tr`Ausrüstung: „${itemName(it.id)}“ gibt es ${missingIn('items', it.id)} – wird weggelassen.`]);
        else if (!slotNames[slot]) out.push(['warn', tr`${mobName(m)} kann nichts im Platz „${slot}“ tragen – „${itemName(it.id)}“ wird weggelassen.`]);
        else if (slotFilter(m, slot) && !slotFilter(m, slot)(strip(it.id))) out.push(['warn', tr`„${itemName(it.id)}“ passt bei ${mobName(m)} nicht in „${slotNames[slot]}“ – wird weggelassen.`]);
    }
    if (mob.extra.trim() && /[{}]/.test(mob.extra) && (mob.extra.match(/\{/g) || []).length !== (mob.extra.match(/\}/g) || []).length) {
        out.push(['err', tr('Eigenes NBT: Die geschweiften Klammern sind nicht ausgeglichen.')]);
    }
    if (mob.base.NoAI && (mob.rot.yaw === '' && mob.rot.pitch === '')) out.push(['ok', tr('Tipp: Mit „Keine KI“ kannst du unter „Name & Aussehen“ die Blickrichtung festlegen.')]);
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
        if (!confirm(tr`Alle Einstellungen für ${mobName(curMob())} zurücksetzen?`)) return;
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
            toast(tr('Mob geladen'));
        } catch { toast(tr('Das ist keine gespeicherte Mob-Datei.')); }
    });
    $('#mob-copy').addEventListener('click', () => {
        const c = mob.out.type === 'function' ? functionFile() : currentCommand();
        if (!c) { toast(tr('Für diesen Mob gibt es diese Ausgabe nicht.')); return; }
        copyText(c);
        if (mob.out.type === 'summon' && followUpCommands().length) setTimeout(() => toast(tr('Befehl 1 kopiert – die Befehle 2 und 3 für die Truhe stehen rechts.')), 2500);
    });
    versionListeners.push(() => { if (currentView() === 'mob') renderMobView(); });
    let view = 'loot';
    try { view = localStorage.getItem('tools.view') || 'loot'; } catch { /* egal */ }
    showView(view);
}

initMob();

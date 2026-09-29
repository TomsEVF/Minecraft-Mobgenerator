#!/usr/bin/env python3
"""Erzeugt js/mcdata.js und js/mobdata.js aus den offiziellen Minecraft-Daten.

Quellen:
  - misode/mcmeta (Registries, Daten, Assets, Item-Komponenten pro Version)
  - SpyglassMC/vanilla-mcdoc (NBT-Schemas der Mobs mit Versionsangaben)
  - Mojang (deutsche Sprachdatei de_de)

Neue Minecraft-Version? Einfach unten in VERSIONS ergänzen und `python3 tools/gen_data.py` ausführen.
Downloads werden im System-Temp-Ordner zwischengespeichert.
"""
import json, os, re, sys, glob, subprocess, tarfile, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from mcdoc_parse import Schema, vkey          # noqa: E402
from mcdoc_flat import Flattener              # noqa: E402

VERSIONS = ['1.21', '1.21.1', '1.21.2', '1.21.3', '1.21.4', '1.21.5', '1.21.6', '1.21.7', '1.21.8',
            '1.21.9', '1.21.10', '1.21.11', '26.1', '26.1.1', '26.1.2', '26.2', '26.3']
LATEST = VERSIONS[-1]
OUT = os.path.join(HERE, '..', 'js')
CACHE = os.path.join(tempfile.gettempdir(), 'mc-tools-cache')
os.makedirs(CACHE, exist_ok=True)


# ---------------------------------------------------------------- Downloads
def fetch(url, name):
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        print('  lade', url)
        # curl statt urllib: funktioniert auch, wenn Python keine SSL-Zertifikate eingerichtet hat
        subprocess.run(['curl', '-sfL', '--retry', '3', '-o', path + '.part', url], check=True)
        os.replace(path + '.part', path)
    return path


def safe_extract(t, target):
    try:
        t.extractall(target, filter='data')
    except TypeError:   # ältere Python-Versionen kennen filter= noch nicht
        t.extractall(target)


def tarball(tag):
    """Lädt einen mcmeta-Tag als tar.gz und entpackt ihn (einmalig)."""
    target = os.path.join(CACHE, tag)
    if not os.path.isdir(target):
        tgz = fetch(f'https://codeload.github.com/misode/mcmeta/tar.gz/refs/tags/{tag}', tag + '.tgz')
        with tarfile.open(tgz) as t:
            safe_extract(t, target)
    return glob.glob(os.path.join(target, '*'))[0]


def jload(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def lang_de():
    manifest = jload(fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json', 'manifest.json'))
    url = next(v['url'] for v in manifest['versions'] if v['id'] == LATEST)
    vjson = jload(fetch(url, f'{LATEST}.json'))
    index = jload(fetch(vjson['assetIndex']['url'], f'assetindex-{LATEST}.json'))
    h = index['objects']['minecraft/lang/de_de.json']['hash']
    return jload(fetch(f'https://resources.download.minecraft.net/{h[:2]}/{h}', f'de_de-{LATEST}.json'))


print('Lade Daten …')
REG = {v: tarball(f'{v}-registries') for v in VERSIONS}
SUMMARY = tarball(f'{LATEST}-summary')
DATA = os.path.join(tarball(f'{LATEST}-data'), 'data', 'minecraft')
ASSETS = os.path.join(tarball(f'{LATEST}-assets'), 'assets', 'minecraft')
mcdoc_tgz = fetch('https://codeload.github.com/SpyglassMC/vanilla-mcdoc/tar.gz/refs/heads/main', 'vanilla-mcdoc.tgz')
MCDOC = os.path.join(CACHE, 'vanilla-mcdoc')
if not os.path.isdir(MCDOC):
    with tarfile.open(mcdoc_tgz) as t:
        safe_extract(t, MCDOC)
MCDOC = glob.glob(os.path.join(MCDOC, '*', 'java'))[0]
DE = lang_de()
EN = jload(os.path.join(ASSETS, 'lang', 'en_us.json'))
COMPS = jload(os.path.join(SUMMARY, 'item_components', 'data.min.json'))
VINFO = {v: jload(fetch(f'https://raw.githubusercontent.com/misode/mcmeta/{v}-summary/version.json', f'version-{v}.json')) for v in VERSIONS}


def registry(v, name):
    p = os.path.join(REG[v], name, 'data.min.json')
    return jload(p) if os.path.exists(p) else []


def availability(name, transform=lambda x: x):
    """{id: [von, bis]} als Versions-Indizes – nur für Einträge, die es nicht in allen Versionen gibt."""
    first, last = {}, {}
    for i, v in enumerate(VERSIONS):
        for x in registry(v, name):
            x = transform(x)
            first.setdefault(x, i)
            last[x] = i
    return {k: [first[k], last[k]] for k in first if not (first[k] == 0 and last[k] == len(VERSIONS) - 1)}


def L(key, fallback):
    return DE.get(key) or EN.get(key) or fallback


def pretty(s):
    return re.sub(r'(?<!^)(?=[A-Z])', ' ', str(s)).replace('_', ' ').strip().title()


# ---------------------------------------------------------------- Loot-Formate je Version
def loot_format(v):
    k = vkey(v)
    if k >= vkey('26.3'):
        return 'modern'
    if k >= vkey('26.2'):
        return 'v26_2'
    if k >= vkey('26.1'):
        return 'v26_1'
    if k >= vkey('1.21.4'):
        return 'legacy'
    return 'v1_21_0'


versions_out = []
for v in VERSIONS:
    info = VINFO[v]
    versions_out.append({
        'id': v, 'pack': info['data_pack_version'], 'minor': info.get('data_pack_version_minor'),
        'loot': loot_format(v), 'date': info['release_time'][:10]
    })

# ---------------------------------------------------------------- Items
blocks = set(registry(LATEST, 'block'))


def texture_for(iid):
    p = os.path.join(ASSETS, 'items', iid + '.json')
    if not os.path.exists(p):
        return None

    def first_model(o):
        if isinstance(o, dict):
            if o.get('type') in ('minecraft:model', 'model') and isinstance(o.get('model'), str):
                return o['model']
            for v in o.values():
                r = first_model(v)
                if r:
                    return r
        elif isinstance(o, list):
            for v in o:
                r = first_model(v)
                if r:
                    return r
        return None

    m = first_model(jload(p))
    tex = {}
    for _ in range(10):
        if not m:
            break
        mp = os.path.join(ASSETS, 'models', m.replace('minecraft:', '') + '.json')
        if not os.path.exists(mp):
            break
        md = jload(mp)
        for k, val in md.get('textures', {}).items():
            tex.setdefault(k, val)
        m = md.get('parent')

    def res(val):
        for _ in range(10):
            if isinstance(val, str) and val.startswith('#'):
                val = tex.get(val[1:])
        return val
    for k in ('layer0', 'all', 'side', 'texture', 'front', 'top', 'cross', 'plant', 'wall', 'particle'):
        val = res(tex.get(k))
        if isinstance(val, str) and not val.startswith('#'):
            val = val.replace('minecraft:', '')
            if os.path.exists(os.path.join(ASSETS, 'textures', val + '.png')):
                return val
    return None


all_items = []
seen = set()
for v in VERSIONS:
    for x in registry(v, 'item'):
        if x not in seen and x != 'air':
            seen.add(x)
            all_items.append(x)

items = []
for iid in sorted(all_items):
    c = COMPS.get(iid, {})
    tk = (c.get('minecraft:item_name') or {}).get('translate') or ('block.minecraft.' + iid if iid in blocks else 'item.minecraft.' + iid)
    tex = texture_for(iid) or ''
    rar = {'common': 0, 'uncommon': 1, 'rare': 2, 'epic': 3}.get(c.get('minecraft:rarity', 'common'), 0)
    items.append([iid, L(tk, pretty(iid)), EN.get(tk, pretty(iid)), 1 if iid in blocks else 0,
                  c.get('minecraft:max_damage', 0), c.get('minecraft:max_stack_size', 64), rar,
                  tex if tex and tex != 'item/' + iid else ''])


# Tags (aus der neuesten Version)
def tag_resolver(kind):
    base = os.path.join(DATA, 'tags', kind)
    raw = {os.path.relpath(f, base)[:-5]: jload(f)['values'] for f in glob.glob(base + '/**/*.json', recursive=True)}

    def resolve(t, depth=0):
        out = []
        for val in raw.get(t, []):
            if isinstance(val, dict):
                val = val['id']
            if val.startswith('#'):
                out += resolve(val[1:].replace('minecraft:', ''), depth + 1) if depth < 20 else []
            else:
                out.append(val.replace('minecraft:', ''))
        return out
    return raw, resolve


item_tags_raw, resolve_item_tag = tag_resolver('item')
ent_tags_raw, resolve_entity_tag = tag_resolver('entity_type')


def resolve_ref(ref, resolver):
    if isinstance(ref, list):
        return [r.replace('minecraft:', '') for r in ref]
    if ref.startswith('#'):
        return resolver(ref[1:].replace('minecraft:', ''))
    return [ref.replace('minecraft:', '')]


# Ausrüstbare Items: Slot + erlaubte Mobs (für Körper-/Sattel-Slot)
equip = {}
for iid, c in COMPS.items():
    eq = c.get('minecraft:equippable')
    if not eq:
        continue
    allowed = eq.get('allowed_entities')
    equip[iid] = [eq['slot'], sorted(set(resolve_ref(allowed, resolve_entity_tag))) if allowed else None]
# ab 26.x gibt es den Tag „dyeable“ nicht mehr – gleiche Items stecken in „cauldron_can_remove_dye“
dyeable = sorted(set(resolve_item_tag('dyeable') or resolve_item_tag('cauldron_can_remove_dye')))
trimmable = sorted(set(resolve_item_tag('trimmable_armor')))

# ---------------------------------------------------------------- Verzauberungen, Tränke, Biome …
et_raw, resolve_ench_tag = tag_resolver('enchantment')
curse = set(resolve_ench_tag('curse'))
treasure = set(resolve_ench_tag('treasure'))
ench = []
for f in sorted(glob.glob(os.path.join(DATA, 'enchantment', '*.json'))):
    e = jload(f)
    eid = os.path.basename(f)[:-5]
    ex = e.get('exclusive_set', '')
    ench.append([eid, L('enchantment.minecraft.' + eid, pretty(eid)), EN.get('enchantment.minecraft.' + eid, pretty(eid)),
                 e['max_level'], sorted(set(resolve_ref(e['supported_items'], resolve_item_tag))),
                 ex if isinstance(ex, str) else ','.join(ex), (1 if eid in curse else 0) | (2 if eid in treasure else 0)])


def potion_name(p):
    base = re.sub(r'^(strong|long)_', '', p)
    n = L('item.minecraft.potion.effect.' + base, pretty(base))
    if p.startswith('strong_'):
        n += ' II'
    if p.startswith('long_'):
        n += ' (verlängert)'
    return n


def union_ids(name):
    out = []
    for v in VERSIONS:
        for x in registry(v, name):
            if x not in out:
                out.append(x)
    return out


potions = [[p, potion_name(p)] for p in union_ids('potion')]
biomes = sorted([[b, L('biome.minecraft.' + b, pretty(b))] for b in union_ids('worldgen/biome')], key=lambda x: x[1])
structures = [[s, pretty(s)] for s in union_ids('worldgen/structure')]
entities = [[e, L('entity.minecraft.' + e, pretty(e))] for e in union_ids('entity_type')]
loot_type = {}
for f in glob.glob(os.path.join(DATA, 'loot_table', '**', '*.json'), recursive=True):
    loot_type[os.path.relpath(f, os.path.join(DATA, 'loot_table'))[:-5]] = jload(f).get('type', 'minecraft:generic').replace('minecraft:', '')
loot_tables = sorted([[p, loot_type.get(p, 'generic')] for p in union_ids('loot_table')])

mcdata = {
    'version': LATEST,
    'dataPackFormat': VINFO[LATEST]['data_pack_version'],
    'versions': versions_out,
    'items': items,
    'enchantments': ench,
    'potions': potions,
    'biomes': biomes,
    'structures': structures,
    'entities': entities,
    'itemTags': [[t, (resolve_item_tag(t) or [''])[0]] for t in sorted(item_tags_raw)],
    'enchantmentTags': sorted(et_raw),
    'lootTables': loot_tables,
    'equip': equip,
    'dyeable': dyeable,
    'trimmable': trimmable,
    'avail': {
        'items': availability('item'),
        'enchantments': availability('enchantment'),
        'potions': availability('potion'),
        'biomes': availability('worldgen/biome'),
        'structures': availability('worldgen/structure'),
        'entities': availability('entity_type'),
        'lootTables': availability('loot_table'),
    },
}

# ---------------------------------------------------------------- Mobs
print('Lese Mob-Schemas …')
schema = Schema(MCDOC, ['world/entity', 'util', 'world/item', 'world/component'])
if schema.errors:
    print('  Warnung – nicht lesbare Schema-Dateien:', schema.errors)
flat = Flattener(schema)
ent_avail = mcdata['avail']['entities']

NOT_MOBS = {'player', 'item', 'experience_orb', 'creaking_transient'}
CATEGORY = {
    'passive': 'allay armadillo axolotl bat camel cat chicken cod copper_golem cow donkey frog glow_squid happy_ghast horse '
               'mooshroom mule nautilus ocelot parrot pig pufferfish rabbit salmon sheep skeleton_horse sniffer snow_golem '
               'squid strider tadpole tropical_fish turtle villager wandering_trader zombie_horse',
    'neutral': 'bee dolphin enderman fox goat iron_golem llama panda piglin polar_bear trader_llama wolf zombified_piglin',
    'hostile': 'blaze bogged breeze camel_husk cave_spider creaking creeper drowned elder_guardian endermite evoker ghast giant '
               'guardian hoglin husk illusioner magma_cube parched phantom piglin_brute pillager ravager shulker silverfish '
               'skeleton slime spider stray sulfur_cube vex vindicator warden witch wither_skeleton zoglin zombie '
               'zombie_nautilus zombie_villager',
    'boss': 'ender_dragon wither',
    'other': 'armor_stand mannequin',
}
cat_of = {m: c for c, ms in CATEGORY.items() for m in ms.split()}

# Deutsche Beschriftungen für Auswahllisten aus den Schemas
DYE = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple',
       'blue', 'brown', 'green', 'red', 'black']
ENUM_DE = {
    'AxolotlVariantInt': {'Lucy': 'Leuzistisch (rosa)', 'Wild': 'Wild (braun)', 'Gold': 'Gold', 'Cyan': 'Cyan', 'Blue': 'Blau (sehr selten)'},
    'ParrotVariantInt': {'RedBlue': 'Rot-Blau', 'Blue': 'Blau', 'Green': 'Grün', 'YellowBlue': 'Gelb-Blau', 'Gray': 'Grau'},
    'RabbitType': {'Brown': 'Braun', 'White': 'Weiß', 'Black': 'Schwarz', 'BlackAndWhite': 'Schwarz-weiß gefleckt',
                   'Gold': 'Gold', 'SaltAndPepper': 'Salz und Pfeffer', 'Killer': 'Killerkaninchen (feindlich!)'},
    'FoxType': {'Red': 'Rot', 'Snow': 'Schneefuchs (weiß)'},
    'MooshroomType': {'Red': 'Rot', 'Brown': 'Braun'},
    'Gene': {'Normal': 'Normal', 'Lazy': 'Faul', 'Worried': 'Besorgt', 'Playful': 'Verspielt', 'Brown': 'Braun (rezessiv)',
             'Weak': 'Schwach (rezessiv)', 'Aggressive': 'Aggressiv'},
    'LlamaVariantInt': {'Creamy': 'Cremefarben', 'White': 'Weiß', 'Brown': 'Braun', 'Gray': 'Grau'},
    'PuffState': {'Deflated': 'Normal', 'HalfPuffed': 'Halb aufgebläht', 'Puffed': 'Aufgebläht'},
    'ArmadilloState': {'Idle': 'Normal', 'Rolling': 'Rollt sich ein', 'Scared': 'Eingerollt (verängstigt)', 'Unrolling': 'Rollt sich aus'},
    'DirectionByte': {'Down': 'Unten', 'Up': 'Oben', 'North': 'Norden', 'South': 'Süden', 'West': 'Westen', 'East': 'Osten'},
    'DragonPhase': {'Circling': 'Kreist', 'Strafing': 'Greift an (Feuerball)', 'FlyingToPortal': 'Fliegt zum Portal',
                    'Landing': 'Landet', 'TakingOff': 'Hebt ab', 'BreathAttack': 'Drachenatem', 'Landed': 'Gelandet (sitzt)',
                    'Roar': 'Brüllt', 'Charging': 'Stürzt auf Spieler', 'Dying': 'Stirbt', 'Hovering': 'Schwebt (keine KI)'},
    'WeatherState': {'Unaffected': 'Neu (glänzend)', 'Exposed': 'Angelaufen', 'Weathered': 'Verwittert', 'Oxidized': 'Oxidiert'},
    'ShulkerColor': {'Normal': 'Normal (lila)'},
}
HORSE_COLOR = {'White': 'Weiß', 'Creamy': 'Cremefarben', 'Chestnut': 'Kastanienbraun', 'Brown': 'Braun', 'Black': 'Schwarz',
               'Gray': 'Grau', 'DarkBrown': 'Dunkelbraun'}
HORSE_MARK = {'WhiteStockings': 'weiße Fesseln', 'WhiteField': 'weiße Flecken', 'WhiteDots': 'weiße Punkte',
              'BlackDots': 'schwarze Punkte'}


def label_enum(desc):
    name = desc.get('name') or ''
    for key in [name] + name.split('+'):
        if key.startswith('DyeColor'):
            for val in desc['values']:
                ck = re.sub(r'(?<!^)(?=[A-Z])', '_', val[1]).lower()
                if ck in DYE:
                    val[1] = L('color.minecraft.' + ck, val[1])
    table = {}
    for part in [name] + name.split('+'):
        table.update(ENUM_DE.get(part, {}))
    for val in desc['values']:
        if val[1] in table:
            val[1] = table[val[1]]
        elif name == 'HorseVariantAndMarkings':
            base, _, mark = val[1].partition('_With_')
            val[1] = HORSE_COLOR.get(base, base) + (' mit ' + HORSE_MARK.get(mark, mark) if mark else '')
        elif re.match(r'^[A-Z][A-Za-z]+$', val[1]) and len(val) > 1:
            val[1] = pretty(val[1])


def prepare(desc, regs):
    """Beschriftet Enums und merkt sich benötigte Registries (rekursiv)."""
    k = desc.get('k')
    if k == 'enum':
        label_enum(desc)
    if k == 'id':
        regs.add(desc['reg'])
    for a in desc.get('alts', []):
        prepare(a, regs)
    if isinstance(desc.get('of'), dict):
        prepare(desc['of'], regs)
    for fname, (fd, doc, o) in desc.get('fields', {}).items():
        prepare(fd, regs)


defs, def_index = [], {}
needed_regs = set()
mobs = []
for eid in sorted(schema.dispatch):
    if eid in NOT_MOBS:
        continue
    per_version = {}
    for i, v in enumerate(VERSIONS):
        a = ent_avail.get(eid, [0, len(VERSIONS) - 1])
        if not (a[0] <= i <= a[1]):
            continue
        fl = flat.entity(eid, v)
        if not fl or 'Health' not in fl:
            continue
        per_version[i] = fl
    if not per_version:
        continue
    # Feld-Varianten über Versionen zusammenfassen
    runs = {}   # (name, defIdx) -> [von, bis]
    order = []
    for i in sorted(per_version):
        for name, (desc, doc, origin) in per_version[i].items():
            prepare(desc, needed_regs)
            key = json.dumps([name, desc, doc, origin], sort_keys=True)
            if key not in def_index:
                def_index[key] = len(defs)
                defs.append({'n': name, 't': desc, 'o': origin, 'd': doc})
            di = def_index[key]
            if di in runs and runs[di][1] == i - 1:
                runs[di][1] = i
            elif di not in runs:
                runs[di] = [i, i]
                order.append(di)
            else:
                runs[di] = [i, i]   # Lücke – selten; nimmt den neuesten Bereich
    idx = sorted(per_version)
    egg = eid + '_spawn_egg'
    mobs.append({
        'id': eid,
        'de': L('entity.minecraft.' + eid, pretty(eid)),
        'cat': cat_of.get(eid, 'other'),
        'egg': egg if egg in seen else None,
        'avail': [idx[0], idx[-1]],
        'f': [[di] + runs[di] for di in order],
    })

# Registries für die Mob-Felder + Attribute, Effekte, Berufe, Rüstungsbesatz
needed_regs |= {'attribute', 'mob_effect', 'villager_profession', 'villager_type', 'trim_material', 'trim_pattern', 'loot_table'}
VILLAGER_TYPE_DE = {'desert': 'Wüste', 'jungle': 'Dschungel', 'plains': 'Ebene', 'savanna': 'Savanne', 'snow': 'Schnee',
                    'swamp': 'Sumpf', 'taiga': 'Taiga'}


def reg_label(reg, rid):
    base = rid.split('/')[-1]
    if reg == 'attribute':
        short = re.sub(r'^(generic|player|zombie|horse)\.', '', rid)
        return L('attribute.name.' + short, L('attribute.name.' + rid, pretty(short)))
    if reg == 'mob_effect':
        return L('effect.minecraft.' + rid, pretty(rid))
    if reg == 'villager_profession':
        return 'Ohne Beruf' if rid == 'none' else L('entity.minecraft.villager.' + rid, pretty(rid))
    if reg == 'villager_type':
        return VILLAGER_TYPE_DE.get(rid, pretty(rid))
    if reg in ('trim_material', 'trim_pattern'):
        return L(f'{reg}.minecraft.{rid}', pretty(rid))
    if reg == 'dimension':
        return {'overworld': 'Oberwelt', 'the_nether': 'Nether', 'the_end': 'Ende'}.get(rid, pretty(rid))
    return pretty(base)


regs_out = {}
# Registries, die das Tool nicht als Auswahlliste braucht (sehr groß oder nur für versteckte Felder)
SKIP_REGS = {'loot_table', 'texture', 'game_event', 'position_source_type'}
for reg in sorted(needed_regs):
    if reg in SKIP_REGS:
        continue
    ids = union_ids(reg)
    if not ids:
        continue
    regs_out[reg] = {'v': [[x, reg_label(reg, x)] for x in ids], 'avail': availability(reg)}

# Welche Mobs haben Körper- bzw. Sattel-Slot?
slots = {}
for iid, (slot, allowed) in equip.items():
    if slot in ('body', 'saddle') and allowed:
        for m in allowed:
            slots.setdefault(m, set()).add(slot)

mobdata = {
    'mobs': mobs,
    'defs': defs,
    'regs': regs_out,
    'slots': {m: sorted(s) for m, s in slots.items()},
}


def write(name, var, obj, comment):
    path = os.path.join(OUT, name)
    txt = f'// {comment}\n// Automatisch erzeugt von tools/gen_data.py – nicht von Hand bearbeiten.\n' \
          f'window.{var} = ' + json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + ';\n'
    with open(path, 'w', encoding='utf-8') as f:
        f.write(txt)
    print(f'  {name}: {len(txt) // 1024} KB')


write('mcdata.js', 'MC_DATA', mcdata, f'Minecraft-Daten {VERSIONS[0]} – {LATEST} (Items, Verzauberungen, Biome, Loot-Tables …)')
write('mobdata.js', 'MOB_DATA', mobdata, f'Mob-Daten {VERSIONS[0]} – {LATEST} (Felder je Version aus vanilla-mcdoc)')
print(f'Fertig: {len(items)} Items, {len(mobs)} Mobs, {len(defs)} Feld-Definitionen, {len(regs_out)} Registries.')

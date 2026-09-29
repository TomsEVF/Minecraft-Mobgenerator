'use strict';

/* =====================================================================
 * Daten
 * ===================================================================== */
const D = window.MC_DATA;
const ITEMS = new Map(D.items.map(a => [a[0], {
    id: a[0], de: a[1], en: a[2], block: !!a[3], maxDamage: a[4], maxStack: a[5], rarity: a[6], tex: a[7]
}]));
const ENCH = new Map(D.enchantments.map(a => [a[0], {
    id: a[0], de: a[1], en: a[2], max: a[3], items: new Set(a[4]), excl: a[5], curse: !!(a[6] & 1), treasure: !!(a[6] & 2)
}]));
const ENCH_LIST = [...ENCH.values()].sort((a, b) => a.de.localeCompare(b.de, 'de'));
const POTIONS = new Map(D.potions);
const BIOMES = new Map(D.biomes);
const STRUCTURES = new Map(D.structures);
const ENTITIES = new Map(D.entities);
const ITEM_TAGS = new Map(D.itemTags);
const VANILLA_TABLES = new Map(D.lootTables);
const POTION_ITEMS = new Set(['potion', 'splash_potion', 'lingering_potion', 'tipped_arrow']);
const BOOKS = new Set(['book', 'enchanted_book']);

const ICON_VERSION = '1.21.11';
const ASSETS = `https://raw.githubusercontent.com/misode/mcmeta/${D.version}-assets/assets/minecraft`;
const vanillaDataUrl = () => `https://raw.githubusercontent.com/misode/mcmeta/${state.version}-data/data/minecraft/loot_table`;

const TABLE_TYPES = [
    { id: 'chest', label: 'Truhe / Behälter', icon: 'chest', folder: 'chests', ctx: ['origin', 'this'],
      desc: 'Inhalt von Truhen, Fässern, Spendern usw. Wird beim ersten Öffnen erzeugt.' },
    { id: 'display', label: 'Regal / Rahmen / Topf', icon: 'oak_shelf', folder: 'display', ctx: ['origin', 'this'],
      desc: 'Füllt Regale (3 Plätze), Item-Rahmen und Deko-Töpfe per Befehl. Wird als Truhen-Loot-Table exportiert.' },
    { id: 'entity', label: 'Mob-Drops', icon: 'zombie_head', folder: 'entities', ctx: ['origin', 'this', 'mob', 'attacker', 'player_kill'],
      desc: 'Was ein Mob beim Tod fallen lässt. Plünderung, "von Spieler getötet" usw. verfügbar.' },
    { id: 'block', label: 'Block-Drops', icon: 'diamond_pickaxe', folder: 'blocks', ctx: ['origin', 'tool', 'explosion'],
      desc: 'Was ein Block beim Abbauen droppt. Behutsamkeit, Glück, Explosionen verfügbar.' },
    { id: 'fishing', label: 'Angeln', icon: 'fishing_rod', folder: 'gameplay/fishing', ctx: ['origin', 'this', 'tool', 'hook'],
      desc: 'Beute beim Angeln (ersetzt z. B. minecraft:gameplay/fishing).' },
    { id: 'archaeology', label: 'Archäologie', icon: 'brush', folder: 'archaeology', ctx: ['origin', 'this', 'tool'],
      desc: 'Beute aus verdächtigem Sand/Kies beim Abpinseln.' },
    { id: 'gift', label: 'Geschenk', icon: 'rabbit_foot', folder: 'gameplay', ctx: ['origin', 'this'],
      desc: 'Geschenke von Katzen oder Dorfbewohnern (Held des Dorfes).' },
    { id: 'barter', label: 'Piglin-Handel', icon: 'gold_ingot', folder: 'gameplay', ctx: ['this'],
      desc: 'Was Piglins für Gold hergeben.' },
    { id: 'shearing', label: 'Scheren', icon: 'shears', folder: 'shearing', ctx: ['origin', 'this', 'tool'],
      desc: 'Drops beim Scheren von Schafen, Mooshrooms usw.' },
    { id: 'equipment', label: 'Mob-Ausrüstung', icon: 'iron_chestplate', folder: 'equipment', ctx: ['origin', 'this'],
      desc: 'Ausrüstung, mit der Mobs (z. B. aus Trial Spawnern) erscheinen.' },
    { id: 'generic', label: 'Generisch / Befehl', icon: 'command_block', folder: '', ctx: ['origin', 'this', 'mob', 'attacker', 'player_kill', 'tool', 'explosion', 'hook'],
      desc: 'Für /loot-Befehle und eigene Zwecke. Alle Bedingungen erlaubt, aber nicht jede ist überall sinnvoll.' }
];
const TYPE_BY_ID = new Map(TABLE_TYPES.map(t => [t.id, t]));
// Typen, die es nur in Vanilla gibt – beim Import auf etwas Passendes abbilden
const TYPE_ALIASES = { block_interact: 'block', entity_interact: 'shearing', vault: 'chest' };

const COLORS = [
    ['', 'Standard', null], ['white', 'Weiß', '#FFFFFF'], ['gray', 'Grau', '#AAAAAA'], ['dark_gray', 'Dunkelgrau', '#555555'],
    ['black', 'Schwarz', '#000000'], ['yellow', 'Gelb', '#FFFF55'], ['gold', 'Gold', '#FFAA00'], ['red', 'Rot', '#FF5555'],
    ['dark_red', 'Dunkelrot', '#AA0000'], ['green', 'Grün', '#55FF55'], ['dark_green', 'Dunkelgrün', '#00AA00'],
    ['aqua', 'Türkis', '#55FFFF'], ['dark_aqua', 'Dunkeltürkis', '#00AAAA'], ['blue', 'Blau', '#5555FF'],
    ['dark_blue', 'Dunkelblau', '#0000AA'], ['light_purple', 'Hellviolett', '#FF55FF'], ['dark_purple', 'Violett', '#AA00AA']
];
const COLOR_HEX = Object.fromEntries(COLORS.filter(c => c[2]).map(c => [c[0], c[2]]));
const RARITY_COLOR = ['#FFFFFF', '#FFFF55', '#55FFFF', '#FF55FF'];
const RARITIES = [['', 'Standard'], ['common', 'Gewöhnlich (weiß)'], ['uncommon', 'Ungewöhnlich (gelb)'], ['rare', 'Selten (türkis)'], ['epic', 'Episch (violett)']];

const ENCH_TAGS = [
    ['on_random_loot', 'Alle normalen (wie Dungeon-Truhen)'],
    ['in_enchanting_table', 'Wie am Zaubertisch'],
    ['non_treasure', 'Alle außer Schatz-Verzauberungen'],
    ['treasure', 'Nur Schatz-Verzauberungen'],
    ['tradeable', 'Wie beim Dorfbewohner-Handel'],
    ['curse', 'Nur Flüche'],
    ['', 'Wirklich alle (inkl. Schatz & Flüche)']
];

/* ---------- Minecraft-Versionen ----------
 * D.versions: alle unterstützten Versionen (älteste zuerst) mit Datapack-Format und Loot-Table-Format.
 * D.avail[art][id] = [von, bis] als Index in D.versions – fehlt ein Eintrag, gibt es ihn in allen Versionen.
 */
const VERSIONS = D.versions;
const versionIndex = (id = state.version) => Math.max(0, VERSIONS.findIndex(v => v.id === id));
const versionLabel = (id = state.version) => 'Minecraft ' + id;

function availIn(kind, id, vi = versionIndex()) {
    const a = D.avail[kind]?.[strip(id)];
    return !a || (a[0] <= vi && vi <= a[1]);
}
// Hinweis, warum es etwas in der gewählten Version nicht gibt – oder null
function missingIn(kind, id) {
    const a = D.avail[kind]?.[strip(id)];
    if (!a) return null;
    const vi = versionIndex();
    if (vi < a[0]) return 'erst ab ' + VERSIONS[a[0]].id;
    if (vi > a[1]) return 'nur bis ' + VERSIONS[a[1]].id;
    return null;
}
// [id, label]-Listen auf die gewählte Version filtern
const inVersion = (kind, entries) => [...entries].filter(([id]) => availIn(kind, id));

// Alte Speicherstände kannten nur ein Format statt einer Version
const FMT_TO_VERSION = { modern: '26.3', v26_2: '26.2', v26_1: '26.1.2', legacy: '1.21.11', v1_21_0: '1.21.1' };
// Wird aufgerufen, wenn die Version wechselt (z. B. vom Mob-Generator)
const versionListeners = [];

function setVersion(id) {
    if (!VERSIONS.some(v => v.id === id)) id = VERSIONS[VERSIONS.length - 1].id;
    state.version = id;
    state.fmt = VERSIONS[versionIndex(id)].loot;
}

function packMcmeta(description = 'Meine Datapack-Inhalte') {
    const v = VERSIONS[versionIndex()];
    const pack = { description };
    pack.pack_format = v.pack;
    // Ab 1.21.9 (Format 88) gibt es min_format/max_format
    if (v.minor != null) {
        pack.min_format = [v.pack, v.minor];
        pack.max_format = [v.pack, v.minor];
    }
    return JSON.stringify({ pack }, null, 2);
}

/* =====================================================================
 * Kleine Helfer
 * ===================================================================== */
const $ = sel => document.querySelector(sel);
const strip = id => String(id || '').replace(/^#?minecraft:/, '');
// wie strip, aber ein Tag behält sein # (z. B. "#minecraft:is_forest" → "#is_forest")
const stripKeepTag = id => (String(id || '').startsWith('#') ? '#' : '') + strip(id);
const num = (v, d = 0) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
const uid = () => Math.random().toString(36).slice(2, 10);
const clone = o => JSON.parse(JSON.stringify(o));
const fmtPct = p => p <= 0 ? '0 %' : p < 0.1 ? '<0,1 %' : (p >= 99.95 ? '100 %' : p.toFixed(p < 10 ? 1 : 0).replace('.', ',') + ' %');
const roman = n => (['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] || String(n));
const itemInfo = id => ITEMS.get(strip(id));
const itemName = id => itemInfo(id)?.de || strip(id);
const enchName = id => ENCH.get(strip(id))?.de || strip(id);

// Leere Werte (null/false) und verschachtelte Listen beim Einfügen ignorieren –
// sonst würde der Browser „null“ als Text anzeigen, wenn ein optionales Element fehlt.
for (const method of ['replaceChildren', 'append']) {
    const original = Element.prototype[method];
    Element.prototype[method] = function (...kids) {
        return original.apply(this, kids.flat(Infinity).filter(k => k != null && k !== false));
    };
}

function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    const late = {};
    if (attrs) {
        for (const [k, v] of Object.entries(attrs)) {
            if (v == null || v === false) continue;
            if (k === 'class') el.className = v;
            else if (k === 'style') el.style.cssText = v;
            else if (k === 'value' || k === 'checked' || k === 'selected') late[k] = v;
            else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
            else el.setAttribute(k, v === true ? '' : v);
        }
    }
    for (const c of kids.flat(Infinity)) {
        if (c == null || c === false) continue;
        el.append(c instanceof Node ? c : String(c));
    }
    Object.assign(el, late);
    return el;
}

function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2400);
}

function downloadFile(name, content) {
    const blob = new Blob([content], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function copyText(txt) {
    try {
        await navigator.clipboard.writeText(txt);
    } catch {
        const ta = h('textarea', { style: 'position:fixed;opacity:0' });
        ta.value = txt;
        document.body.append(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
    }
    toast('In die Zwischenablage kopiert');
}

/* =====================================================================
 * Item-Bilder
 *  1. gerenderte Icons (auch 3D-Blöcke) von mc.nerothe.com
 *  2. Item-Textur aus den offiziellen Assets (misode/mcmeta)
 *  3. Textur laut Item-Modell (z. B. Wollstufe → Wolle)
 *  4. Block-Textur aus den offiziellen Assets
 *  5. Platzhalter mit Anfangsbuchstaben
 * ===================================================================== */
const ICON_SOURCES = [
    (id) => `https://mc.nerothe.com/img/${ICON_VERSION}/minecraft_${id}.png`,
    (id) => `${ASSETS}/textures/item/${id}.png`,
    (id, tex) => tex ? `${ASSETS}/textures/${tex}.png` : null,
    (id) => `${ASSETS}/textures/block/${id}.png`
];
let iconIdx = {};
try { iconIdx = JSON.parse(localStorage.getItem('lootbuilder.icons.v2') || '{}'); } catch { /* egal */ }
const saveIconIdx = debounce(() => {
    try { localStorage.setItem('lootbuilder.icons.v2', JSON.stringify(iconIdx)); } catch { /* egal */ }
}, 1000);

function icon(id, opts = {}) {
    id = strip(id);
    const wrap = h('span', { class: 'mc-icon ' + (opts.cls || '') });
    const info = ITEMS.get(id);
    const placeholder = () => {
        wrap.classList.add('ph');
        wrap.replaceChildren(id.split('_').map(s => s[0]).join('').slice(0, 3));
    };
    let i = iconIdx[id] ?? 0;
    if (!id || i >= ICON_SOURCES.length) { placeholder(); return wrap; }
    const img = h('img', { alt: '', draggable: 'false', loading: opts.eager ? 'eager' : 'lazy' });
    // nächste Quelle, die für dieses Item überhaupt eine URL liefert
    const nextSrc = () => {
        while (i < ICON_SOURCES.length) {
            const url = ICON_SOURCES[i](id, info?.tex);
            if (url) return url;
            i++;
        }
        return null;
    };
    img.onerror = () => {
        i++;
        const url = nextSrc();
        iconIdx[id] = i;
        saveIconIdx();
        if (url) img.src = url; else placeholder();
    };
    img.onload = () => {
        if (iconIdx[id] !== i) { iconIdx[id] = i; saveIconIdx(); }
    };
    const url = nextSrc();
    if (!url) { placeholder(); return wrap; }
    img.src = url;
    wrap.append(img);
    return wrap;
}

function specialIcon(txt) {
    return h('span', { class: 'mc-icon special' }, txt);
}

function entryIcon(e) {
    if (e.kind === 'item') return icon(e.name);
    if (e.kind === 'tag') {
        const first = ITEM_TAGS.get(strip(e.name));
        return first ? icon(first) : specialIcon('#');
    }
    if (e.kind === 'loot_table') return icon('chest_minecart');
    return icon('barrier');
}

/* =====================================================================
 * Zustand
 * ===================================================================== */
function newEntry(kind = 'item', name = '') {
    return {
        id: uid(), kind, name,
        weight: 1, quality: 0,
        count: { min: 1, max: 1 },
        expand: true,
        ench: {
            mode: 'none',
            list: [],
            random: { source: 'tag', tag: 'on_random_loot', ids: [], anyItem: false },
            levels: { min: 5, max: 30, tag: 'on_random_loot' }
        },
        customName: { text: '', color: '', bold: false, italic: false },
        lore: [],
        damage: { on: false, min: 50, max: 100 },
        potion: '',
        unbreakable: false,
        glint: '',
        rarity: '',
        cmd: { floats: '', strings: '' },
        looting: { on: false, min: 0, max: 1 },
        fortune: { on: false, formula: 'ore_drops' },
        explosionDecay: false,
        smelt: false,
        conditions: [],
        condMode: 'all'
    };
}

function newPool() {
    return { id: uid(), rolls: { min: 1, max: 1 }, bonusRolls: 0, entries: [], conditions: [], condMode: 'all', open: true };
}

function newTable() {
    return { namespace: 'meinserver', path: 'chests/meine_truhe', type: 'chest', randomSequence: true, pools: [newPool()] };
}

// Fehlende Felder (z. B. aus älteren Speicherständen) mit Standardwerten auffüllen
function withDefaults(def, obj) {
    if (Array.isArray(def)) return Array.isArray(obj) ? obj : def;
    if (def && typeof def === 'object') {
        const out = { ...obj };
        for (const k of Object.keys(def)) out[k] = (obj && k in obj) ? withDefaults(def[k], obj[k]) : def[k];
        return out;
    }
    return obj === undefined ? def : obj;
}

function hydrate(table) {
    const t = withDefaults(newTable(), table || {});
    t.pools = (t.pools || []).map(p => {
        const pool = withDefaults(newPool(), p);
        pool.id = p.id || uid();
        pool.entries = (pool.entries || []).map(e => ({ ...withDefaults(newEntry(e.kind), e), id: e.id || uid() }));
        pool.conditions = (pool.conditions || []).map(hydrateCond);
        pool.entries.forEach(e => { e.conditions = e.conditions.map(hydrateCond); });
        return pool;
    });
    if (!TYPE_BY_ID.has(t.type)) t.type = 'generic';
    return t;
}

function hydrateCond(c) {
    const def = COND_BY_TYPE.get(c.type);
    return { id: c.id || uid(), type: c.type, invert: !!c.invert, p: def ? withDefaults(def.def(), c.p || {}) : (c.p || {}) };
}

let state = { version: VERSIONS[VERSIONS.length - 1].id, fmt: 'modern', table: null };
let recent = [];

function loadState() {
    try {
        const s = JSON.parse(localStorage.getItem('lootbuilder.state') || 'null');
        if (s && s.table) state = { ...state, table: hydrate(s.table) };
        setVersion(s?.version || FMT_TO_VERSION[s?.fmt] || state.version);
    } catch { /* kaputter Speicherstand */ }
    if (!state.table) state.table = newTable();
    if (!state.fmt) setVersion(state.version);
    try { recent = JSON.parse(localStorage.getItem('lootbuilder.recent') || '[]'); } catch { recent = []; }
}

const saveState = debounce(() => {
    try { localStorage.setItem('lootbuilder.state', JSON.stringify(state)); } catch { /* voll */ }
}, 300);

function rememberItem(id) {
    recent = [id, ...recent.filter(x => x !== id)].slice(0, 18);
    try { localStorage.setItem('lootbuilder.recent', JSON.stringify(recent)); } catch { /* egal */ }
}

const T = () => state.table;
const ctxOf = () => TYPE_BY_ID.get(T().type)?.ctx || [];

const updateOutputSoon = debounce(updateOutput, 60);
const renderPoolsSoon = debounce(() => renderPools(), 120);

function changed() {
    saveState();
    updateOutputSoon();
}

function refresh() {
    renderPools();
    changed();
}

/* =====================================================================
 * Formular-Bausteine
 * ===================================================================== */
// hint: kurzer Text unter dem Feld (Erklärtexte sind abschaltbar, Warnungen mit ⚠ nicht) · help: Text für den „?“-Knopf
function field(label, control, hint, help) {
    const hintCls = typeof hint === 'string' && !hint.startsWith('⚠') ? 'hint explain-inline' : 'hint';
    return h('div', { class: 'field' },
        label ? h('label', null, label, help ? infoBtn(help, label) : null) : null,
        control,
        hint ? h('div', { class: hintCls }, hint) : null);
}

function numInput(obj, key, opts = {}) {
    return h('input', {
        type: 'number', value: obj[key], min: opts.min, max: opts.max, step: opts.step ?? 'any',
        style: opts.width ? `width:${opts.width}px` : null,
        placeholder: opts.placeholder,
        oninput: e => { obj[key] = e.target.value === '' ? '' : +e.target.value; (opts.ch || changed)(); }
    });
}

function textInput(obj, key, opts = {}) {
    return h('input', {
        type: 'text', value: obj[key] ?? '', placeholder: opts.placeholder, list: opts.list, spellcheck: 'false',
        style: opts.style,
        oninput: e => { obj[key] = opts.transform ? opts.transform(e.target.value) : e.target.value; (opts.ch || changed)(); }
    });
}

function selectInput(obj, key, options, opts = {}) {
    return h('select', {
        value: obj[key] ?? '', style: opts.style,
        onchange: e => { obj[key] = e.target.value; (opts.ch || changed)(); if (opts.after) opts.after(); }
    }, options.map(([v, l]) => h('option', { value: v }, l)));
}

function checkInput(obj, key, label, opts = {}) {
    const box = h('label', { class: 'check', title: opts.title }, h('input', {
        type: 'checkbox', checked: !!obj[key],
        onchange: e => { obj[key] = e.target.checked; (opts.ch || changed)(); if (opts.after) opts.after(); }
    }), label);
    return opts.help ? h('span', { class: 'check-wrap' }, box, infoBtn(opts.help, typeof label === 'string' ? label : null)) : box;
}

function rangeInput(obj, opts = {}) {
    return h('div', { class: 'range-input' },
        numInput(obj, 'min', { ...opts, width: opts.width || 76 }),
        h('span', null, 'bis'),
        numInput(obj, 'max', { ...opts, width: opts.width || 76 }),
        opts.suffix ? h('span', null, opts.suffix) : null);
}

function seg(obj, key, options, opts = {}) {
    const wrap = h('div', { class: 'seg' });
    const draw = () => wrap.replaceChildren(...options.map(([v, l]) => h('button', {
        type: 'button', class: obj[key] === v ? 'on' : '',
        onclick: () => { obj[key] = v; draw(); (opts.ch || changed)(); if (opts.after) opts.after(); }
    }, l)));
    draw();
    return wrap;
}

function colorInput(obj, key, ch) {
    const isCustom = v => typeof v === 'string' && v.startsWith('#');
    const picker = h('input', {
        type: 'color', value: isCustom(obj[key]) ? obj[key] : '#ff8800',
        style: 'width:42px;height:34px;padding:2px;border-radius:6px;border:1px solid var(--line);background:var(--bg-2)',
        oninput: e => { obj[key] = e.target.value; ch(); }
    });
    const sel = h('select', {
        value: isCustom(obj[key]) ? '#custom' : (obj[key] || ''),
        style: 'width:auto;min-width:130px',
        onchange: e => {
            obj[key] = e.target.value === '#custom' ? picker.value : e.target.value;
            picker.hidden = e.target.value !== '#custom';
            ch();
        }
    }, COLORS.map(([v, l, hex]) => h('option', { value: v, style: hex ? `color:${hex}` : null }, l)),
        h('option', { value: '#custom' }, 'Eigene Farbe…'));
    picker.hidden = !isCustom(obj[key]);
    return h('div', { class: 'row' }, sel, picker);
}

// Liste von IDs mit Datalist-Vorschlägen (Biome, Strukturen …)
function chipList(list, options, opts = {}) {
    const listId = 'dl-' + uid();
    const wrap = h('div', { style: 'display:flex;flex-direction:column;gap:6px;min-width:260px;flex:1' });
    const chips = h('div', { class: 'chips' });
    const input = h('input', { type: 'text', list: listId, placeholder: opts.placeholder || 'Suchen oder ID eingeben…', spellcheck: 'false' });
    const dl = h('datalist', { id: listId }, [...options].map(([id, label]) => h('option', { value: id }, label)));
    const add = () => {
        let v = input.value.trim().toLowerCase();
        if (!v) return;
        // Eingabe eines Anzeigenamens erlauben
        for (const [id, label] of options) if (label.toLowerCase() === v) { v = id; break; }
        v = stripKeepTag(v);
        if (!list.includes(v)) list.push(v);
        input.value = '';
        draw();
        (opts.ch || changed)();
    };
    input.addEventListener('change', add);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    const draw = () => chips.replaceChildren(...list.map((v, i) => h('span', { class: 'chip' },
        opts.icons ? (v.startsWith('#') ? (ITEM_TAGS.get(v.slice(1)) ? icon(ITEM_TAGS.get(v.slice(1))) : specialIcon('#')) : icon(v)) : null,
        options.get(v) || v,
        h('button', { type: 'button', title: 'Entfernen', onclick: () => { list.splice(i, 1); draw(); (opts.ch || changed)(); } }, '×'))),
        ...(list.length ? [] : [h('span', { class: 'muted', style: 'font-size:12px' }, opts.emptyText || 'Noch nichts ausgewählt')]));
    draw();
    wrap.append(chips, h('div', { class: 'row' }, input, opts.extraButton || null), dl);
    return wrap;
}

/* =====================================================================
 * Modal-Fenster
 * ===================================================================== */
function openModal({ title, iconEl, wide, body, foot, onClose }) {
    const root = $('#modal-root');
    const bodyEl = h('div', { class: 'modal-body' });
    const titleEl = h('h3', null, iconEl || null, title);
    const back = h('div', { class: 'modal-backdrop' });
    const close = () => {
        back.remove();
        document.removeEventListener('keydown', onKey);
        if (onClose) onClose();
    };
    const onKey = e => { if (e.key === 'Escape' && root.lastElementChild === back) close(); };
    document.addEventListener('keydown', onKey);
    back.addEventListener('mousedown', e => { if (e.target === back) close(); });
    const modal = h('div', { class: 'modal' + (wide ? ' wide' : '') },
        h('div', { class: 'modal-head' }, titleEl, h('button', { class: 'icon-btn', title: 'Schließen (Esc)', onclick: close }, '✕')),
        bodyEl,
        foot ? h('div', { class: 'modal-foot' }, foot) : null);
    back.append(modal);
    root.append(back);
    if (body) bodyEl.append(body);
    return { close, body: bodyEl, titleEl };
}

/* =====================================================================
 * Bedingungen (Umgebungsparameter)
 * ===================================================================== */
const SCORE_ENTITIES = [['this', 'Dieses Entity (Mob / öffnender Spieler / Angler)'], ['attacking_player', 'Spieler, der den Mob getötet hat'], ['attacker', 'Angreifer (auch Mobs)']];

const COND_DEFS = [
    { type: 'random_chance', group: 'Zufall', label: 'Zufallschance', ctx: null, def: () => ({ chance: 50 }),
      render: (p, ch) => [field('Chance', h('div', { class: 'range-input' }, numInput(p, 'chance', { min: 0, max: 100, width: 90, ch }), h('span', null, '%')))],
      sum: p => `${p.chance} %` },
    { type: 'random_looting', group: 'Zufall', label: 'Zufallschance + Plünderung-Bonus', ctx: 'attacker', def: () => ({ base: 5, per: 1 }),
      render: (p, ch) => [
          field('Ohne Plünderung', h('div', { class: 'range-input' }, numInput(p, 'base', { min: 0, max: 100, width: 80, ch }), h('span', null, '%'))),
          field('+ pro Plünderung-Stufe', h('div', { class: 'range-input' }, numInput(p, 'per', { min: 0, max: 100, width: 80, ch }), h('span', null, '%')))
      ],
      sum: p => `${p.base} % (+${p.per} %/Stufe)` },

    { type: 'weather', group: 'Welt & Umgebung', label: 'Wetter', ctx: null, def: () => ({ mode: 'rain' }),
      render: (p, ch) => [seg(p, 'mode', [['clear', 'Klar'], ['rain', 'Regen (ohne Gewitter)'], ['thunder', 'Gewitter'], ['any_rain', 'Regen oder Gewitter']], { ch })],
      sum: p => ({ clear: 'Klar', rain: 'Regen', thunder: 'Gewitter', any_rain: 'Regen/Gewitter' })[p.mode] },
    { type: 'time', group: 'Welt & Umgebung', label: 'Tageszeit', ctx: null, def: () => ({ preset: 'night', min: 13000, max: 23000 }),
      render: (p, ch, redraw) => [
          seg(p, 'preset', [['day', 'Tag'], ['night', 'Nacht'], ['custom', 'Eigene Zeit']], { ch, after: redraw }),
          p.preset === 'custom' ? field('Ticks (0–24000)', rangeInput(p, { min: 0, max: 24000, step: 100, ch }),
              '0 = 6:00 Uhr · 6000 = Mittag · 12000 = 18:00 · 18000 = Mitternacht') : null
      ],
      sum: p => p.preset === 'day' ? 'Tag' : p.preset === 'night' ? 'Nacht' : `${p.min}–${p.max}` },
    { type: 'biome', group: 'Welt & Umgebung', label: 'Biom', ctx: 'origin', def: () => ({ list: [] }),
      render: (p, ch) => [chipList(p.list, new Map(inVersion('biomes', BIOMES)), { ch, placeholder: 'Biom suchen (z. B. Wüste) …' })],
      sum: p => p.list.map(b => BIOMES.get(b) || b).join(', ') },
    { type: 'dimension', group: 'Welt & Umgebung', label: 'Dimension', ctx: 'origin', def: () => ({ dim: 'the_nether' }),
      render: (p, ch) => [field('Dimension', h('div', { class: 'row' },
          selectInput(p, 'dim', [['overworld', 'Oberwelt'], ['the_nether', 'Nether'], ['the_end', 'Ende']], { ch, style: 'width:auto' })))],
      sum: p => ({ overworld: 'Oberwelt', the_nether: 'Nether', the_end: 'Ende' })[p.dim] || p.dim },
    { type: 'structure', group: 'Welt & Umgebung', label: 'Innerhalb einer Struktur', ctx: 'origin', def: () => ({ list: [] }),
      render: (p, ch) => [chipList(p.list, new Map(inVersion('structures', STRUCTURES)), { ch, placeholder: 'Struktur suchen (z. B. stronghold) …' })],
      sum: p => p.list.join(', ') },
    { type: 'height', group: 'Welt & Umgebung', label: 'Höhe (Y-Koordinate)', ctx: 'origin', def: () => ({ min: -64, max: 0 }),
      render: (p, ch) => [field('Y von … bis', rangeInput(p, { ch }), 'Leer lassen = keine Grenze')],
      sum: p => `Y ${p.min === '' ? '…' : p.min} bis ${p.max === '' ? '…' : p.max}` },
    { type: 'sky', group: 'Welt & Umgebung', label: 'Freier Himmel sichtbar', ctx: 'origin', def: () => ({}), render: () => [], sum: () => '' },
    { type: 'light', group: 'Welt & Umgebung', label: 'Lichtlevel', ctx: 'origin', def: () => ({ min: 0, max: 7 }),
      render: (p, ch) => [field('Licht von … bis (0–15)', rangeInput(p, { min: 0, max: 15, step: 1, ch }))],
      sum: p => `${p.min}–${p.max}` },

    { type: 'killed_by_player', group: 'Mob', label: 'Von einem Spieler getötet', ctx: 'player_kill', def: () => ({}), render: () => [], sum: () => '' },
    { type: 'on_fire', group: 'Mob', label: 'Mob brennt', ctx: 'mob', def: () => ({}), render: () => [], sum: () => '' },
    { type: 'is_baby', group: 'Mob', label: 'Mob ist ein Baby', ctx: 'mob', def: () => ({}), render: () => [], sum: () => '' },
    { type: 'killer_type', group: 'Mob', label: 'Getötet von Mob-Typ', ctx: 'attacker', def: () => ({ entity: 'wolf' }),
      render: (p, ch) => [field('Angreifer ist', selectInput(p, 'entity', inVersion('entities', ENTITIES).sort((a, b) => a[1].localeCompare(b[1], 'de')), { ch, style: 'width:auto;min-width:220px' }))],
      sum: p => ENTITIES.get(p.entity) || p.entity },

    { type: 'silk_touch', group: 'Werkzeug', label: 'Werkzeug hat Behutsamkeit', ctx: 'tool', def: () => ({}), render: () => [], sum: () => '' },
    { type: 'tool_enchant', group: 'Werkzeug', label: 'Werkzeug hat Verzauberung', ctx: 'tool', def: () => ({ ench: 'fortune', min: 1 }),
      render: (p, ch) => [
          field('Verzauberung', selectInput(p, 'ench', inVersion('enchantments', ENCH_LIST.map(e => [e.id, e.de])), { ch, style: 'width:auto;min-width:200px' })),
          field('ab Stufe', numInput(p, 'min', { min: 1, max: 255, step: 1, width: 80, ch }))
      ],
      sum: p => `${enchName(p.ench)} ≥ ${roman(num(p.min, 1))}` },
    { type: 'shears', group: 'Werkzeug', label: 'Mit einer Schere', ctx: 'tool', def: () => ({}), render: () => [], sum: () => '' },
    { type: 'tool_item', group: 'Werkzeug', label: 'Bestimmtes Werkzeug / Item', ctx: 'tool', def: () => ({ list: [] }),
      render: (p, ch, redraw) => [chipList(p.list, new Map([...ITEMS.values()].map(i => [i.id, i.de])), {
          ch, icons: true, placeholder: 'Item-Name oder ID…',
          extraButton: h('button', { type: 'button', class: 'btn btn-small', onclick: () => openItemPicker({
              title: 'Werkzeug wählen', onPick: id => { if (!p.list.includes(id)) p.list.push(id); ch(); redraw(); }
          }) }, 'Auswählen…')
      })],
      sum: p => p.list.map(itemName).join(', ') },

    { type: 'survives_explosion', group: 'Block', label: 'Übersteht Explosion (zufällig)', ctx: 'explosion', def: () => ({}), render: () => [], sum: () => '' },
    { type: 'open_water', group: 'Angeln', label: 'In offenem Wasser geangelt', ctx: 'hook', def: () => ({}), render: () => [], sum: () => '' },

    { type: 'score', group: 'Server / Scoreboard', label: 'Scoreboard-Wert', ctx: 'this', def: () => ({ objective: '', entity: 'this', min: 1, max: '' }),
      render: (p, ch) => [
          field('Scoreboard-Ziel', textInput(p, 'objective', { ch, placeholder: 'z. B. level', style: 'width:160px' })),
          field('Von wem', selectInput(p, 'entity', SCORE_ENTITIES.filter(([v]) => v === 'this' || ctxOf().includes('attacker')), { ch, style: 'width:auto' })),
          field('Wert von … bis', rangeInput(p, { step: 1, ch }))
      ],
      sum: p => `${p.objective || '?'} ${p.min === '' ? '' : '≥ ' + p.min}${p.max === '' ? '' : ' ≤ ' + p.max}` }
];
const COND_BY_TYPE = new Map(COND_DEFS.map(d => [d.type, d]));

const CTX_LABEL = {
    origin: 'einen Ort', this: 'ein Entity', mob: 'einen Mob', attacker: 'einen Angreifer',
    player_kill: 'einen Mob-Tod', tool: 'ein Werkzeug', explosion: 'einen abgebauten Block', hook: 'einen Angelhaken'
};

function condAvailable(def) {
    return !def.ctx || ctxOf().includes(def.ctx);
}

// Editor für eine Bedingungsliste (Pool oder Eintrag)
function condEditor(owner, ch = changed) {
    const wrap = h('div', { class: 'conds' });
    const draw = () => {
        const list = owner.conditions;
        const cards = list.map((c, i) => {
            const def = COND_BY_TYPE.get(c.type);
            if (!def) return null;
            const ok = condAvailable(def);
            const body = h('div', { class: 'cond-body' });
            const redraw = () => body.replaceChildren(...def.render(c.p, ch, redraw).filter(Boolean));
            redraw();
            return h('div', { class: 'cond' + (c.invert ? ' inv' : '') + (ok ? '' : ' bad') },
                h('div', { class: 'cond-head' },
                    h('span', { class: 'title' }, c.invert ? 'NICHT: ' : '', def.label, COND_HELP[c.type] ? infoBtn(COND_HELP[c.type], def.label) : null),
                    h('span', { class: 'grp' }, def.group),
                    checkInput(c, 'invert', 'umkehren', { ch, after: draw, help: HELP.invert, title: 'Bedingung umkehren (trifft zu, wenn sie NICHT erfüllt ist)' }),
                    h('button', { class: 'icon-btn', title: 'Bedingung entfernen', onclick: () => { list.splice(i, 1); draw(); ch(); } }, '🗑')),
                body.childNodes.length ? body : null,
                ok ? null : h('div', { class: 'cond-warn' }, `⚠ Passt nicht zum Typ „${TYPE_BY_ID.get(T().type).label}“ – dort gibt es nicht ${CTX_LABEL[def.ctx]}. Wird trotzdem exportiert.`));
        });

        const groups = {};
        COND_DEFS.filter(condAvailable).forEach(d => (groups[d.group] ||= []).push(d));
        const sel = h('select', {
            onchange: e => {
                const def = COND_BY_TYPE.get(e.target.value);
                if (!def) return;
                list.push({ id: uid(), type: def.type, invert: false, p: def.def() });
                draw();
                ch();
            }
        }, h('option', { value: '' }, '+ Bedingung hinzufügen …'),
            Object.entries(groups).map(([g, defs]) => h('optgroup', { label: g }, defs.map(d => h('option', {
                value: d.type, title: (COND_HELP[d.type] || '').replace(/\*\*/g, '')
            }, d.label)))));

        // null-Werte herausfiltern – replaceChildren würde sie sonst als Text „null“ anzeigen
        wrap.replaceChildren(...[
            ...cards,
            list.length > 1 ? h('div', { class: 'row', style: 'gap:10px;flex-wrap:wrap' },
                h('span', { class: 'hint' }, 'Verknüpfung:'),
                seg(owner, 'condMode', [['all', 'Alle müssen zutreffen (UND)'], ['any', 'Mindestens eine (ODER)']], { ch }),
                infoBtn(HELP.condMode, 'UND / ODER')) : null,
            h('div', { class: 'cond-add' }, sel,
                list.length ? null : h('span', { class: 'hint explain-inline' }, 'Ohne Bedingungen gilt es immer. Wähle eine aus der Liste, z. B. Wetter oder Biom.'))
        ].filter(Boolean));
    };
    draw();
    return wrap;
}

function condSummary(c) {
    const def = COND_BY_TYPE.get(c.type);
    if (!def) return c.type;
    const s = def.sum(c.p);
    return (c.invert ? 'NICHT ' : '') + def.label + (s ? ': ' + s : '');
}

/* =====================================================================
 * Einstellungen (linke Spalte)
 * ===================================================================== */
function renderSettings() {
    const t = T();
    const el = $('#settings');
    const typeDef = TYPE_BY_ID.get(t.type);
    const validNs = /^[a-z0-9_.-]+$/.test(t.namespace);
    const validPath = /^[a-z0-9_./-]+$/.test(t.path) && !t.path.startsWith('/') && !t.path.endsWith('/');
    const id = `${t.namespace}:${t.path}`;

    const vanillaList = 'dl-vanilla';
    const vanillaInput = h('input', { type: 'text', list: vanillaList, placeholder: 'z. B. chests/simple_dungeon', spellcheck: 'false' });

    el.replaceChildren(
        h('h2', null, h('span', { class: 'step-no' }, '1'), 'Loot-Table'),
        explain('Leg zuerst fest, wofür die Loot-Table gedacht ist und wie die Datei heißen soll.'),
        h('div', { class: 'field-label', style: 'margin-bottom:6px' }, 'Wofür ist die Loot-Table?', infoBtn(HELP.type, 'Typ der Loot-Table')),
        h('div', { class: 'type-grid' }, TABLE_TYPES.map(tt => h('button', {
            type: 'button', class: 'type-card' + (tt.id === t.type ? ' on' : ''), title: tt.desc,
            onclick: () => {
                const oldFolder = TYPE_BY_ID.get(t.type)?.folder;
                t.type = tt.id;
                // Pfad-Ordner mitziehen, wenn er noch dem Standard des alten Typs entspricht
                if (oldFolder && t.path.startsWith(oldFolder + '/') && tt.folder) t.path = tt.folder + t.path.slice(oldFolder.length);
                renderSettings();
                refresh();
            }
        }, icon(tt.icon, { eager: true }), tt.label))),
        h('div', { class: 'hint explain-inline', style: 'margin:-6px 0 14px' }, typeDef.desc),

        field('Namespace', textInput(t, 'namespace', {
            placeholder: 'meinserver',
            transform: v => v.toLowerCase().replace(/\s+/g, '_'),
            ch: () => { changed(); updatePathBox(); }
        }), validNs ? 'Name deines Datapacks bzw. Servers, nur a–z, 0–9, _ . -' : h('span', { style: 'color:var(--danger)' }, 'Nur Kleinbuchstaben, Zahlen und _ . - erlaubt'), HELP.namespace),
        field('Pfad / Dateiname', textInput(t, 'path', {
            placeholder: typeDef.folder ? typeDef.folder + '/meine_tabelle' : 'meine_tabelle',
            transform: v => v.toLowerCase().replace(/\s+/g, '_'),
            ch: () => { changed(); updatePathBox(); renderPoolsSoon(); }
        }), validPath ? 'Unterordner mit / trennen, ohne .json' : h('span', { style: 'color:var(--danger)' }, 'Ungültiger Pfad (nur a–z, 0–9, _ . - /)'), HELP.path),
        h('div', { class: 'field-label', style: 'margin-bottom:5px' }, 'Speicherort im Datapack', infoBtn(HELP.pathBox, 'Speicherort')),
        h('div', { id: 'path-box' }),
        h('div', { style: 'margin-top:10px' }, checkInput(t, 'randomSequence', 'Eigene Zufallssequenz (random_sequence)', {
            title: 'Empfohlen: sorgt dafür, dass die Loot-Table ihre eigene, reproduzierbare Zufallsfolge nutzt.', help: HELP.randomSequence
        })),

        h('details', { class: 'box' },
            h('summary', null, 'Vanilla-Loot-Table bearbeiten / ersetzen', infoBtn(HELP.vanilla, 'Vanilla-Vorlagen')),
            h('div', { class: 'hint explain-inline', style: 'margin-bottom:8px' },
                'Lädt eine originale Loot-Table aus ' + versionLabel() + ' als Vorlage. Mit Namespace „minecraft“ und gleichem Pfad ersetzt dein Datapack das Original.'),
            h('div', { class: 'row' }, vanillaInput, h('button', {
                class: 'btn btn-small', onclick: () => loadVanilla(vanillaInput.value)
            }, 'Laden')),
            h('datalist', { id: vanillaList }, [...VANILLA_TABLES.keys()].filter(k => availIn('lootTables', k)).map(k => h('option', { value: k })))),

        h('details', { class: 'box', open: true },
            h('summary', null, 'So benutzt du die Datei', infoBtn(HELP.usage, 'Datapack & Befehle')),
            usageBlock(id))
    );
    updatePathBox();
}

function updatePathBox() {
    const t = T();
    const box = $('#path-box');
    if (!box) return;
    const p = `data/<b>${esc(t.namespace || '?')}</b>/loot_table/<b>${esc(t.path || '?')}</b>.json`;
    box.innerHTML = `<div class="path-box">${p}</div>`;
    const out = $('#out-path');
    out.innerHTML = `<div class="path-box">📁 ${p}</div>`;
}

function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function usageBlock(id) {
    const t = T();
    const cmds = [];
    if (t.type === 'display') {
        cmds.push(['Regal füllen (Koordinaten des Regals statt ~ ~ ~)', `/loot replace block ~ ~ ~ container.0 3 loot ${id}`]);
        cmds.push(['Nächsten Item-Rahmen füllen', `/loot replace entity @e[type=item_frame,distance=..4,sort=nearest,limit=1] contents loot ${id}`]);
        cmds.push(['Nächsten leuchtenden Item-Rahmen füllen', `/loot replace entity @e[type=glow_item_frame,distance=..4,sort=nearest,limit=1] contents loot ${id}`]);
        cmds.push(['Deko-Topf setzen (füllt sich selbst beim Zerbrechen)', `/setblock ~ ~ ~ decorated_pot{LootTable:"${id}"}`]);
        cmds.push(['Viele Regale: einmalig einen Marker ins Regal setzen …', `/summon marker ~ ~ ~ {Tags:["loot_regal"]}`]);
        cmds.push(['… dann alle markierten Regale auf einmal (neu) füllen', `/execute at @e[type=marker,tag=loot_regal] run loot replace block ~ ~ ~ container.0 3 loot ${id}`]);
        cmds.push(['Viele Rahmen: nächsten Rahmen markieren …', `/tag @e[type=item_frame,distance=..4,sort=nearest,limit=1] add loot_rahmen`]);
        cmds.push(['… dann alle markierten Rahmen (neu) füllen', `/execute as @e[type=item_frame,tag=loot_rahmen] run loot replace entity @s contents loot ${id}`]);
    }
    if (t.type === 'chest') {
        cmds.push(['Truhe mit dieser Beute setzen', `/setblock ~ ~ ~ chest{LootTable:"${id}"}`]);
    }
    if (t.type === 'entity') {
        cmds.push(['Mob mit diesen Drops spawnen', `/summon zombie ~ ~ ~ {DeathLootTable:"${id}"}`]);
    }
    cmds.push(['Beute direkt ins Inventar', `/loot give @s loot ${id}`]);
    cmds.push(['Beute auf den Boden werfen', `/loot spawn ~ ~ ~ loot ${id}`]);
    const mcmeta = packMcmeta('Meine Loot Tables');
    return h('div', null,
        h('ol', { class: 'hint', style: 'padding-left:18px;margin:0 0 10px' },
            h('li', null, 'Datapack-Ordner anlegen: ', h('span', { class: 'mono' }, 'world/datapacks/MeinPack/')),
            h('li', null, 'Darin eine ', h('span', { class: 'mono' }, 'pack.mcmeta'), ' (siehe unten)'),
            h('li', null, 'Die JSON unter dem angezeigten Pfad ablegen'),
            h('li', null, 'Im Spiel ', h('span', { class: 'mono' }, '/reload'), ' ausführen')),
        h('div', { class: 'cmd-list' }, cmds.map(([label, c]) => h('div', null,
            h('div', { class: 'hint', style: 'margin-bottom:3px' }, label),
            h('div', { class: 'cmd' }, h('code', null, c), h('button', { class: 'icon-btn', title: 'Kopieren', onclick: () => copyText(c) }, '⧉'))))),
        h('div', { class: 'hint', style: 'margin:10px 0 3px' }, 'pack.mcmeta für ' + versionLabel()),
        h('div', { class: 'cmd' }, h('code', { style: 'white-space:pre' }, mcmeta), h('button', { class: 'icon-btn', title: 'Kopieren', onclick: () => copyText(mcmeta) }, '⧉')));
}

/* =====================================================================
 * Pools (Mitte)
 * ===================================================================== */
function totalWeight(pool) {
    return pool.entries.reduce((s, e) => s + Math.max(1, Math.round(num(e.weight, 1))), 0);
}

function countLabel(e) {
    if (e.kind !== 'item' && e.kind !== 'tag') return '';
    const a = num(e.count.min, 1), b = num(e.count.max, a);
    if (a === b) return a === 1 ? '' : String(a);
    return `${Math.min(a, b)}-${Math.max(a, b)}`;
}

function entryTitle(e) {
    if (e.kind === 'item') return e.customName.text || itemName(e.name);
    if (e.kind === 'tag') return '#' + strip(e.name);
    if (e.kind === 'loot_table') return 'Loot-Table ' + e.name;
    return 'Nichts (leerer Eintrag)';
}

function isEnchanted(e) {
    if (e.glint === 'on') return true;
    if (e.glint === 'off') return false;
    return e.ench.mode !== 'none' || e.name === 'enchanted_book' || e.name === 'enchanted_golden_apple';
}

/* ---------- Ansicht je Loot-Table-Typ ---------- */
// cls: Darstellung der Einträge · tex: Hintergrund-Textur · anim: Items schweben (liegen auf dem Boden)
const THEMES = {
    chest: { cls: 'chest', banner: 'oak_planks' },
    display: { cls: 'shelf', tex: 'dark_oak_planks', banner: 'dark_oak_planks' },
    entity: { cls: 'ground', tex: 'coarse_dirt', banner: 'moss_block', anim: true },
    block: { cls: 'ground', tex: 'stone', banner: 'stone', anim: true },
    fishing: { cls: 'water', banner: null, anim: true },
    archaeology: { cls: 'ground', tex: 'suspicious_sand_0', banner: 'suspicious_sand_0', anim: true },
    gift: { cls: 'ground', tex: 'birch_planks', banner: 'birch_planks', anim: true },
    barter: { cls: 'ground', tex: 'netherrack', banner: 'netherrack', anim: true },
    shearing: { cls: 'ground', tex: 'moss_block', banner: 'white_wool', anim: true },
    equipment: { cls: 'armor', tex: 'smooth_stone', banner: 'smooth_stone' },
    generic: { cls: 'ground', tex: 'deepslate_tiles', banner: 'deepslate_tiles', anim: true }
};
const texUrl = tex => `${ASSETS}/textures/${tex.includes('/') ? tex : 'block/' + tex}.png`;
function texStyle(tex, dark = 0.55) {
    if (!tex) return null;
    return `background-image:linear-gradient(rgba(12,14,18,${dark}),rgba(12,14,18,${dark + 0.12})),url('${texUrl(tex)}');`;
}

// Worum geht es gerade? Leitet Mob bzw. Block aus dem Pfad ab (z. B. entities/zombie → Zombie)
function sceneInfo() {
    const t = T();
    const last = strip(t.path.split('/').pop() || '');
    const th = THEMES[t.type] || THEMES.generic;
    switch (t.type) {
        case 'entity': {
            const mob = ENTITIES.has(last) ? last : null;
            const egg = mob && ITEMS.has(mob + '_spawn_egg') ? mob + '_spawn_egg' : null;
            return { ...th, icon: egg || 'zombie_head', title: mob ? `Drops von ${ENTITIES.get(mob)}` : 'Mob-Drops',
                sub: 'Diese Items lässt der Mob beim Tod fallen.' + (mob ? '' : ' Tipp: Heißt der Pfad z. B. „entities/zombie“, erscheint hier der passende Mob.'),
                when: 'Tod des Mobs' };
        }
        case 'block': {
            const info = ITEMS.get(last);
            const b = info?.block ? last : null;
            const tex = b ? (info.tex && info.tex.startsWith('block/') ? info.tex : 'block/' + b) : th.tex;
            return { ...th, tex, banner: tex, icon: b || 'diamond_pickaxe', title: b ? `Abbau-Drops: ${info.de}` : 'Block-Drops',
                sub: 'Das droppt der Block beim Abbauen.' + (b ? '' : ' Tipp: Heißt der Pfad z. B. „blocks/diamond_ore“, erscheint hier der passende Block.'),
                when: 'Abbauen / Explosion' };
        }
        case 'chest': return { ...th, icon: 'chest', title: 'Truhen-Inhalt', sub: 'So kann die Truhe beim ersten Öffnen gefüllt sein.', when: 'Erstes Öffnen' };
        case 'display': return { ...th, icon: 'oak_shelf', title: 'Regal, Item-Rahmen & Deko-Topf',
            sub: 'Ein Regal hat 3 Plätze, ein Item-Rahmen zeigt nur das erste Item. Befüllt wird per Befehl (siehe links).', when: '/loot-Befehl' };
        case 'fishing': return { ...th, icon: 'fishing_rod', title: 'Angel-Beute', sub: 'Das kann man hier aus dem Wasser ziehen.', when: 'Einholen der Angel' };
        case 'archaeology': return { ...th, icon: 'brush', title: 'Archäologie-Fund', sub: 'Das steckt im verdächtigen Sand oder Kies.', when: 'Abpinseln' };
        case 'gift': return { ...th, icon: 'rabbit_foot', title: 'Geschenk', sub: 'Das bringen Katzen oder Dorfbewohner als Geschenk.', when: 'Morgengeschenk' };
        case 'barter': return { ...th, icon: 'gold_ingot', title: 'Piglin-Tauschhandel', sub: 'Das wirft ein Piglin für einen Goldbarren aus.', when: 'Gold übergeben' };
        case 'shearing': return { ...th, icon: 'shears', title: 'Scher-Ertrag', sub: 'Das fällt beim Scheren ab.', when: 'Scheren' };
        case 'equipment': return { ...th, icon: 'iron_chestplate', title: 'Mob-Ausrüstung', sub: 'Mit dieser Ausrüstung erscheint der Mob. Jedes Item landet im passenden Slot.', when: 'Spawn des Mobs' };
        default: return { ...th, icon: 'command_block', title: 'Generische Loot-Table', sub: 'Für /loot-Befehle und eigene Zwecke.', when: 'Befehl' };
    }
}

function renderScene() {
    const sc = sceneInfo();
    return h('div', { class: 'scene scene-' + sc.cls, style: sc.banner ? texStyle(sc.banner, 0.45) : null },
        h('div', { class: 'scene-icon' + (sc.anim ? ' bob' : '') }, icon(sc.icon, { eager: true, cls: 'big' })),
        h('div', { style: 'flex:1;min-width:0' },
            h('h2', null, sc.title, infoBtn(HELP.scene, 'Ansicht')),
            h('p', null, sc.sub)),
        h('div', { class: 'scene-meta' },
            T().type === 'entity' && typeof showView === 'function' ? h('button', {
                class: 'btn btn-small scene-link', title: 'Diese Loot-Table als Drops für den Mob im Mob-Generator verwenden',
                onclick: () => { mob.loot = { mode: 'current', value: '' }; saveMob(); showView('mob'); toast('Loot-Table ist jetzt mit deinem Mob verknüpft.'); }
            }, '🧟 Für Mob verwenden') : null,
            h('span', { class: 'badge' }, 'Auslöser: ' + sc.when),
            h('span', { class: 'badge' }, 'minecraft:' + ({ display: 'chest' }[T().type] || T().type))));
}

function renderPools() {
    const wrap = $('#pools');
    const t = T();
    wrap.replaceChildren(renderScene(),
        explain(h('span', { class: 'step-no' }, '2'),
            h('span', null, h('b', null, 'Beute bauen: '), 'Jeder Pool ist ein Lostopf, aus dem pro Wurf ein Eintrag gezogen wird. Klicke auf ', h('b', null, '+'),
                ', um Items hineinzulegen, und auf ein Item, um es einzustellen. ',
                h('button', { class: 'link-btn', onclick: () => openGuide(1) }, 'Wie funktioniert das genau?'))),
        ...t.pools.map((pool, pi) => renderPool(pool, pi)));
    if (!t.pools.length) wrap.append(h('div', { class: 'panel empty-note' }, 'Noch kein Pool. Ein Pool ist eine „Ziehung“: aus seinen Einträgen wird pro Wurf einer zufällig (nach Gewicht) ausgewählt.'));
}

function renderPool(pool, pi) {
    const t = T();
    const tw = totalWeight(pool);
    const rMin = num(pool.rolls.min, 1), rMax = num(pool.rolls.max, rMin);

    const slots = pool.entries.map((e, ei) => {
        const w = Math.max(1, Math.round(num(e.weight, 1)));
        const chance = tw ? (w / tw) * 100 : 0;
        const marks = [];
        if (e.ench.mode !== 'none') marks.push(h('span', { class: 'mark ench', title: 'verzaubert' }));
        if (e.customName.text || e.lore.some(l => l.text)) marks.push(h('span', { class: 'mark name', title: 'eigener Name / Lore' }));
        if (e.conditions.length) marks.push(h('span', { class: 'mark cond', title: 'hat Bedingungen' }));
        const cnt = countLabel(e);
        return h('div', { class: 'slot-wrap' },
            h('button', {
                class: 'slot' + (isEnchanted(e) ? ' glint' : ''),
                title: `${entryTitle(e)}\nGewicht ${w} → ${fmtPct(chance)} pro Wurf\nKlicken zum Bearbeiten`,
                onclick: () => openEntryEditor(pool, e)
            }, entryIcon(e), marks.length ? h('span', { class: 'marks' }, marks) : null, cnt ? h('span', { class: 'count' }, cnt) : null),
            h('div', { class: 'slot-chance' }, fmtPct(chance)));
    });
    slots.push(h('div', { class: 'slot-wrap' },
        h('button', { class: 'slot add', title: 'Item hinzufügen', onclick: () => addItemsToPool(pool) }, '+'),
        h('div', { class: 'slot-chance' }, 'Item')));
    if (!pool.entries.length) slots.push(h('div', { class: 'inv-empty explain-inline' }, '← Noch leer. Klicke auf +, um das erste Item in diesen Lostopf zu legen.'));

    const poolCondCount = pool.conditions.length;
    return h('div', { class: 'pool' },
        h('div', { class: 'pool-head' },
            h('div', { class: 'pool-title' }, `Pool ${pi + 1}`, infoBtn(HELP.pool, 'Was ist ein Pool?'),
                h('span', { class: 'badge' }, `${pool.entries.length} Einträge`),
                h('span', { class: 'badge green' }, rMin === rMax ? `${rMin}× ziehen` : `${Math.min(rMin, rMax)}–${Math.max(rMin, rMax)}× ziehen`),
                poolCondCount ? h('span', { class: 'badge blue' }, `${poolCondCount} Bedingung${poolCondCount > 1 ? 'en' : ''}`) : null),
            h('span', { class: 'spacer' }),
            h('button', { class: 'icon-btn', title: 'Nach oben', disabled: pi === 0, onclick: () => { movePool(pi, -1); } }, '↑'),
            h('button', { class: 'icon-btn', title: 'Nach unten', disabled: pi === t.pools.length - 1, onclick: () => { movePool(pi, 1); } }, '↓'),
            h('button', { class: 'icon-btn', title: 'Pool duplizieren', onclick: () => {
                const c = clone(pool); c.id = uid(); c.entries.forEach(e => e.id = uid());
                t.pools.splice(pi + 1, 0, c); refresh();
            } }, '⧉'),
            h('button', { class: 'icon-btn', title: 'Pool löschen', onclick: () => {
                if (pool.entries.length && !confirm(`Pool ${pi + 1} mit ${pool.entries.length} Einträgen löschen?`)) return;
                t.pools.splice(pi, 1); refresh();
            } }, '🗑')),
        h('div', { class: 'pool-body' },
            h('div', { class: 'pool-rolls' },
                field('Würfe (wie oft gezogen wird)', rangeInput(pool.rolls, { min: 0, step: 1 }), null, HELP.rolls),
                field('Bonus-Würfe pro Glück-Punkt', numInput(pool, 'bonusRolls', { step: 0.1, width: 90 }), 'Meist 0. Wirkt mit „Glück“-Effekt.', HELP.bonusRolls)),
            h('div', { class: 'section-label' }, 'Einträge', infoBtn(HELP.entries, 'Einträge'), h('span', { class: 'hint explain-inline', style: 'text-transform:none;letter-spacing:0;font-weight:400' }, '% = Chance pro Wurf · Klick zum Bearbeiten')),
            inventoryView(slots),
            h('div', { class: 'pool-foot' },
                h('button', { class: 'btn btn-small', onclick: () => addItemsToPool(pool) }, '+ Item'),
                h('button', { class: 'btn btn-small', title: 'Ein Eintrag, der nichts droppt – senkt die Chance der anderen', onclick: () => {
                    const e = newEntry('empty'); pool.entries.push(e); refresh(); openEntryEditor(pool, e);
                } }, '+ Nichts'),
                h('button', { class: 'btn btn-small', title: 'Alle Items eines Item-Tags (z. B. alle Wollblöcke)', onclick: () => openTagPicker(tag => {
                    const e = newEntry('tag', tag); pool.entries.push(e); refresh(); openEntryEditor(pool, e);
                }) }, '+ Item-Tag'),
                h('button', { class: 'btn btn-small', title: 'Eine andere Loot-Table einbinden (z. B. Vanilla-Dungeon-Loot)', onclick: () => {
                    const e = newEntry('loot_table', 'minecraft:chests/simple_dungeon'); pool.entries.push(e); refresh(); openEntryEditor(pool, e);
                } }, '+ Andere Loot-Table'),
                infoBtn(HELP.addButtons, 'Was kann in einen Pool?')),
            h('details', { class: 'box', open: poolCondCount > 0 || undefined },
                h('summary', null, `Bedingungen für den ganzen Pool (${poolCondCount})`, infoBtn(HELP.poolConds, 'Pool-Bedingungen')),
                h('div', { class: 'hint explain-inline', style: 'margin-bottom:8px' }, 'Nur wenn diese zutreffen, wird überhaupt aus diesem Pool gezogen – z. B. „nur in der Nacht“ oder „nur im Nether“.'),
                condEditor(pool)))
    );
}

function inventoryView(slots) {
    const th = sceneInfo();
    const el = h('div', { class: 'inventory theme-' + th.cls, style: texStyle(th.tex) });
    if (th.cls === 'shelf') {
        // je 3 Einträge ein Regalbrett
        for (let i = 0; i < slots.length; i += 3) el.append(h('div', { class: 'shelf-row' }, slots.slice(i, i + 3)));
    } else {
        el.append(...slots);
    }
    return el;
}

function movePool(i, d) {
    const p = T().pools;
    const [x] = p.splice(i, 1);
    p.splice(i + d, 0, x);
    refresh();
}

function addItemsToPool(pool) {
    openItemPicker({
        title: 'Item hinzufügen',
        multi: true,
        onPick: id => {
            const e = newEntry('item', id);
            pool.entries.push(e);
            renderPoolsSoon();
            changed();
            toast(`${itemName(id)} hinzugefügt`);
        }
    });
}

/* =====================================================================
 * Item-Auswahl
 * ===================================================================== */
const ALL_ITEMS = [...ITEMS.values()];
const PICKER_FILTERS = [
    ['all', 'Alle'], ['items', 'Items'], ['blocks', 'Blöcke'], ['gear', 'Werkzeug & Rüstung'], ['ench', 'Verzauberbar']
];
const ENCHANTABLE = new Set(D.enchantments.flatMap(e => e[4]));

// filter: optional (id) => boolean, z. B. nur Sättel oder nur Blöcke
function openItemPicker({ title, onPick, multi, filter }) {
    const st = { q: '', filter: 'all', keep: !!multi };
    const grid = h('div', { class: 'picker-grid' });
    const input = h('input', { type: 'text', placeholder: 'Suchen… (deutsch, englisch oder ID)', spellcheck: 'false' });
    let modal;

    const pick = id => {
        rememberItem(id);
        onPick(id);
        if (!st.keep) modal.close();
    };

    const draw = () => {
        const q = st.q.trim().toLowerCase();
        let list = ALL_ITEMS.filter(i => availIn('items', i.id) && (!filter || filter(i.id)));
        if (st.filter === 'items') list = list.filter(i => !i.block);
        if (st.filter === 'blocks') list = list.filter(i => i.block);
        if (st.filter === 'gear') list = list.filter(i => i.maxDamage > 0);
        if (st.filter === 'ench') list = list.filter(i => ENCHANTABLE.has(i.id));
        if (q) {
            const scored = [];
            for (const i of list) {
                const de = i.de.toLowerCase(), en = i.en.toLowerCase();
                let s = -1;
                if (i.id === q || de === q || en === q) s = 0;
                else if (de.startsWith(q) || en.startsWith(q) || i.id.startsWith(q)) s = 1;
                else if (de.includes(q) || en.includes(q) || i.id.includes(q.replace(/ /g, '_'))) s = 2;
                if (s >= 0) scored.push([s, i]);
            }
            scored.sort((a, b) => a[0] - b[0] || a[1].de.localeCompare(b[1].de, 'de'));
            list = scored.map(x => x[1]);
        } else {
            list = [...list].sort((a, b) => a.de.localeCompare(b.de, 'de'));
        }
        const cells = [];
        if (!q && st.filter === 'all' && !filter && recent.length) {
            cells.push(h('div', { class: 'section-label', style: 'grid-column:1/-1' }, 'Zuletzt verwendet'));
            recent.filter(id => ITEMS.has(id) && availIn('items', id) && (!filter || filter(id))).forEach(id => cells.push(pickCell(ITEMS.get(id), pick)));
            cells.push(h('div', { class: 'section-label', style: 'grid-column:1/-1;margin-top:8px' }, 'Alle Items'));
        }
        list.forEach(i => cells.push(pickCell(i, pick)));
        if (!list.length) cells.push(h('div', { class: 'picker-empty' }, 'Nichts gefunden.'));
        grid.replaceChildren(...cells);
        grid.scrollTop = 0;
    };

    input.addEventListener('input', debounce(() => { st.q = input.value; draw(); }, 120));
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            const first = grid.querySelector('.pick');
            if (first) first.click();
        }
    });

    const body = h('div', null,
        explain('Klicke ein Item an, um es hinzuzufügen. Suche auf Deutsch, Englisch oder per ID – Enter nimmt den ersten Treffer.', infoBtn(HELP.picker, 'Item-Auswahl')),
        h('div', { class: 'picker-top' }, input, seg(st, 'filter', PICKER_FILTERS, { ch: () => {}, after: draw })),
        multi ? h('div', { style: 'margin-bottom:10px' }, checkInput(st, 'keep', 'Fenster offen lassen, um mehrere Items hinzuzufügen', { ch: () => {} })) : null,
        grid);
    modal = openModal({ title, wide: true, body, iconEl: icon('bundle', { eager: true }) });
    draw();
    setTimeout(() => input.focus(), 30);
}

function pickCell(i, pick) {
    return h('button', {
        class: 'pick', title: `${i.de}\n${i.en}\nminecraft:${i.id}`, onclick: () => pick(i.id)
    }, icon(i.id), h('span', null, i.de), h('small', null, i.id));
}

function openTagPicker(onPick) {
    const grid = h('div', { class: 'picker-grid' });
    const input = h('input', { type: 'text', placeholder: 'Tag suchen… (z. B. wool, logs, swords)', spellcheck: 'false' });
    let modal;
    const draw = () => {
        const q = input.value.trim().toLowerCase().replace(/^#?(minecraft:)?/, '');
        const list = [...ITEM_TAGS].filter(([t]) => !q || t.includes(q));
        grid.replaceChildren(...list.map(([t, first]) => h('button', {
            class: 'pick', onclick: () => { modal.close(); onPick(t); }
        }, first ? icon(first) : specialIcon('#'), h('span', null, '#' + t))),
        ...(list.length ? [] : [h('div', { class: 'picker-empty' }, 'Kein Tag gefunden.')]));
    };
    input.addEventListener('input', debounce(draw, 100));
    modal = openModal({ title: 'Item-Tag wählen', wide: true, body: h('div', null,
        explain('Ein Item-Tag ist eine Gruppe von Items, z. B. #wool = alle Wollfarben.', infoBtn(HELP.tags, 'Item-Tags')),
        h('div', { class: 'picker-top' }, input), grid) });
    draw();
    setTimeout(() => input.focus(), 30);
}

/* =====================================================================
 * Eintrag-Editor
 * ===================================================================== */
const openSections = new Set(['count']);

function applicableEnchants(e, showAll) {
    const list = ENCH_LIST.filter(x => availIn('enchantments', x.id));
    if (showAll || e.kind !== 'item' || BOOKS.has(strip(e.name))) return list;
    const id = strip(e.name);
    return list.filter(x => x.items.has(id));
}

function openEntryEditor(pool, e) {
    const t = T();
    let modal;
    const ch = () => { changed(); renderPoolsSoon(); };
    const side = h('div', { class: 'editor-side' });
    const main = h('div');

    const section = (key, title, sub, content, help) => {
        const d = h('details', { class: 'esec', open: openSections.has(key) || undefined },
            h('summary', null, title, help ? infoBtn(help, title) : null, sub ? h('span', { class: 'sub' }, sub) : null),
            h('div', { class: 'esec-body' }, content));
        d.addEventListener('toggle', () => { d.open ? openSections.add(key) : openSections.delete(key); });
        return d;
    };

    function drawSide() {
        const tw = totalWeight(pool);
        const w = Math.max(1, Math.round(num(e.weight, 1)));
        const info = e.kind === 'item' ? itemInfo(e.name) : null;
        side.replaceChildren(
            h('div', { class: 'editor-item' }, entryIcon(e),
                h('div', { style: 'flex:1;min-width:0' },
                    h('div', { class: 'name' }, e.kind === 'item' ? itemName(e.name) : entryTitle(e)),
                    h('div', { class: 'id' }, e.kind === 'item' ? 'minecraft:' + strip(e.name) : e.kind)),
                e.kind === 'item' ? h('button', { class: 'btn btn-small', onclick: () => openItemPicker({
                    title: 'Item ändern', onPick: id => {
                        e.name = id;
                        const ni = itemInfo(id);
                        if (!POTION_ITEMS.has(id)) e.potion = '';
                        if (!ni?.maxDamage) e.damage.on = false;
                        ch(); drawAll();
                    }
                }) }, 'Ändern') : null),
            h('div', { class: 'field-label' }, 'Vorschau im Spiel', infoBtn(HELP.preview, 'Vorschau')),
            tooltipPreview(e, info),
            h('div', { class: 'panel', style: 'padding:12px' },
                h('div', { class: 'hint' }, 'Chance pro Wurf in diesem Pool', infoBtn(HELP.chanceBox, 'Chance pro Wurf')),
                h('div', { style: 'font-size:22px;font-weight:700;color:var(--accent)' }, fmtPct(tw ? w / tw * 100 : 0)),
                h('div', { class: 'hint' }, `Gewicht ${w} von insgesamt ${tw}`)),
            h('div', { class: 'row' },
                h('button', { class: 'btn btn-small grow', onclick: () => {
                    const c = clone(e); c.id = uid();
                    pool.entries.splice(pool.entries.indexOf(e) + 1, 0, c);
                    refresh(); modal.close(); toast('Eintrag dupliziert');
                } }, 'Duplizieren'),
                h('button', { class: 'btn btn-small btn-danger grow', onclick: () => {
                    pool.entries.splice(pool.entries.indexOf(e), 1);
                    refresh(); modal.close();
                } }, 'Löschen'))
        );
    }

    function drawMain() {
        const isItemish = e.kind === 'item' || e.kind === 'tag';
        const info = e.kind === 'item' ? itemInfo(e.name) : null;
        const typeId = t.type;
        const parts = [];

        // --- Menge & Gewicht
        parts.push(section('count', 'Menge & Gewicht', null, h('div', null,
            e.kind === 'loot_table' ? field('Loot-Table-ID', h('div', null,
                textInput(e, 'name', { ch, list: 'dl-vanilla-ids', placeholder: 'minecraft:chests/simple_dungeon' }),
                h('datalist', { id: 'dl-vanilla-ids' }, [...VANILLA_TABLES.keys()].filter(k => availIn('lootTables', k)).map(k => h('option', { value: 'minecraft:' + k })))),
                'Alle Drops dieser Tabelle werden als ein Eintrag behandelt. Eigene Tabellen: namespace:pfad', HELP.lootTableRef) : null,
            e.kind === 'tag' ? h('div', null,
                field('Item-Tag', h('div', { class: 'row' },
                    textInput(e, 'name', { ch, placeholder: 'minecraft:wool' }),
                    h('button', { class: 'btn btn-small', onclick: () => openTagPicker(tag => { e.name = tag; ch(); drawAll(); }) }, 'Auswählen…')), null, HELP.tags),
                h('div', { style: 'margin-bottom:12px' }, checkInput(e, 'expand', 'Nur ein zufälliges Item aus dem Tag (sonst: alle Items des Tags auf einmal)', { ch, help: HELP.expand }))) : null,
            h('div', { class: 'grid-2' },
                field('Gewicht', numInput(e, 'weight', { min: 1, step: 1, ch: () => { ch(); drawSide(); } }),
                    'Höher = häufiger. Chance = Gewicht ÷ Summe aller Gewichte im Pool.', HELP.weight),
                isItemish ? field('Anzahl', rangeInput(e.count, { min: 0, step: 1, ch: () => { ch(); drawSide(); } }),
                    info && info.maxStack < num(e.count.max, 1) ? `⚠ Maximal ${info.maxStack} pro Stapel – wird aufgeteilt.` : 'Zufällige Menge zwischen min und max', HELP.count) : null),
            h('details', { class: 'box' }, h('summary', null, 'Erweitert'),
                field('Qualität (quality)', numInput(e, 'quality', { step: 1, width: 100, ch }),
                    'Ändert das Gewicht je Glück-Punkt des Spielers: Gewicht + Qualität × Glück. Meist 0.', HELP.quality)))));

        // --- Verzauberungen
        if (isItemish) {
            const en = e.ench;
            const enchBody = h('div');
            const drawEnch = () => {
                const rows = [seg(en, 'mode', [['none', 'Keine'], ['fixed', 'Feste'], ['random', 'Zufällige'], ['levels', 'Wie Zaubertisch']], { ch, after: () => { drawEnch(); drawSide(); } })];
                if (en.mode === 'fixed') {
                    const opts = applicableEnchants(e, en.showAll);
                    const excl = {};
                    en.list.forEach(x => { const ex = ENCH.get(x.id)?.excl; if (ex) (excl[ex] ||= []).push(x.id); });
                    const conflicts = Object.values(excl).filter(v => v.length > 1);
                    rows.push(h('div', { style: 'margin-top:12px' },
                        en.list.map((x, i) => {
                            const max = ENCH.get(x.id)?.max || 1;
                            return h('div', { class: 'list-row' },
                                h('select', {
                                    value: x.id, onchange: ev => {
                                        x.id = ev.target.value;
                                        const m = ENCH.get(x.id)?.max || 1;
                                        x.min = m; x.max = m;
                                        ch(); drawEnch(); drawSide();
                                    }
                                }, (opts.some(o => o.id === x.id) ? opts : [ENCH.get(x.id), ...opts].filter(Boolean)).map(o => h('option', { value: o.id }, `${o.de}${o.curse ? ' (Fluch)' : ''}`))),
                                h('span', { class: 'hint' }, 'Stufe'),
                                rangeInput(x, { min: 1, max: 255, step: 1, width: 64, ch: () => { ch(); drawSide(); } }),
                                h('span', { class: 'hint' }, `max. normal ${roman(max)}`),
                                h('button', { class: 'icon-btn', title: 'Entfernen', onclick: () => { en.list.splice(i, 1); ch(); drawEnch(); drawSide(); } }, '🗑'));
                        }),
                        conflicts.length ? h('div', { class: 'cond-warn' }, '⚠ Diese Verzauberungen sind normalerweise nicht kombinierbar: ' +
                            conflicts.map(c => c.map(enchName).join(' + ')).join('; ') + '. Per Loot-Table geht es trotzdem.') : null,
                        h('div', { class: 'row', style: 'flex-wrap:wrap' },
                            h('button', { class: 'btn btn-small', onclick: () => {
                                const used = new Set(en.list.map(x => x.id));
                                const next = opts.find(o => !used.has(o.id)) || ENCH_LIST[0];
                                en.list.push({ id: next.id, min: next.max, max: next.max });
                                ch(); drawEnch(); drawSide();
                            } }, '+ Verzauberung'),
                            checkInput(en, 'showAll', 'Alle Verzauberungen zeigen (auch unpassende)', { ch: () => {}, after: drawEnch })),
                        h('div', { class: 'hint explain-inline', style: 'margin-top:6px' }, 'Tipp: Stufen über dem Maximum (z. B. Schärfe X) sind möglich. Auf ein Buch angewendet entsteht ein verzaubertes Buch.')));
                } else if (en.mode === 'random') {
                    rows.push(h('div', { style: 'margin-top:12px' },
                        h('div', { class: 'hint explain-inline', style: 'margin-bottom:8px' }, 'Eine zufällige Verzauberung mit zufälliger Stufe (wie in Dungeon-Truhen).'),
                        seg(en.random, 'source', [['tag', 'Aus Gruppe'], ['list', 'Aus eigener Liste']], { ch, after: drawEnch }),
                        h('div', { style: 'margin-top:10px' }, en.random.source === 'tag'
                            ? field('Gruppe', selectInput(en.random, 'tag', ENCH_TAGS, { ch }), null, HELP.enchGroup)
                            : h('div', { class: 'chips', style: 'max-height:220px;overflow:auto' },
                                applicableEnchants(e, true).map(x => h('label', { class: 'chip', style: 'padding-right:10px' },
                                    h('input', {
                                        type: 'checkbox', checked: en.random.ids.includes(x.id), style: 'accent-color:var(--accent)',
                                        onchange: ev => {
                                            const s = new Set(en.random.ids);
                                            ev.target.checked ? s.add(x.id) : s.delete(x.id);
                                            en.random.ids = [...s];
                                            ch(); drawSide();
                                        }
                                    }), x.de)))),
                        h('div', { style: 'margin-top:10px' }, checkInput(en.random, 'anyItem', 'Auch Verzauberungen erlauben, die nicht zum Item passen', { ch, help: HELP.anyItem }))));
                } else if (en.mode === 'levels') {
                    rows.push(h('div', { style: 'margin-top:12px' },
                        h('div', { class: 'hint explain-inline', style: 'margin-bottom:8px' }, 'Verzaubert wie am Zaubertisch mit der angegebenen Anzahl Erfahrungslevel (30 = beste Tisch-Verzauberung).'),
                        h('div', { class: 'grid-2' },
                            field('Level', rangeInput(en.levels, { min: 1, max: 255, step: 1, ch: () => { ch(); drawSide(); } }), null, HELP.enchLevels),
                            field('Mögliche Verzauberungen', selectInput(en.levels, 'tag', ENCH_TAGS, { ch }), null, HELP.enchGroup))));
                }
                enchBody.replaceChildren(...rows);
            };
            drawEnch();
            parts.push(section('ench', 'Verzauberungen', { none: '', fixed: 'feste', random: 'zufällig', levels: 'wie Zaubertisch' }[en.mode], enchBody, HELP.ench));

            // --- Name & Lore
            const loreBox = h('div');
            const drawLore = () => loreBox.replaceChildren(
                ...e.lore.map((l, i) => h('div', { class: 'list-row' },
                    h('input', { type: 'text', value: l.text, placeholder: `Zeile ${i + 1}`, style: 'flex:1;min-width:160px', oninput: ev => { l.text = ev.target.value; ch(); drawSide(); } }),
                    colorInput(l, 'color', () => { ch(); drawSide(); }),
                    checkInput(l, 'italic', 'kursiv', { ch: () => { ch(); drawSide(); } }),
                    h('button', { class: 'icon-btn', title: 'Zeile löschen', onclick: () => { e.lore.splice(i, 1); ch(); drawLore(); drawSide(); } }, '🗑'))),
                h('button', { class: 'btn btn-small', onclick: () => { e.lore.push({ text: '', color: 'gray', italic: false, bold: false }); drawLore(); } }, '+ Beschreibungszeile'));
            drawLore();
            parts.push(section('name', 'Name & Beschreibung', e.customName.text ? `„${e.customName.text}“` : null, h('div', null,
                field('Anzeigename', h('div', { class: 'list-row', style: 'margin:0' },
                    h('input', { type: 'text', value: e.customName.text, placeholder: info ? info.de : 'Eigener Name', style: 'flex:1;min-width:160px',
                        oninput: ev => { e.customName.text = ev.target.value; ch(); drawSide(); } }),
                    colorInput(e.customName, 'color', () => { ch(); drawSide(); }),
                    checkInput(e.customName, 'bold', 'fett', { ch: () => { ch(); drawSide(); } }),
                    checkInput(e.customName, 'italic', 'kursiv', { ch: () => { ch(); drawSide(); } })), null, HELP.name),
                h('div', { class: 'field-label', style: 'margin:4px 0 6px' }, 'Beschreibung (Lore)', infoBtn(HELP.lore, 'Lore')),
                loreBox)));

            // --- Haltbarkeit & Extras
            const showDamage = e.kind === 'tag' || (info && info.maxDamage > 0);
            const showPotion = e.kind === 'item' && POTION_ITEMS.has(strip(e.name));
            const extras = h('div', null,
                showPotion ? field('Trank-Effekt', selectInput(e, 'potion',
                    [['', '– kein Effekt (Wasserflasche) –'], ...inVersion('potions', POTIONS).sort((a, b) => a[1].localeCompare(b[1], 'de'))], { ch: () => { ch(); drawSide(); } }), null, HELP.potion) : null,
                showDamage ? h('div', { class: 'field' },
                    checkInput(e.damage, 'on', 'Beschädigt droppen', { ch: () => { ch(); drawSide(); }, after: drawMain, help: HELP.damage }),
                    e.damage.on ? h('div', { style: 'margin-top:6px' }, rangeInput(e.damage, { min: 0, max: 100, step: 1, suffix: '% Resthaltbarkeit', ch: () => { ch(); drawSide(); } }),
                        info ? h('div', { class: 'hint' }, `Max. Haltbarkeit: ${info.maxDamage}. 100 % = neu, 10 % = fast kaputt.`) : null) : null) : null,
                h('div', { class: 'grid-2' },
                    field('Namensfarbe / Seltenheit', selectInput(e, 'rarity', RARITIES, { ch: () => { ch(); drawSide(); } }), null, HELP.rarity),
                    field('Verzauberungs-Glanz', selectInput(e, 'glint', [['', 'Automatisch'], ['on', 'Immer glänzen'], ['off', 'Nie glänzen']], { ch: () => { ch(); drawSide(); } }), null, HELP.glint)),
                h('div', { class: 'field' }, checkInput(e, 'unbreakable', 'Unzerbrechlich', { ch: () => { ch(); drawSide(); }, help: HELP.unbreakable })),
                h('details', { class: 'box' }, h('summary', null, 'Custom Model Data (für Resource Packs)', infoBtn(HELP.cmd, 'Custom Model Data')),
                    h('div', { class: 'grid-2' },
                        field('Zahlen (floats)', textInput(e.cmd, 'floats', { ch, placeholder: 'z. B. 1001' }), 'Mehrere mit Komma trennen'),
                        field('Texte (strings)', textInput(e.cmd, 'strings', { ch, placeholder: 'z. B. rubin_schwert' }), 'Mehrere mit Komma trennen'))));
            parts.push(section('extra', 'Haltbarkeit & Extras', null, extras, 'Weitere Eigenschaften des Items: Trank-Effekt, Abnutzung, Namensfarbe, Glanz, Unzerbrechlichkeit und Custom Model Data für Resource Packs. Jede Option hat ihren eigenen „?“-Knopf.'));

            // --- Umgebungs-Boni
            const bonus = [];
            if (typeId === 'entity' || typeId === 'generic') {
                bonus.push(h('div', { class: 'field' },
                    checkInput(e.looting, 'on', 'Plünderung erhöht die Anzahl', { ch, after: drawMain, help: HELP.looting }),
                    e.looting.on ? h('div', { style: 'margin-top:6px' }, rangeInput(e.looting, { min: 0, step: 0.5, suffix: 'zusätzlich pro Stufe', ch })) : null));
                bonus.push(h('div', { class: 'field' }, checkInput(e, 'smelt', 'Gebraten droppen, wenn der Mob brennt (z. B. rohes → gebratenes Fleisch)', { ch, help: HELP.smelt })));
            }
            if (typeId === 'block' || typeId === 'generic') {
                bonus.push(h('div', { class: 'field' },
                    checkInput(e.fortune, 'on', 'Glück (Fortune) erhöht die Anzahl', { ch, after: drawMain, help: HELP.fortune }),
                    e.fortune.on ? h('div', { style: 'margin-top:6px' }, seg(e.fortune, 'formula', [['ore_drops', 'Wie Erze (Multiplikator)'], ['uniform_bonus_count', '+0 bis +Stufe']], { ch })) : null));
                bonus.push(h('div', { class: 'field' }, checkInput(e, 'explosionDecay', 'Bei Explosionen geht ein Teil verloren (wie Vanilla)', { ch, help: HELP.explosionDecay })));
            }
            if (bonus.length) parts.push(section('bonus', 'Verzauberungs- & Umgebungs-Boni', null, h('div', null, bonus),
                'Diese Optionen gibt es nur bei Mob- bzw. Block-Drops, weil nur dort eine Waffe oder ein Werkzeug im Spiel ist. Sie machen die Menge abhängig von Plünderung, Glück, Feuer oder Explosionen – genau wie bei Vanilla-Drops.'));
        }

        // --- Bedingungen
        parts.push(section('cond', 'Bedingungen für diesen Eintrag', e.conditions.length ? `${e.conditions.length} aktiv` : null, h('div', null,
            h('div', { class: 'hint explain-inline', style: 'margin-bottom:8px' }, 'Der Eintrag kann nur gezogen werden, wenn die Bedingungen zutreffen – z. B. „nur bei Regen“ oder „nur mit Behutsamkeit“.'),
            condEditor(e, () => { ch(); drawSide(); })), HELP.entryConds));

        main.replaceChildren(...parts);
    }

    function drawAll() {
        drawSide();
        drawMain();
        modal.titleEl.lastChild.textContent = entryTitle(e);
    }

    modal = openModal({
        title: entryTitle(e), wide: true,
        body: h('div', { class: 'editor' }, main, side),
        foot: h('button', { class: 'btn btn-primary', onclick: () => modal.close() }, 'Fertig'),
        onClose: refresh
    });
    drawSide();
    drawMain();
}

function mcColor(c, fallback) {
    if (!c) return fallback;
    return c.startsWith('#') ? c : (COLOR_HEX[c] || fallback);
}

function tooltipPreview(e, info) {
    const lines = [];
    const rarity = e.rarity ? ['common', 'uncommon', 'rare', 'epic'].indexOf(e.rarity) : (info ? info.rarity : 0);
    let rColor = RARITY_COLOR[Math.max(0, rarity)];
    // Verzauberte Items steigen eine Seltenheitsstufe auf (gewöhnlich/ungewöhnlich → selten, selten → episch)
    if (!e.rarity && e.ench.mode !== 'none') rColor = RARITY_COLOR[rarity < 2 ? 2 : 3];
    const nameText = e.customName.text || (e.kind === 'item' ? itemName(e.name) : entryTitle(e));
    lines.push(h('div', {
        style: `color:${e.customName.text ? mcColor(e.customName.color, '#FFFFFF') : rColor};` +
            `${e.customName.bold ? 'font-weight:700;' : ''}${e.customName.italic ? 'font-style:italic;' : ''}`
    }, nameText));
    if (e.potion) lines.push(h('div', { style: 'color:#5555FF' }, POTIONS.get(e.potion) || e.potion));
    const en = e.ench;
    if (en.mode === 'fixed') en.list.forEach(x => {
        const a = num(x.min, 1), b = num(x.max, a);
        const ench = ENCH.get(x.id);
        lines.push(h('div', { style: `color:${ench?.curse ? '#FF5555' : '#AAAAAA'}` },
            `${enchName(x.id)} ${ench?.max === 1 && a === 1 && b === 1 ? '' : (a === b ? roman(a) : roman(Math.min(a, b)) + '–' + roman(Math.max(a, b)))}`));
    });
    if (en.mode === 'random') lines.push(h('div', { class: 'dim' }, 'Zufällige Verzauberung'));
    if (en.mode === 'levels') lines.push(h('div', { class: 'dim' }, `Verzaubert (Level ${en.levels.min}–${en.levels.max})`));
    e.lore.filter(l => l.text).forEach(l => lines.push(h('div', {
        style: `color:${mcColor(l.color, '#AAAAAA')};${l.italic ? 'font-style:italic;' : ''}`
    }, l.text)));
    if (e.unbreakable) lines.push(h('div', { style: 'color:#5555FF' }, 'Unzerbrechlich'));
    if (e.damage.on && info?.maxDamage) {
        const a = Math.round(info.maxDamage * num(e.damage.min) / 100), b = Math.round(info.maxDamage * num(e.damage.max) / 100);
        lines.push(h('div', { style: 'color:#FFFFFF' }, `Haltbarkeit: ${a === b ? a : a + '–' + b} / ${info.maxDamage}`));
    }
    const cnt = countLabel(e);
    if (cnt) lines.push(h('div', { class: 'dim' }, `Anzahl: ${cnt}`));
    if (e.kind === 'item') lines.push(h('div', { class: 'muted' }, 'minecraft:' + strip(e.name)));
    if (e.conditions.length) {
        lines.push(h('div', { style: 'color:#55FFFF;margin-top:4px;font-size:11px' }, 'Nur wenn:'));
        e.conditions.forEach(c => lines.push(h('div', { style: 'color:#55FFFF;font-size:11px' }, '• ' + condSummary(c))));
    }
    return h('div', { class: 'mc-tooltip' }, lines);
}

/* =====================================================================
 * Ausgabe (rechte Spalte)
 * ===================================================================== */
function currentJson() {
    return JSON.stringify(LootExport.build(T(), state.fmt), null, 2);
}

function highlight(json) {
    return json.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]).replace(/("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
        (m, str, colon, bool, n) => {
            if (str) return colon ? `<span class="k">${str}</span>${colon}` : `<span class="s">${str}</span>`;
            if (bool) return `<span class="b">${bool}</span>`;
            return `<span class="n">${n}</span>`;
        });
}

function validate() {
    const t = T();
    const out = [];
    if (!/^[a-z0-9_.-]+$/.test(t.namespace)) out.push(['err', 'Ungültiger Namespace – nur a–z, 0–9, _ . - erlaubt.']);
    if (!/^[a-z0-9_./-]+$/.test(t.path)) out.push(['err', 'Ungültiger Pfad – nur a–z, 0–9, _ . - / erlaubt.']);
    if (!t.pools.length) out.push(['err', 'Die Loot-Table hat keinen Pool und droppt nichts.']);
    t.pools.forEach((p, i) => {
        if (!p.entries.length) out.push(['warn', `Pool ${i + 1} hat keine Einträge.`]);
        if (p.entries.length && p.entries.every(e => e.kind === 'empty')) out.push(['warn', `Pool ${i + 1} enthält nur „Nichts“-Einträge.`]);
        const bad = [...p.conditions, ...p.entries.flatMap(e => e.conditions)].filter(c => !condAvailable(COND_BY_TYPE.get(c.type) || {}));
        if (bad.length) out.push(['warn', `Pool ${i + 1}: ${bad.length} Bedingung(en) passen nicht zum Typ „${TYPE_BY_ID.get(t.type).label}“.`]);
        p.entries.forEach(e => {
            if ((e.kind === 'tag' || e.kind === 'loot_table') && !e.name) out.push(['err', `Pool ${i + 1}: Ein Eintrag hat keine ID und wird weggelassen.`]);
            if (e.kind === 'item' && !ITEMS.has(strip(e.name))) out.push(['warn', `Pool ${i + 1}: „${e.name}“ ist kein bekanntes Item.`]);
            if (e.kind === 'item' && e.ench.mode === 'fixed' && !e.ench.list.length) out.push(['warn', `Pool ${i + 1}: ${itemName(e.name)} hat „Feste Verzauberungen“, aber keine ausgewählt.`]);
            [...e.conditions].forEach(c => {
                if (['biome', 'structure', 'tool_item'].includes(c.type) && !c.p.list.length) out.push(['warn', `Pool ${i + 1}: Bedingung „${COND_BY_TYPE.get(c.type).label}“ ist leer und wird ignoriert.`]);
                if (c.type === 'score' && !c.p.objective) out.push(['warn', `Pool ${i + 1}: Scoreboard-Bedingung ohne Ziel wird ignoriert.`]);
            });
        });
    });
    const fmtLabel = versionLabel();
    const tooNew = new Map();
    const noteNew = (kind, id, label) => { const v = missingIn(kind, id); if (v) tooNew.set(label, v); };
    t.pools.forEach(p => {
        p.entries.forEach(e => { if (e.kind === 'item') noteNew('items', e.name, itemName(e.name)); });
        [...p.conditions, ...p.entries.flatMap(e => e.conditions)].forEach(c => {
            if (c.type === 'biome') c.p.list.forEach(b => noteNew('biomes', b, BIOMES.get(b) || b));
            if (c.type === 'structure') c.p.list.forEach(x => noteNew('structures', x, x));
            if (c.type === 'killer_type') noteNew('entities', c.p.entity, ENTITIES.get(c.p.entity) || c.p.entity);
            if (c.type === 'tool_item') c.p.list.forEach(i => noteNew('items', i, itemName(i)));
        });
    });
    tooNew.forEach((v, label) => out.push(['err', `„${label}“ gibt es ${v} – in ${fmtLabel} lädt die Loot-Table damit nicht.`]));
    t.pools.forEach(p => p.entries.forEach(e => {
        if (e.kind === 'item' && e.ench.mode === 'fixed') e.ench.list.forEach(x => { const m = missingIn('enchantments', x.id); if (m) out.push(['err', `Verzauberung „${enchName(x.id)}“ gibt es ${m}.`]); });
        if (e.potion && missingIn('potions', e.potion)) out.push(['err', `Trank „${POTIONS.get(e.potion) || e.potion}“ gibt es ${missingIn('potions', e.potion)}.`]);
    }));
    if (state.fmt === 'v1_21_0' && t.pools.some(p => p.entries.some(e => String(e.cmd.strings || '').trim() || String(e.cmd.floats || '').split(',').filter(x => x.trim()).length > 1))) {
        out.push(['warn', 'Vor 1.21.4 kennt Custom Model Data nur eine einzelne Zahl – Texte und weitere Zahlen werden weggelassen.']);
    }
    return out;
}

function updateOutput() {
    const json = currentJson();
    $('#json').innerHTML = highlight(json);
    const w = validate();
    $('#warnings').replaceChildren(...(w.length ? w : [['ok', 'Alles in Ordnung – bereit zum Herunterladen.']]).map(([cls, msg]) => h('li', { class: cls }, msg)));
    updatePathBox();
}

/* =====================================================================
 * Testwurf / Simulation
 * ===================================================================== */
function randInt(a, b) {
    a = Math.round(a); b = Math.round(b);
    if (b < a) [a, b] = [b, a];
    return a + Math.floor(Math.random() * (b - a + 1));
}
function randFloat(a, b) {
    if (b < a) [a, b] = [b, a];
    return a + Math.random() * (b - a);
}

function condPass(c, lvl) {
    let r = true;
    if (c.type === 'random_chance') r = Math.random() < num(c.p.chance) / 100;
    else if (c.type === 'random_looting') r = Math.random() < (num(c.p.base) + num(c.p.per) * lvl) / 100;
    return c.invert ? !r : r;
}

function condsPass(owner, lvl) {
    if (!owner.conditions.length) return true;
    const res = owner.conditions.map(c => condPass(c, lvl));
    return owner.condMode === 'any' ? res.some(Boolean) : res.every(Boolean);
}

function simulateOnce(lvl) {
    const drops = [];
    for (const pool of T().pools) {
        if (!condsPass(pool, lvl)) continue;
        const rolls = randInt(num(pool.rolls.min, 1), num(pool.rolls.max, num(pool.rolls.min, 1)));
        for (let r = 0; r < rolls; r++) {
            const cands = pool.entries.filter(e => condsPass(e, lvl));
            const tw = cands.reduce((s, e) => s + Math.max(1, Math.round(num(e.weight, 1))), 0);
            if (!tw) continue;
            let x = Math.random() * tw;
            const e = cands.find(c => (x -= Math.max(1, Math.round(num(c.weight, 1)))) < 0);
            if (!e || e.kind === 'empty') continue;
            let count = 1;
            if (e.kind === 'item' || e.kind === 'tag') {
                count = randInt(num(e.count.min, 1), num(e.count.max, num(e.count.min, 1)));
                const ty = T().type;
                if ((ty === 'entity' || ty === 'generic') && e.looting.on && lvl > 0) {
                    count += Math.round(lvl * randFloat(num(e.looting.min), num(e.looting.max)));
                }
                if ((ty === 'block' || ty === 'generic') && e.fortune.on && lvl > 0) {
                    if (e.fortune.formula === 'ore_drops') count *= Math.max(0, Math.floor(Math.random() * (lvl + 2)) - 1) + 1;
                    else count += Math.floor(Math.random() * (lvl + 1));
                }
            }
            if (count > 0) drops.push({ e, count });
        }
    }
    return drops;
}

function openSimulation() {
    const st = { lvl: 0 };
    const th = sceneInfo();
    const chest = h('div', { class: th.cls === 'chest' ? 'chest' : 'inventory sim-drops theme-' + th.cls, style: th.cls === 'chest' ? null : texStyle(th.tex) });
    const stats = h('div');
    const summary = h('div', { class: 'hint', style: 'margin:8px 0 14px' });

    const roll = () => {
        const drops = simulateOnce(st.lvl);
        const stacks = [];
        drops.forEach(({ e, count }) => {
            const max = e.kind === 'item' ? (itemInfo(e.name)?.maxStack || 64) : 64;
            while (count > 0) { stacks.push({ e, n: Math.min(max, count) }); count -= max; }
        });
        const slotEl = s => h('div', {
            class: 'slot' + (s && isEnchanted(s.e) ? ' glint' : ''), title: s ? `${entryTitle(s.e)} ×${s.n}` : ''
        }, s ? [entryIcon(s.e), s.n > 1 ? h('span', { class: 'count' }, s.n) : null] : null);
        if (th.cls === 'chest') {
            const slots = Array.from({ length: 27 }, () => null);
            const free = [...slots.keys()].sort(() => Math.random() - 0.5);
            stacks.slice(0, 27).forEach((s, i) => { slots[free[i]] = s; });
            chest.replaceChildren(...slots.map(slotEl));
        } else if (th.cls === 'shelf') {
            // Regal mit 3 Plätzen + Item-Rahmen (zeigt nur das erste Item)
            chest.replaceChildren(
                h('div', { class: 'section-label', style: 'color:#fff' }, 'Regal'),
                h('div', { class: 'shelf-row' }, [0, 1, 2].map(i => slotEl(stacks[i] || null))),
                h('div', { class: 'section-label', style: 'color:#fff;margin-top:14px' }, 'Item-Rahmen'),
                h('div', { class: 'frame' }, slotEl(stacks[0] || null)));
        } else {
            chest.replaceChildren(...(stacks.length ? stacks.map(slotEl) : [h('div', { class: 'empty-drop' }, '… nichts gedroppt')]));
        }
        const limit = th.cls === 'chest' ? 27 : th.cls === 'shelf' ? 3 : Infinity;
        summary.textContent = stacks.length
            ? `${stacks.length} Stapel gewürfelt${stacks.length > limit ? ` (nur die ersten ${limit} passen hinein)` : ''}.`
            : 'Diesmal nichts – probiere es nochmal.';
    };

    const runStats = () => {
        const N = 2000;
        const agg = new Map();
        let empty = 0;
        for (let i = 0; i < N; i++) {
            const d = simulateOnce(st.lvl);
            if (!d.length) empty++;
            const seen = new Set();
            d.forEach(({ e, count }) => {
                const key = e.id;
                const a = agg.get(key) || { e, total: 0, hits: 0 };
                a.total += count;
                if (!seen.has(key)) { a.hits++; seen.add(key); }
                agg.set(key, a);
            });
        }
        const rows = [...agg.values()].sort((a, b) => b.hits - a.hits);
        const maxHit = Math.max(1, ...rows.map(r => r.hits));
        stats.replaceChildren(
            h('div', { class: 'section-label', style: 'margin-top:18px' }, `Statistik aus ${N} Würfen`),
            h('div', { style: 'overflow-x:auto' }, h('table', { class: 'stats' },
                h('thead', null, h('tr', null, h('th', null, 'Eintrag'), h('th', null, 'Chance, dass es droppt'), h('th', { class: 'num' }, ''), h('th', { class: 'num' }, 'Ø Anzahl'))),
                h('tbody', null, rows.map(r => h('tr', null,
                    h('td', null, h('div', { class: 'item-cell' }, entryIcon(r.e), entryTitle(r.e))),
                    h('td', { style: 'width:40%' }, h('div', { class: 'bar', style: `width:${(r.hits / maxHit) * 100}%` })),
                    h('td', { class: 'num' }, fmtPct(r.hits / N * 100)),
                    h('td', { class: 'num' }, (r.total / N).toFixed(2).replace('.', ',')))),
                    empty ? h('tr', null, h('td', null, h('div', { class: 'item-cell' }, icon('barrier'), 'Gar nichts')), h('td'), h('td', { class: 'num' }, fmtPct(empty / N * 100)), h('td')) : null))));
    };

    const ty = T().type;
    const lvlLabel = ty === 'block' ? 'Glück-Stufe' : ty === 'entity' ? 'Plünderung-Stufe' : 'Plünderung/Glück-Stufe';
    const body = h('div', null,
        explain('Hier siehst du, was bei einem echten Durchlauf herauskommen könnte. Klick mehrmals auf „Nochmal würfeln“ – die Statistik unten zeigt, wie oft jedes Item im Schnitt droppt.', infoBtn(HELP.sim, 'Testwurf')),
        h('div', { class: 'row', style: 'flex-wrap:wrap;gap:14px;margin-bottom:12px' },
            h('button', { class: 'btn btn-primary', onclick: roll }, '🎲 Nochmal würfeln'),
            h('button', { class: 'btn', onclick: runStats }, 'Statistik berechnen'),
            h('span', { class: 'hint' }, lvlLabel),
            seg(st, 'lvl', [[0, '0'], [1, 'I'], [2, 'II'], [3, 'III']], { ch: () => {}, after: () => { roll(); if (stats.childNodes.length) runStats(); } })),
        chest, summary,
        h('div', { class: 'hint' }, 'Zufallschancen werden ausgewürfelt. Alle anderen Bedingungen (Wetter, Biom, Werkzeug …) gelten im Test als erfüllt.'),
        stats);
    openModal({ title: 'Testwurf – ' + th.title, wide: true, body, iconEl: icon(th.icon, { eager: true }) });
    roll();
    runStats();
}

/* =====================================================================
 * Import (Projekt-Datei, fertige Loot-Table-JSON oder Vanilla-Vorlage)
 * ===================================================================== */
function importLootTable(json) {
    let skipped = 0;
    const typeOf = x => strip(typeof x === 'string' ? x : (x.type ?? x.condition ?? x.function ?? ''));
    const asList = v => v == null ? [] : Array.isArray(v) ? v : [v];
    const rangeOf = (v, d = 1) => {
        if (typeof v === 'number') return { min: v, max: v };
        if (v && typeof v === 'object') {
            const t = strip(v.type || 'uniform');
            if (t === 'constant') return { min: v.value, max: v.value };
            if (t === 'binomial') return { min: 0, max: v.n };
            if ('min' in v || 'max' in v) return { min: num(v.min, d), max: num(v.max, num(v.min, d)) };
        }
        skipped++;
        return { min: d, max: d };
    };
    const textOf = t => {
        if (typeof t === 'string') return { text: t, color: '', bold: false, italic: false };
        if (Array.isArray(t)) return textOf(t[0] || '');
        if (t && typeof t === 'object') {
            if (!('text' in t)) skipped++;
            return { text: t.text ?? t.translate ?? '', color: t.color || '', bold: !!t.bold, italic: !!t.italic };
        }
        return { text: '', color: '', bold: false, italic: false };
    };

    const parseCond = (x, inv = false) => {
        const mk = (type, p = {}) => ({ id: uid(), type, invert: inv, p: { ...COND_BY_TYPE.get(type).def(), ...p } });
        if (typeof x === 'string') {
            if (strip(x) === 'tool/can_silk_touch') return [mk('silk_touch')];
            if (strip(x) === 'tool/can_shear') return [mk('shears')];
            skipped++; return [];
        }
        const t = typeOf(x);
        const pred = x.predicate || {};
        switch (t) {
            case 'inverted': return parseCond(x.term, !inv);
            case 'all_of': if (!inv) return asList(x.terms).flatMap(y => parseCond(y)); break;
            case 'random_chance': if (typeof x.chance === 'number') return [mk('random_chance', { chance: +(x.chance * 100).toFixed(3) })]; break;
            case 'random_chance_with_enchanted_bonus': {
                const per = x.enchanted_chance?.per_level_above_first ?? 0;
                return [mk('random_looting', { base: +(num(x.unenchanted_chance) * 100).toFixed(3), per: +(per * 100).toFixed(3) })];
            }
            case 'killed_by_player': return [{ ...mk('killed_by_player'), invert: inv !== !!x.inverse }];
            case 'weather_check':
                if (x.thundering === true) return [mk('weather', { mode: 'thunder' })];
                if (x.raining === false) return [mk('weather', { mode: 'clear' })];
                if (x.raining === true) return [mk('weather', { mode: x.thundering === false ? 'rain' : 'any_rain' })];
                break;
            case 'time_check': {
                const v = typeof x.value === 'number' ? { min: x.value, max: x.value } : (x.value || {});
                return [mk('time', { preset: 'custom', min: v.min ?? '', max: v.max ?? '' })];
            }
            case 'location_check': {
                const out = [];
                if (pred.biomes) out.push(mk('biome', { list: asList(pred.biomes).map(stripKeepTag) }));
                if (pred.dimension) out.push(mk('dimension', { dim: strip(pred.dimension) }));
                if (pred.structures) out.push(mk('structure', { list: asList(pred.structures).map(stripKeepTag) }));
                if (pred.position?.y) out.push(mk('height', { min: pred.position.y.min ?? '', max: pred.position.y.max ?? '' }));
                if (pred.can_see_sky) out.push(mk('sky'));
                if (pred.light?.light) out.push(mk('light', { min: pred.light.light.min ?? '', max: pred.light.light.max ?? '' }));
                if (Object.keys(pred).some(k => !['biomes', 'dimension', 'structures', 'position', 'can_see_sky', 'light'].includes(k)) || x.offsetX || x.offsetY || x.offsetZ) skipped++;
                if (out.length) return out;
                break;
            }
            case 'match_tool': {
                const en = pred.predicates?.['minecraft:enchantments']?.[0] || pred.enchantments?.[0];
                if (en) {
                    const id = strip(en.enchantments);
                    if (id === 'silk_touch') return [mk('silk_touch')];
                    return [mk('tool_enchant', { ench: id, min: en.levels?.min ?? 1 })];
                }
                if (pred.items) {
                    const items = asList(pred.items).map(stripKeepTag);
                    if (items.length === 1 && items[0] === 'shears') return [mk('shears')];
                    return [mk('tool_item', { list: items })];
                }
                break;
            }
            case 'survives_explosion': return [mk('survives_explosion')];
            case 'entity_properties': {
                // Nur ein einzelnes Merkmal wird unterstützt – alles Weitere zählt als nicht übernommen
                const flagKeys = Object.keys(pred['minecraft:flags'] || pred.flags || {});
                if (Object.keys(pred).length > 1 || flagKeys.length > 1) skipped++;
                const flags = pred['minecraft:flags'] || pred.flags;
                if (flags?.is_on_fire) return [mk('on_fire')];
                if (flags?.is_baby) return [mk('is_baby')];
                const et = pred['minecraft:entity_type'] || pred.type;
                if (et && typeof et === 'string' && x.entity !== 'this') return [mk('killer_type', { entity: strip(et) })];
                const hook = pred['minecraft:type_specific/fishing_hook'] || (pred.type_specific?.type?.includes('fishing_hook') ? pred.type_specific : null);
                if (hook?.in_open_water) return [mk('open_water')];
                break;
            }
            case 'entity_scores': {
                const [obj, r] = Object.entries(x.scores || {})[0] || [];
                if (obj) {
                    const b = typeof r === 'number' ? { min: r, max: r } : (r || {});
                    return [mk('score', { objective: obj, entity: x.entity || 'this', min: b.min ?? '', max: b.max ?? '' })];
                }
                break;
            }
        }
        skipped++;
        return [];
    };

    const condsOf = o => {
        const raw = asList(o.condition ?? o.conditions);
        if (raw.length === 1 && typeof raw[0] === 'object' && typeOf(raw[0]) === 'any_of') {
            return { conditions: asList(raw[0].terms).flatMap(y => parseCond(y)), condMode: 'any' };
        }
        return { conditions: raw.flatMap(y => parseCond(y)), condMode: 'all' };
    };

    const applyFn = (e, f) => {
        if (typeof f === 'string' || Array.isArray(f)) { skipped++; return; }
        if (f.condition || f.conditions) {
            const t0 = typeOf(f);
            if (t0 !== 'furnace_smelt') skipped++;
        }
        const t = typeOf(f);
        switch (t) {
            case 'set_count': e.count = rangeOf(f.count); break;
            case 'set_potion': e.potion = strip(f.id); break;
            case 'set_enchantments':
                e.ench.mode = 'fixed';
                e.ench.list = Object.entries(f.enchantments || {}).map(([id, l]) => ({ id: strip(id), ...rangeOf(l) }));
                break;
            case 'enchant_randomly':
                e.ench.mode = 'random';
                if (typeof f.options === 'string' && f.options.startsWith('#')) { e.ench.random.source = 'tag'; e.ench.random.tag = strip(f.options); }
                else if (f.options) { e.ench.random.source = 'list'; e.ench.random.ids = asList(f.options).map(strip); }
                else { e.ench.random.source = 'tag'; e.ench.random.tag = ''; }
                e.ench.random.anyItem = f.only_compatible === false;
                break;
            case 'enchant_with_levels': {
                e.ench.mode = 'levels';
                const r = rangeOf(f.levels, 30);
                e.ench.levels.min = r.min; e.ench.levels.max = r.max;
                e.ench.levels.tag = typeof f.options === 'string' && f.options.startsWith('#') ? strip(f.options) : '';
                break;
            }
            case 'set_name': e.customName = textOf(f.name); break;
            case 'set_lore': e.lore = asList(f.lore).map(l => { const x = textOf(l); return { ...x, color: x.color || 'dark_purple', italic: typeof l === 'object' && 'italic' in l ? !!l.italic : true }; }); break;
            case 'set_damage': { const r = rangeOf(f.damage); e.damage = { on: true, min: Math.round(r.min * 100), max: Math.round(r.max * 100) }; break; }
            case 'set_components': {
                const c = f.components || {};
                let known = 0;
                if ('minecraft:unbreakable' in c) { e.unbreakable = true; known++; }
                if ('minecraft:enchantment_glint_override' in c) { e.glint = c['minecraft:enchantment_glint_override'] ? 'on' : 'off'; known++; }
                if ('minecraft:rarity' in c) { e.rarity = c['minecraft:rarity']; known++; }
                if (known < Object.keys(c).length) skipped++;
                break;
            }
            case 'set_custom_model_data':
                e.cmd.floats = (f.floats?.values || (typeof f.value === 'number' ? [f.value] : [])).join(', ');
                e.cmd.strings = (f.strings?.values || []).join(', ');
                break;
            case 'enchanted_count_increase': case 'looting_enchant': {
                const r = rangeOf(f.count, 0);
                e.looting = { on: true, min: r.min, max: r.max };
                break;
            }
            case 'apply_bonus':
                e.fortune = { on: true, formula: strip(f.formula) === 'uniform_bonus_count' ? 'uniform_bonus_count' : 'ore_drops' };
                break;
            case 'explosion_decay': e.explosionDecay = true; break;
            case 'furnace_smelt': e.smelt = true; break;
            default: skipped++;
        }
    };

    const fnsOf = o => {
        const m = o.modifier ?? o.functions;
        return asList(m).flat(Infinity);
    };

    const parseEntry = (x, extraConds = []) => {
        const t = typeOf(x);
        if (['alternatives', 'group', 'sequence'].includes(t)) {
            const res = [];
            const parentConds = [...extraConds, ...condsOf(x).conditions];
            const prior = [];
            for (const child of asList(x.children)) {
                // Bei "alternatives" gilt ein Kind nur, wenn die vorherigen nicht zutrafen
                const inverted = t === 'alternatives' ? prior.map(c => ({ ...c, id: uid(), invert: !c.invert })) : [];
                res.push(...parseEntry(child, [...parentConds, ...inverted]));
                if (t === 'alternatives') {
                    const cc = condsOf(child).conditions;
                    if (cc.length > 1) skipped++;
                    if (cc.length === 1) prior.push(cc[0]);
                }
            }
            return res;
        }
        let e;
        if (t === 'item') e = newEntry('item', strip(x.name));
        else if (t === 'tag') { e = newEntry('tag', strip(x.items ?? x.name)); e.expand = !!x.expand; }
        else if (t === 'loot_table') {
            const v = x.value ?? x.name;
            if (typeof v !== 'string') { skipped++; return []; }
            e = newEntry('loot_table', v.includes(':') ? v : 'minecraft:' + v);
        } else if (t === 'empty') e = newEntry('empty');
        else { skipped++; return []; }
        e.weight = x.weight ?? 1;
        e.quality = x.quality ?? 0;
        fnsOf(x).forEach(f => applyFn(e, f));
        const c = condsOf(x);
        e.conditions = [...extraConds, ...c.conditions];
        e.condMode = extraConds.length ? 'all' : c.condMode;
        return [e];
    };

    const table = newTable();
    let type = strip(json.type || 'generic');
    type = TYPE_ALIASES[type] || type;
    table.type = TYPE_BY_ID.has(type) ? type : 'generic';
    table.randomSequence = !!json.random_sequence;
    table.pools = asList(json.pools).map(p => {
        const pool = newPool();
        const r = rangeOf(p.rolls);
        pool.rolls = { min: r.min, max: r.max };
        pool.bonusRolls = typeof p.bonus_rolls === 'number' ? p.bonus_rolls : 0;
        pool.entries = asList(p.entries).flatMap(x => parseEntry(x));
        Object.assign(pool, condsOf(p));
        if (fnsOf(p).length) skipped++;
        return pool;
    });
    if (fnsOf(json).length) skipped++;
    return { table, skipped };
}

function loadProjectText(text, fileName = '') {
    let json;
    try { json = JSON.parse(text); } catch { toast('Die Datei ist kein gültiges JSON.'); return; }
    if (json && json.app === 'loot-table-builder' && json.table) {
        setVersion(json.version || FMT_TO_VERSION[json.fmt] || state.version);
        state.table = hydrate(json.table);
        toast('Projekt geladen');
    } else if (json && Array.isArray(json.pools)) {
        const { table, skipped } = importLootTable(json);
        const name = fileName.replace(/\.json$/i, '');
        if (name) table.path = (TYPE_BY_ID.get(table.type)?.folder ? TYPE_BY_ID.get(table.type).folder + '/' : '') + name.toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
        state.table = hydrate(table);
        toast(skipped ? `Loot-Table importiert – ${skipped} Teil(e) konnten nicht übernommen werden.` : 'Loot-Table importiert');
    } else {
        toast('Unbekanntes Dateiformat.');
        return;
    }
    syncVersionSelect();
    renderSettings();
    refresh();
}

async function loadVanilla(path) {
    path = strip(String(path || '').trim()).replace(/\.json$/, '');
    if (!VANILLA_TABLES.has(path) || !availIn('lootTables', path)) { toast(`Diese Vanilla-Loot-Table gibt es in ${versionLabel()} nicht.`); return; }
    if (T().pools.some(p => p.entries.length) && !confirm('Die aktuelle Loot-Table wird ersetzt. Fortfahren?')) return;
    try {
        const res = await fetch(`${vanillaDataUrl()}/${path}.json`);
        if (!res.ok) throw new Error(res.status);
        const json = await res.json();
        const { table, skipped } = importLootTable(json);
        table.namespace = 'minecraft';
        table.path = path;
        state.table = hydrate(table);
        renderSettings();
        refresh();
        toast(skipped ? `Vorlage geladen – ${skipped} Spezial-Teil(e) wurden vereinfacht oder weggelassen.` : 'Vanilla-Vorlage geladen');
    } catch (err) {
        toast('Laden fehlgeschlagen – bist du online?');
    }
}

/* =====================================================================
 * Start
 * ===================================================================== */
function syncVersionSelect() {
    const sel = $('#version');
    if (sel) sel.value = state.version;
}

function init() {
    loadState();
    $('#brand-icon').append(icon('chest', { eager: true }));
    $('#brand-sub').textContent = `Loot-Tables & Mob-Generator · Minecraft ${VERSIONS[0].id} – ${VERSIONS[VERSIONS.length - 1].id}`;
    // neueste Version oben
    $('#version').replaceChildren(...[...VERSIONS].reverse().map((v, i) => h('option', { value: v.id }, v.id + (i === 0 ? ' (neueste)' : ''))));
    syncVersionSelect();
    $('#version').addEventListener('change', e => {
        setVersion(e.target.value);
        saveState();
        renderSettings();
        refresh();
        versionListeners.forEach(fn => fn());
        toast(`${versionLabel()} gewählt – es werden nur noch Inhalte dieser Version angezeigt.`);
    });

    $('.fmt-select').append(infoBtn(HELP.format, 'Minecraft-Version'));
    const topbar = $('.topbar');
    new ResizeObserver(() => document.documentElement.style.setProperty('--topbar-h', topbar.offsetHeight + 'px')).observe(topbar);
    const head = $('#view-loot .output-head h2');
    head.prepend(h('span', { class: 'step-no' }, '3'));
    head.append(infoBtn(HELP.output, 'Ausgabe'));
    $('#view-loot .output-head').after(explain('Die fertige Datei entsteht automatisch. Lade sie oben mit „JSON herunterladen“ herunter und leg sie unter diesem Pfad ins Datapack:'));

    // Erklärtexte ein-/ausblenden
    let showExplain = true;
    try { showExplain = localStorage.getItem('lootbuilder.explain') !== '0'; } catch { /* egal */ }
    const applyExplain = () => {
        document.body.classList.toggle('no-explain', !showExplain);
        $('#explain-toggle').checked = showExplain;
    };
    $('#explain-toggle').addEventListener('change', e => {
        showExplain = e.target.checked;
        try { localStorage.setItem('lootbuilder.explain', showExplain ? '1' : '0'); } catch { /* egal */ }
        applyExplain();
    });
    $('#explain-wrap').append(infoBtn(HELP.explainToggle, 'Erklärungen'));
    applyExplain();
    $('#btn-guide').addEventListener('click', () => openGuide(typeof currentView === 'function' && currentView() === 'mob' ? GUIDE_MOB_START : 0));
    $('#btn-load').after(infoBtn(HELP.project, 'Projekte'));

    $('#btn-add-pool').addEventListener('click', () => { T().pools.push(newPool()); refresh(); });
    $('#btn-new').addEventListener('click', () => {
        if (!confirm('Neue Loot-Table beginnen? Die aktuelle wird verworfen (vorher ggf. „Projekt speichern“).')) return;
        state.table = newTable();
        renderSettings();
        refresh();
    });
    $('#btn-save').addEventListener('click', () => {
        const name = (T().path.split('/').pop() || 'loot_table') + '.lootproject.json';
        downloadFile(name, JSON.stringify({ app: 'loot-table-builder', version: state.version, fmt: state.fmt, table: T() }, null, 2));
    });
    $('#btn-load').addEventListener('click', () => $('#file-load').click());
    $('#file-load').addEventListener('change', async e => {
        const f = e.target.files[0];
        if (f) loadProjectText(await f.text(), f.name.replace(/\.lootproject/, ''));
        e.target.value = '';
    });
    $('#btn-download').addEventListener('click', () => {
        const errs = validate().filter(w => w[0] === 'err');
        if (errs.length && !confirm('Es gibt noch Fehler:\n\n' + errs.map(w => '• ' + w[1]).join('\n') + '\n\nTrotzdem herunterladen?')) return;
        downloadFile((T().path.split('/').pop() || 'loot_table') + '.json', currentJson() + '\n');
    });
    $('#btn-copy').addEventListener('click', () => copyText(currentJson()));
    $('#btn-sim').addEventListener('click', openSimulation);

    // Dateien per Drag & Drop importieren
    document.addEventListener('dragover', e => e.preventDefault());
    document.addEventListener('drop', async e => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f) loadProjectText(await f.text(), f.name.replace(/\.lootproject/, ''));
    });

    renderSettings();
    refresh();

    // Beim allerersten Start die Anleitung zeigen
    let seen = false;
    try { seen = localStorage.getItem('lootbuilder.guideSeen') === '1'; } catch { /* egal */ }
    if (!seen) openGuide();
}

init();

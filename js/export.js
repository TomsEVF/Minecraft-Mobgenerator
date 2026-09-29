'use strict';

/*
 * Wandelt das Projekt-Modell der App in eine Loot-Table-JSON um.
 *
 * Formate:
 *  - modern (26.3+): "type" statt "function"/"condition", einzelnes "modifier"/"condition"-Feld,
 *    mehrere Bedingungen werden in "minecraft:all_of" verpackt.
 *  - v26_2 (26.2): "functions"/"conditions"-Listen, aber schon die neuen Entity-Prädikate ("minecraft:flags" …).
 *  - v26_1 (26.1 – 26.1.2): Listen, alte Entity-Prädikate, time_check braucht bereits eine "clock".
 *  - legacy (1.21.4 – 1.21.11): Listen, alte Entity-Prädikate, time_check ohne "clock".
 *  - v1_21_0 (1.21 – 1.21.3): wie legacy, Custom Model Data aber nur als einzelne Zahl ("value").
 */
window.LootExport = (() => {
    const ns = id => {
        id = String(id || '').trim();
        if (!id) return id;
        if (id.startsWith('#')) return '#' + ns(id.slice(1));
        return id.includes(':') ? id : 'minecraft:' + id;
    };
    const toNum = (v, d = 0) => {
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : d;
    };
    const round = n => Math.round(n * 10000) / 10000;

    // Zahl oder gleichverteilter Bereich
    function range(min, max, float = false) {
        let a = toNum(min), b = toNum(max, a);
        if (!float) { a = Math.round(a); b = Math.round(b); }
        if (b < a) [a, b] = [b, a];
        if (a === b) return float ? round(a) : a;
        return { type: 'minecraft:uniform', min: float ? round(a) : a, max: float ? round(b) : b };
    }

    // {min, max} für Prädikate (leere Felder werden weggelassen)
    function bounds(min, max, float = false) {
        const o = {};
        const conv = v => float ? round(toNum(v)) : Math.round(toNum(v));
        if (min !== '' && min != null) o.min = conv(min);
        if (max !== '' && max != null) o.max = conv(max);
        return o;
    }

    function one(list) {
        return list.length === 1 ? list[0] : list;
    }

    // Eine ID-Liste darf entweder EIN Tag oder mehrere einzelne IDs enthalten – nie gemischt.
    // Gibt die gültigen Varianten zurück; mehr als eine Variante wird später per „any_of“ verknüpft.
    function holderVariants(list) {
        const ids = list.map(ns);
        const tags = ids.filter(x => x.startsWith('#'));
        const plain = ids.filter(x => !x.startsWith('#'));
        const out = [];
        if (plain.length) out.push(one(plain));
        return out.concat(tags);
    }

    function text(t, defaults = {}) {
        const o = { text: t.text };
        const color = t.color || defaults.color;
        if (color) o.color = color;
        if (t.bold) o.bold = true;
        o.italic = !!t.italic;
        if (t.underlined) o.underlined = true;
        return o;
    }

    const FORMATS = {
        modern: { lists: false, clock: true, newEntity: true },
        v26_2: { lists: true, clock: true, newEntity: true },
        v26_1: { lists: true, clock: true, newEntity: false },
        legacy: { lists: true, clock: false, newEntity: false },
        v1_21_0: { lists: true, clock: false, newEntity: false, cmdLegacy: true }
    };
    // Eigene App-Typen, die als Vanilla-Typ exportiert werden (/loot … loot nutzt den Truhen-Kontext)
    const EXPORT_TYPE = { display: 'chest' };

    function create(ctx) {
        const FMT = FORMATS[ctx.fmt] || FORMATS.modern;
        const M = !FMT.lists;
        const E = FMT.newEntity;
        const F = (type, props = {}) => M ? { type: ns(type), ...props } : { function: ns(type), ...props };
        const C = (type, props = {}) => M ? { type: ns(type), ...props } : { condition: ns(type), ...props };

        const entityPred = (key, value) => {
            if (E) return { ['minecraft:' + key]: value };
            return { [key]: value };
        };

        const anyOf = terms => terms.length === 1 ? terms[0] : C('any_of', { terms });

        // ---------- Bedingungen ----------
        const condBuilders = {
            random_chance: p => C('random_chance', { chance: round(Math.min(1, Math.max(0, toNum(p.chance) / 100))) }),
            random_looting: p => {
                const base = round(toNum(p.base) / 100), per = round(toNum(p.per) / 100);
                return C('random_chance_with_enchanted_bonus', {
                    enchantment: 'minecraft:looting',
                    unenchanted_chance: base,
                    enchanted_chance: { type: 'minecraft:linear', base: round(base + per), per_level_above_first: per }
                });
            },
            killed_by_player: () => C('killed_by_player'),
            weather: p => {
                if (p.mode === 'clear') return C('weather_check', { raining: false });
                if (p.mode === 'rain') return C('weather_check', { raining: true, thundering: false });
                if (p.mode === 'thunder') return C('weather_check', { thundering: true });
                return C('weather_check', { raining: true });
            },
            time: p => {
                let min = p.min, max = p.max;
                if (p.preset === 'day') { min = 0; max = 12000; }
                if (p.preset === 'night') { min = 13000; max = 23000; }
                const o = FMT.clock ? { clock: 'minecraft:overworld' } : {};
                o.value = bounds(min, max);
                o.period = 24000;
                return C('time_check', o);
            },
            biome: p => p.list.length ? anyOf(holderVariants(p.list).map(x => C('location_check', { predicate: { biomes: x } }))) : null,
            dimension: p => p.dim ? C('location_check', { predicate: { dimension: ns(p.dim) } }) : null,
            structure: p => p.list.length ? anyOf(holderVariants(p.list).map(x => C('location_check', { predicate: { structures: x } }))) : null,
            height: p => C('location_check', { predicate: { position: { y: bounds(p.min, p.max, true) } } }),
            sky: () => C('location_check', { predicate: { can_see_sky: true } }),
            light: p => C('location_check', { predicate: { light: { light: bounds(p.min, p.max) } } }),
            silk_touch: () => C('match_tool', {
                predicate: { predicates: { 'minecraft:enchantments': [{ enchantments: 'minecraft:silk_touch', levels: { min: 1 } }] } }
            }),
            tool_enchant: p => p.ench ? C('match_tool', {
                predicate: { predicates: { 'minecraft:enchantments': [{ enchantments: ns(p.ench), levels: { min: Math.max(1, Math.round(toNum(p.min, 1))) } }] } }
            }) : null,
            shears: () => C('match_tool', { predicate: { items: 'minecraft:shears' } }),
            tool_item: p => p.list.length ? anyOf(holderVariants(p.list).map(x => C('match_tool', { predicate: { items: x } }))) : null,
            survives_explosion: () => C('survives_explosion'),
            on_fire: () => C('entity_properties', { entity: 'this', predicate: entityPred('flags', { is_on_fire: true }) }),
            is_baby: () => C('entity_properties', { entity: 'this', predicate: entityPred('flags', { is_baby: true }) }),
            killer_type: p => p.entity ? C('entity_properties', {
                entity: 'attacker',
                predicate: E ? { 'minecraft:entity_type': ns(p.entity) } : { type: ns(p.entity) }
            }) : null,
            open_water: () => C('entity_properties', {
                entity: 'this',
                predicate: E
                    ? { 'minecraft:type_specific/fishing_hook': { in_open_water: true } }
                    : { type_specific: { type: 'minecraft:fishing_hook', in_open_water: true } }
            }),
            score: p => p.objective ? C('entity_scores', {
                entity: p.entity || 'this',
                scores: { [p.objective.trim()]: bounds(p.min, p.max) }
            }) : null
        };

        function buildCondition(c) {
            const b = condBuilders[c.type];
            if (!b) return null;
            const res = b(c.p || {});
            if (!res) return null;
            return c.invert ? C('inverted', { term: res }) : res;
        }

        function attachConditions(obj, conds, mode) {
            const list = (conds || []).map(buildCondition).filter(Boolean);
            if (!list.length) return;
            if (mode === 'any' && list.length > 1) {
                const any = C('any_of', { terms: list });
                if (M) obj.condition = any; else obj.conditions = [any];
                return;
            }
            if (M) obj.condition = list.length === 1 ? list[0] : C('all_of', { terms: list });
            else obj.conditions = list;
        }

        function attachModifiers(obj, fns) {
            if (!fns.length) return;
            if (M) obj.modifier = fns.length === 1 ? fns[0] : fns;
            else obj.functions = fns;
        }

        // ---------- Funktionen (Item-Modifier) ----------
        function buildFunctions(e) {
            const f = [];
            const cMin = toNum(e.count.min, 1), cMax = toNum(e.count.max, cMin);
            if (!(cMin === 1 && cMax === 1)) f.push(F('set_count', { count: range(cMin, cMax) }));

            if (e.potion) f.push(F('set_potion', { id: ns(e.potion) }));

            const en = e.ench;
            if (en.mode === 'fixed') {
                const map = {};
                en.list.filter(x => x.id).forEach(x => { map[ns(x.id)] = range(x.min, x.max); });
                if (Object.keys(map).length) f.push(F('set_enchantments', { enchantments: map }));
            } else if (en.mode === 'random') {
                const o = {};
                if (en.random.source === 'list') {
                    if (en.random.ids.length) o.options = en.random.ids.length === 1 ? ns(en.random.ids[0]) : en.random.ids.map(ns);
                } else if (en.random.tag) {
                    o.options = '#minecraft:' + en.random.tag;
                }
                if (en.random.anyItem) o.only_compatible = false;
                f.push(F('enchant_randomly', o));
            } else if (en.mode === 'levels') {
                const o = { levels: range(en.levels.min, en.levels.max) };
                if (en.levels.tag) o.options = '#minecraft:' + en.levels.tag;
                f.push(F('enchant_with_levels', o));
            }

            if (e.customName.text) {
                f.push(F('set_name', { name: text(e.customName), target: 'custom_name' }));
            }
            const lore = e.lore.filter(l => l.text !== '');
            if (lore.length) {
                f.push(F('set_lore', { lore: lore.map(l => text(l, { color: 'gray' })), mode: 'replace_all' }));
            }

            if (e.damage.on) {
                f.push(F('set_damage', { damage: range(toNum(e.damage.min) / 100, toNum(e.damage.max) / 100, true) }));
            }

            const comps = {};
            if (e.unbreakable) comps['minecraft:unbreakable'] = {};
            if (e.glint === 'on') comps['minecraft:enchantment_glint_override'] = true;
            if (e.glint === 'off') comps['minecraft:enchantment_glint_override'] = false;
            if (e.rarity) comps['minecraft:rarity'] = e.rarity;
            if (Object.keys(comps).length) f.push(F('set_components', { components: comps }));

            const floats = String(e.cmd.floats || '').split(',').map(s => s.trim()).filter(Boolean).map(Number).filter(Number.isFinite);
            const strings = String(e.cmd.strings || '').split(',').map(s => s.trim()).filter(Boolean);
            if (FMT.cmdLegacy) {
                if (floats.length) f.push(F('set_custom_model_data', { value: floats[0] }));
            } else if (floats.length || strings.length) {
                const o = {};
                if (floats.length) o.floats = { values: floats, mode: 'replace_all' };
                if (strings.length) o.strings = { values: strings, mode: 'replace_all' };
                f.push(F('set_custom_model_data', o));
            }

            // kontextabhängige Boni
            if (ctx.tableType === 'entity' || ctx.tableType === 'generic') {
                if (e.looting.on) {
                    f.push(F('enchanted_count_increase', {
                        enchantment: 'minecraft:looting',
                        count: range(e.looting.min, e.looting.max, true)
                    }));
                }
                if (e.smelt) {
                    const fn = F('furnace_smelt');
                    attachConditions(fn, [{ type: 'on_fire', p: {} }]);
                    f.push(fn);
                }
            }
            if (ctx.tableType === 'block' || ctx.tableType === 'generic') {
                if (e.fortune.on) {
                    const o = { enchantment: 'minecraft:fortune', formula: 'minecraft:' + e.fortune.formula };
                    if (e.fortune.formula === 'uniform_bonus_count') o.parameters = { bonusMultiplier: 1 };
                    f.push(F('apply_bonus', o));
                }
                if (e.explosionDecay) f.push(F('explosion_decay'));
            }
            return f;
        }

        // ---------- Einträge ----------
        function buildEntry(e) {
            let o;
            switch (e.kind) {
                case 'item':
                    if (!e.name) return null;
                    o = { type: 'minecraft:item', name: ns(e.name) };
                    break;
                case 'tag': {
                    if (!e.name) return null;
                    const tag = ns(e.name.replace(/^#/, ''));
                    o = { type: 'minecraft:tag' };
                    if (M) o.items = '#' + tag; else o.name = tag;
                    o.expand = !!e.expand;
                    break;
                }
                case 'loot_table':
                    if (!e.name) return null;
                    o = { type: 'minecraft:loot_table', value: ns(e.name) };
                    break;
                default:
                    o = { type: 'minecraft:empty' };
            }
            const w = Math.max(1, Math.round(toNum(e.weight, 1)));
            if (w !== 1) o.weight = w;
            const q = Math.round(toNum(e.quality, 0));
            if (q) o.quality = q;
            if (e.kind === 'item' || e.kind === 'tag') attachModifiers(o, buildFunctions(e));
            attachConditions(o, e.conditions, e.condMode);
            return o;
        }

        function buildPool(p) {
            const o = { rolls: range(p.rolls.min, p.rolls.max) };
            const bonus = toNum(p.bonusRolls, 0);
            if (bonus) o.bonus_rolls = round(bonus);
            o.entries = p.entries.map(buildEntry).filter(Boolean);
            attachConditions(o, p.conditions, p.condMode);
            return o;
        }

        return { buildPool, buildEntry, buildCondition, buildFunctions };
    }

    function build(table, fmt) {
        const b = create({ fmt, tableType: table.type });
        const out = { type: ns(EXPORT_TYPE[table.type] || table.type) };
        out.pools = table.pools.map(b.buildPool);
        if (table.randomSequence && table.path) out.random_sequence = `${table.namespace || 'minecraft'}:${table.path}`;
        return out;
    }

    return { build, ns, FORMATS };
})();

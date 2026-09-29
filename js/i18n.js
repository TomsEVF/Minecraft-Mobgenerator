'use strict';

/* =====================================================================
 * Sprache (Deutsch / Englisch)
 *
 * Alle Texte stehen im Code auf Deutsch. tr() liefert auf Englisch die Übersetzung aus
 * js/i18n-en.js – fehlt eine, bleibt der deutsche Text stehen.
 *
 *   tr('Neue Loot-Table')             → "New loot table"
 *   tr`Pool ${n} hat keine Einträge.`  → Schlüssel "Pool {0} hat keine Einträge." → "Pool {0} has no entries."
 *
 * Beim Umschalten wird die Seite neu geladen (alle Eingaben bleiben gespeichert).
 * Minecraft-Namen (Items, Mobs, Biome …) kommen aus den offiziellen Sprachdateien des Spiels.
 * ===================================================================== */
const LANGS = [['de', 'Deutsch'], ['en', 'English']];
const LANG = (() => {
    try {
        const saved = localStorage.getItem('tools.lang');
        if (saved === 'de' || saved === 'en') return saved;
    } catch { /* egal */ }
    return /^de\b/i.test(navigator.language || 'de') ? 'de' : 'en';
})();
document.documentElement.lang = LANG;

function tr(s, ...vals) {
    const dict = LANG === 'en' ? (window.I18N_EN || {}) : null;
    if (Array.isArray(s) && s.raw) {
        // als Tag-Funktion: tr`Text ${x} Text`
        let key = s[0];
        for (let i = 1; i < s.length; i++) key += `{${i - 1}}` + s[i];
        const text = has(dict, key) ? dict[key] : key;
        return text.replace(/\{(\d+)\}/g, (_, i) => String(vals[+i] ?? ''));
    }
    if (typeof s !== 'string') return s;
    return has(dict, s) ? dict[s] : s;
}
// auch leere Übersetzungen ("") zählen – z. B. wenn ein deutsches Satzende im Englischen wegfällt
const has = (dict, key) => !!dict && Object.prototype.hasOwnProperty.call(dict, key);

function setLang(lang) {
    try { localStorage.setItem('tools.lang', lang); } catch { /* egal */ }
    location.reload();
}

/* Minecraft-Namen auf Englisch umstellen: überall dort, wo die App den deutschen Namen anzeigt,
 * steht danach der englische (Suchen findet weiterhin beide). */
(function localizeData() {
    if (LANG !== 'en') return;
    const D = window.MC_DATA, M = window.MOB_DATA;
    if (D) {
        // [id, de, en, …] → angezeigter Name an Stelle 1
        D.items.forEach(a => { const de = a[1]; a[1] = a[2]; a[2] = de; });
        D.enchantments.forEach(a => { const de = a[1]; a[1] = a[2]; a[2] = de; });
        for (const key of ['potions', 'biomes', 'entities']) {
            (D[key] || []).forEach(a => { if (a[2]) a[1] = a[2]; });
        }
    }
    if (M) {
        M.mobs.forEach(m => { if (m.en) m.de = m.en; });
        Object.values(M.regs || {}).forEach(r => r.v.forEach(a => { if (a[2]) a[1] = a[2]; }));
        const walk = t => {
            if (!t || typeof t !== 'object') return;
            if (t.k === 'enum' && Array.isArray(t.values)) t.values.forEach(v => { if (v[3]) v[1] = v[3]; });
            (t.alts || []).forEach(walk);
            if (t.of && typeof t.of === 'object') walk(t.of);
            Object.values(t.fields || {}).forEach(f => walk(f[0]));
        };
        M.defs.forEach(d => walk(d.t));
    }
})();

// Feste Texte aus index.html übersetzen (Knöpfe, Überschriften, Tooltips)
function translateStatic(root = document.body) {
    if (LANG === 'de') return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
        const raw = n.textContent;
        const text = raw.trim();
        if (!text) continue;
        const t = tr(text);
        if (t !== text) n.textContent = raw.replace(text, t);
    }
    root.querySelectorAll('[title]').forEach(el => { el.title = tr(el.title); });
    document.title = tr(document.title);
}

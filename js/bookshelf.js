'use strict';

/* =====================================================================
 * Gemeißeltes Bücherregal (chiseled_bookshelf)
 *
 * 6 Plätze (oben 0–2, unten 3–5), pro Platz genau ein Buch. Das Spiel lässt nur
 * Items aus dem Tag „bookshelf_books“ zu – der Baukasten bietet deshalb nur diese an.
 * Beim Setzen per /setblock müssen die Blockzustände slot_N_occupied mitgesetzt werden,
 * sonst sind die Bücher zwar drin, aber unsichtbar.
 * Nutzt Bausteine aus app.js und mob.js (h, icon, newItem, itemComponents, textComponent …).
 * ===================================================================== */
const BOOKS_ALLOWED = ['book', 'writable_book', 'written_book', 'enchanted_book', 'knowledge_book'];
const FACINGS = [['north', tr('Norden')], ['east', tr('Osten')], ['south', tr('Süden')], ['west', tr('Westen')]];

function newShelf() {
    return { slots: [null, null, null, null, null, null], facing: 'north', out: 'setblock', pos: '~ ~ ~', target: '@p', name: '' };
}
let shelf = newShelf();
try {
    const s = JSON.parse(localStorage.getItem('bookshelf.state') || 'null');
    if (s && Array.isArray(s.slots)) shelf = { ...newShelf(), ...s };
} catch { /* egal */ }
const saveShelf = () => { try { localStorage.setItem('bookshelf.state', JSON.stringify(shelf)); } catch { /* egal */ } };

function newBook(id) {
    return { ...newItem(id), title: '', author: '', pages: [''] };
}

// Buch als Eintrag der Items-Liste (mit Slot)
function bookSnbt(b, slot) {
    const comps = itemComponents(b);
    const pages = (b.pages || []).filter(p => p.trim() !== '');
    if (strip(b.id) === 'written_book') {
        const parts = [`title:${q((b.title || tr('Buch')).slice(0, 32))}`, `author:${q(b.author || tr('Unbekannt'))}`];
        if (pages.length) parts.push(`pages:[${pages.map(p => textComponent({ text: p })).join(',')}]`);
        comps.push(`"minecraft:written_book_content":{${parts.join(',')}}`);
    }
    if (strip(b.id) === 'writable_book' && pages.length) {
        comps.push(`"minecraft:writable_book_content":{pages:[${pages.map(p => q(p)).join(',')}]}`);
    }
    const p = [`Slot:${slot}b`, `id:${q(nsId(b.id))}`];
    if (comps.length) p.push(`components:{${comps.join(',')}}`);
    return '{' + p.join(',') + '}';
}

function shelfBooks() {
    return shelf.slots.map((b, i) => [b, i]).filter(([b]) => b && BOOKS_ALLOWED.includes(strip(b.id)) && availIn('items', b.id));
}

function shelfCommand() {
    const books = shelfBooks();
    const items = `Items:[${books.map(([b, i]) => bookSnbt(b, i)).join(',')}]`;
    const occupied = [0, 1, 2, 3, 4, 5].map(i => `slot_${i}_occupied=${books.some(([, j]) => j === i)}`);
    if (shelf.out === 'give') {
        const comps = [
            `minecraft:block_entity_data={id:"minecraft:chiseled_bookshelf",${items}}`,
            `minecraft:block_state={${books.map(([, i]) => `slot_${i}_occupied:"true"`).join(',')}}`
        ];
        if (shelf.name) comps.push(`minecraft:custom_name=${textComponent({ text: shelf.name }, { italic: false })}`);
        return `/give ${shelf.target || '@p'} minecraft:chiseled_bookshelf[${comps.join(',')}]`;
    }
    return `/setblock ${shelf.pos || '~ ~ ~'} minecraft:chiseled_bookshelf[facing=${shelf.facing},${occupied.join(',')}]{${items}} replace`;
}

function openBookshelfBuilder() {
    const body = h('div');
    let selected = shelf.slots.findIndex(Boolean);
    if (selected < 0) selected = 0;

    const draw = () => {
        saveShelf();
        const b = shelf.slots[selected];
        const cmd = shelfCommand();
        const books = shelfBooks();
        const slotBtn = i => {
            const it = shelf.slots[i];
            return h('button', {
                class: 'slot shelf-slot' + (i === selected ? ' sel' : '') + (it && isItemGlint(it) ? ' glint' : ''),
                title: it ? itemName(it.id) : tr`Platz ${i + 1}: leer – klicken zum Befüllen`,
                onclick: () => {
                    selected = i;
                    if (!it) pickBook(i); else draw();
                }
            }, it ? icon(it.id) : h('span', { class: 'plus' }, '+'), h('span', { class: 'slot-no' }, i + 1));
        };
        body.replaceChildren(
            explain(tr('Klicke auf einen der 6 Plätze und wähle ein Buch. In ein gemeißeltes Bücherregal passen nur Bücher: normales Buch, Buch und Feder, beschriebenes Buch, verzaubertes Buch und Rezeptbuch – genau wie im Spiel.')),
            h('div', { class: 'shelf-builder' },
                h('div', null,
                    h('div', { class: 'shelf-block' },
                        h('div', { class: 'shelf-row-books' }, [0, 1, 2].map(slotBtn)),
                        h('div', { class: 'shelf-row-books' }, [3, 4, 5].map(slotBtn))),
                    h('div', { class: 'hint', style: 'text-align:center;margin-top:6px' }, tr`${books.length} von 6 Plätzen belegt`)),
                h('div', { class: 'shelf-edit' }, b ? bookEditor(b, selected) : h('div', { class: 'empty-note' },
                    tr`Platz ${selected + 1} ist leer. `, h('button', { class: 'btn btn-small', onclick: () => pickBook(selected) }, tr('Buch wählen …'))))),
            h('hr', { class: 'sep' }),
            h('div', { class: 'grid-2' },
                field(tr('Ausgabe'), seg(shelf, 'out', [['setblock', tr('Regal setzen')], ['give', tr('Als Item geben')]], { ch: () => {}, after: draw }), null, HELP.shelfOut),
                shelf.out === 'setblock'
                    ? h('div', { class: 'grid-2' },
                        field(tr('Position'), textInput(shelf, 'pos', { ch: () => drawCmd(), placeholder: '~ ~ ~' })),
                        field(tr('Blickrichtung'), selectInput(shelf, 'facing', FACINGS, { ch: () => drawCmd() })))
                    : h('div', { class: 'grid-2' },
                        field(tr('Für Spieler'), textInput(shelf, 'target', { ch: () => drawCmd(), placeholder: '@p' })),
                        field(tr('Name des Regals (optional)'), textInput(shelf, 'name', { ch: () => drawCmd() })))),
            h('div', { class: 'cmd-wrap' }));
        drawCmd();
    };

    const drawCmd = () => {
        saveShelf();
        const wrap = body.querySelector('.cmd-wrap');
        if (!wrap) return;
        const cmd = shelfCommand();
        const warn = [];
        if (!shelfBooks().length) warn.push(['warn', tr('Das Regal ist noch leer.')]);
        if (cmd.length > 256) warn.push(['warn', tr`Der Befehl hat ${cmd.length} Zeichen – im Chat sind nur 256 erlaubt. Nutze einen Befehlsblock.`]);
        wrap.replaceChildren(
            h('ul', { class: 'warnings', style: 'margin-top:10px' }, (warn.length ? warn : [['ok', tr`Fertig für ${versionLabel()} – ${cmd.length} Zeichen.`]]).map(([c, t]) => h('li', { class: c }, t))),
            h('div', { class: 'cmd' }, h('code', null, cmd), h('button', { class: 'icon-btn', title: tr('Kopieren'), onclick: () => copyText(cmd) }, '⧉')));
    };

    const pickBook = i => openItemPicker({
        title: tr`Platz ${i + 1}: Buch wählen`,
        filter: id => BOOKS_ALLOWED.includes(id),
        onPick: id => { shelf.slots[i] = newBook(id); selected = i; draw(); }
    });

    function bookEditor(b, i) {
        const id = strip(b.id);
        const ch = () => drawCmd();
        const pagesBox = h('div');
        const drawPages = () => pagesBox.replaceChildren(
            ...b.pages.map((p, k) => h('div', { class: 'list-row' },
                h('span', { class: 'hint', style: 'width:52px' }, tr`Seite ${k + 1}`),
                h('textarea', { rows: 2, value: p, style: 'flex:1;min-width:180px', oninput: ev => { b.pages[k] = ev.target.value; ch(); } }),
                h('button', { class: 'icon-btn', title: tr('Seite löschen'), onclick: () => { b.pages.splice(k, 1); if (!b.pages.length) b.pages.push(''); ch(); drawPages(); } }, '🗑'))),
            h('button', { class: 'btn btn-small', onclick: () => { b.pages.push(''); drawPages(); } }, tr('+ Seite')));
        drawPages();
        return h('div', null,
            h('div', { class: 'editor-item', style: 'margin-bottom:10px' }, icon(b.id),
                h('div', { style: 'flex:1' }, h('div', { class: 'name' }, tr`Platz ${i + 1}: ${b.name.text || itemName(b.id)}`), h('div', { class: 'id' }, 'minecraft:' + id)),
                h('button', { class: 'btn btn-small', onclick: () => pickBook(i) }, tr('Tauschen')),
                h('button', { class: 'icon-btn', title: tr('Platz leeren'), onclick: () => { shelf.slots[i] = null; draw(); } }, '🗑')),
            id === 'written_book' ? h('div', null,
                h('div', { class: 'grid-2' },
                    field(tr('Titel (max. 32 Zeichen)'), h('input', { type: 'text', maxlength: 32, value: b.title, oninput: ev => { b.title = ev.target.value; ch(); } })),
                    field(tr('Autor'), textInput(b, 'author', { ch, placeholder: tr('z. B. Server-Team') }))),
                h('div', { class: 'field-label', style: 'margin-bottom:6px' }, tr('Seiten'), infoBtn(HELP.bookPages, tr('Seiten'))), pagesBox) : null,
            id === 'writable_book' ? h('div', null, h('div', { class: 'field-label', style: 'margin-bottom:6px' }, tr('Seiten (noch bearbeitbar)')), pagesBox) : null,
            h('div', { class: 'row', style: 'margin-top:10px;flex-wrap:wrap' },
                h('button', { class: 'btn btn-small', onclick: () => openMobItemEditor(null, b, { noCount: true, onDone: draw }) },
                    id === 'enchanted_book' ? tr('Verzauberungen, Name & Beschreibung …') : tr('Name, Beschreibung & Glanz …')),
                b.ench.length ? h('span', { class: 'badge purple' }, b.ench.map(e => `${enchName(e.id)} ${roman(Number(e.lvl) || 1)}`).join(', ')) : null,
                b.name.text ? h('span', { class: 'badge gold' }, `„${b.name.text}“`) : null));
    }

    openModal({
        title: tr('Gemeißeltes Bücherregal bauen'), wide: true, body, iconEl: icon('chiseled_bookshelf', { eager: true }),
        foot: [
            h('button', { class: 'btn', onclick: () => { if (confirm(tr('Alle Bücher aus dem Regal entfernen?'))) { shelf = newShelf(); draw(); } } }, tr('Leeren')),
            h('button', { class: 'btn btn-primary', onclick: () => copyText(shelfCommand()) }, tr('Befehl kopieren'))
        ],
        onClose: saveShelf
    });
    draw();
}

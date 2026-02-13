// uiManager.js – korrigiert (keine doppelten Deklarationen)
import { mobDatabase, mobCategories } from './mobDatabase.js';

// Berufe-Übersetzung (Englisch → Deutsch)
const professionTranslations = {
    'armorer': 'Panzer Schmied',
    'butcher': 'Fleischer',
    'cartographer': 'Kartograf',
    'cleric': 'Geistlicher',
    'farmer': 'Bauer',
    'fisherman': 'Fischer',
    'fletcher': 'Pfeilmacher',
    'leatherworker': 'Gerber',
    'librarian': 'Bibliothekar',
    'mason': 'Steinmetz',
    'nitwit': 'Nichtsnutz',
    'shepherd': 'Schäfer',
    'toolsmith': 'Werkzeugschmied',
    'weaponsmith': 'Waffenschmied'
};

export function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.currentTarget.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            document.getElementById(`tab-${tab}`).classList.add('active');
        });
    });
}

export function populateMobDropdown(onChangeCallback) {
    const select = document.getElementById('mob-select');
    select.innerHTML = '';

    const categories = [
        { id: 'passive', name: '👤 Passiv' },
        { id: 'neutral', name: '⚔️ Neutral' },
        { id: 'hostile', name: '💀 Aggressiv' },
        { id: 'boss', name: '🔥 Boss' }
    ];

    categories.forEach(cat => {
        if (mobCategories[cat.id]?.length) {
            const group = document.createElement('optgroup');
            group.label = cat.name;
            mobCategories[cat.id].forEach(mobId => {
                const mob = mobDatabase[mobId];
                if (mob) {
                    const option = document.createElement('option');
                    option.value = mob.id;
                    option.textContent = mob.name;
                    group.appendChild(option);
                }
            });
            select.appendChild(group);
        }
    });

    select.addEventListener('change', (e) => {
        onChangeCallback(e.target.value);
    });
}

export function renderSpecificFields(mob) {
    const container = document.getElementById('mob-specific-options');
    container.innerHTML = '';

    if (!mob.specificFields?.length) {
        container.innerHTML = '<p class="placeholder">Keine spezifischen Optionen für diesen Mob.</p>';
        return;
    }

    const fieldsHtml = mob.specificFields.map(field => renderField(field)).join('');
    container.innerHTML = `<div class="form-grid">${fieldsHtml}</div>`;

    const enabled = document.getElementById('enableBehavior')?.checked || false;
    container.querySelectorAll('.mob-specific').forEach(el => {
        el.disabled = !enabled;
    });
}

// EINMALIGE Funktionsdeklaration (kein let/const davor)
function renderField(field) {
    const { name, type, label, min, max, step, default: defaultValue, options } = field;

    if (type === 'checkbox') {
        return `
            <div class="form-field checkbox">
                <input type="checkbox" id="${name}" class="mob-specific" ${defaultValue ? 'checked' : ''}>
                <label for="${name}">${label}</label>
            </div>
        `;
    } else if (type === 'select' && options) {
        let optionList = options;
        if (name === 'Profession') {
            optionList = options.map(opt => ({
                value: opt,
                label: professionTranslations[opt] || opt
            }));
        } else {
            optionList = options.map(opt => ({ value: opt, label: opt }));
        }
        const opts = optionList.map(opt => 
            `<option value="${opt.value}" ${defaultValue === opt.value ? 'selected' : ''}>${opt.label}</option>`
        ).join('');
        return `
            <div class="form-field">
                <label>${label}</label>
                <select id="${name}" class="mob-specific">
                    ${opts}
                </select>
            </div>
        `;
    } else {
        const minAttr = min !== undefined ? `min="${min}"` : '';
        const maxAttr = max !== undefined ? `max="${max}"` : '';
        const stepAttr = step !== undefined ? `step="${step}"` : '';
        const valueAttr = defaultValue !== undefined ? `value="${defaultValue}"` : 'value="0"';
        return `
            <div class="form-field">
                <label>${label}</label>
                <input type="number" id="${name}" class="mob-specific" ${minAttr} ${maxAttr} ${stepAttr} ${valueAttr}>
            </div>
        `;
    }
}

export function getSpecificFieldValues() {
    const enabled = document.getElementById('enableBehavior')?.checked || false;
    if (!enabled) return {};

    const values = {};
    document.querySelectorAll('#mob-specific-options .mob-specific').forEach(input => {
        const id = input.id;
        if (!id) return;
        if (input.type === 'checkbox') {
            values[id] = input.checked ? '1b' : '0b';
        } else if (input.type === 'number') {
            values[id] = input.value;
        } else if (input.tagName === 'SELECT') {
            values[id] = input.value !== 'none' ? `"${input.value}"` : null;
        }
    });
    return values;
}
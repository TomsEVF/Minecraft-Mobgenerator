// main.js – vollständig, mit Event-Delegation
import { loadAllMobs, setCurrentMob, mobDatabase } from './modules/mobDatabase.js';
import { loadItems } from './modules/itemDatabase.js';
import { initTabs, populateMobDropdown, renderSpecificFields, getSpecificFieldValues } from './modules/uiManager.js';
import { initTradeUI, getTradeRecipes } from './modules/tradeManager.js';
import { buildCommand } from './modules/commandBuilder.js';
import { setupCopyButton } from './modules/copyHelper.js';

window.appState = { currentMobId: 'villager' };

async function initApp() {
    initTabs();
    await loadAllMobs();
    await loadItems();

    populateMobDropdown((mobId) => {
        window.appState.currentMobId = mobId;
        setCurrentMob(mobId);
        updateUIForMob();
        generateCommand();
    });

    const defaultMob = mobDatabase['villager'] ? 'villager' : Object.keys(mobDatabase)[0];
    if (defaultMob) {
        window.appState.currentMobId = defaultMob;
        setCurrentMob(defaultMob);
        document.getElementById('mob-select').value = defaultMob;
        updateUIForMob();
    }

    document.getElementById('generateBtn').addEventListener('click', generateCommand);
    setupCopyButton('copyBtn', 'commandOutput');

    // Live-Generierung bei allen Eingaben
    document.querySelector('.main-layout').addEventListener('input', generateCommand);
    document.querySelector('.main-layout').addEventListener('change', generateCommand);

    setupNoAIBehavior();
    setupTabEnabling();
    setupBehaviorToggle();
    setupColorPickerSync();

    generateCommand();
}

// ------------------------------------------------------------
// Aktivierungs-Checkboxen
function setupTabEnabling() {
    setupToggle('enableAttributes', '#tab-attributes input, #tab-attributes select');
    setupToggle('enableEquipment', '#tab-equipment input', true);
    setupToggle('enableAdvanced', '#advanced-grid input, #advanced-grid select, #advanced-grid textarea');
}
function setupToggle(id, selector, defaultChecked = false) {
    const cb = document.getElementById(id);
    if (!cb) return;
    if (defaultChecked) cb.checked = true;
    const toggle = () => {
        document.querySelectorAll(selector).forEach(el => el.disabled = !cb.checked);
    };
    cb.addEventListener('change', toggle);
    toggle();
}
function setupBehaviorToggle() {
    const cb = document.getElementById('enableBehavior');
    if (!cb) return;
    const toggle = () => {
        document.querySelectorAll('#mob-specific-options .mob-specific').forEach(el => el.disabled = !cb.checked);
    };
    cb.addEventListener('change', toggle);
}

// NoAI + Rotation
function setupNoAIBehavior() {
    const noai = document.getElementById('noai');
    const rot = document.getElementById('rotation');
    const pitch = document.getElementById('pitch');
    if (!noai || !rot || !pitch) return;
    const toggle = () => {
        const enabled = noai.checked;
        rot.disabled = !enabled;
        pitch.disabled = !enabled;
        if (enabled) {
            rot.classList.add('rotation-field');
            pitch.classList.add('rotation-field');
        } else {
            rot.classList.remove('rotation-field');
            pitch.classList.remove('rotation-field');
        }
    };
    noai.addEventListener('change', toggle);
    toggle();
}

// Farbsync
function setupColorPickerSync() {
    const picker = document.getElementById('nameColor');
    const hex = document.getElementById('nameColorHex');
    if (!picker || !hex) return;
    picker.addEventListener('input', () => hex.value = picker.value);
    hex.addEventListener('input', () => {
        if (/^#[0-9A-F]{6}$/i.test(hex.value)) picker.value = hex.value;
    });
    hex.value = picker.value;
}

// UI bei Mob-Wechsel
function updateUIForMob() {
    const mob = mobDatabase[window.appState.currentMobId];
    if (!mob) return;
    renderSpecificFields(mob);
    initTradeUI(mob.supportsTrades || false);
    setupNoAIBehavior(); // NoAI-Zustand neu setzen
}

// Werte sammeln
function collectBasicValues() {
    return {
        name: document.getElementById('name')?.value || '',
        nameColor: document.getElementById('nameColorHex')?.value || '#FFFFFF',
        health: parseFloat(document.getElementById('health')?.value) || 20,
        rotation: parseFloat(document.getElementById('rotation')?.value) || 0,
        pitch: parseFloat(document.getElementById('pitch')?.value) || 0
    };
}
function collectAttributeValues() {
    if (!document.getElementById('enableAttributes')?.checked) return {};
    return {
        speed: document.getElementById('speed')?.value,
        armor: document.getElementById('armor')?.value,
        attackDamage: document.getElementById('attackDamage')?.value,
        followRange: document.getElementById('followRange')?.value,
        jumpStrength: document.getElementById('jumpStrength')?.value
    };
}
function collectEquipmentValues() {
    if (!document.getElementById('enableEquipment')?.checked) return {};
    return {
        helmet: document.getElementById('helmet')?.value,
        chestplate: document.getElementById('chestplate')?.value,
        leggings: document.getElementById('leggings')?.value,
        boots: document.getElementById('boots')?.value,
        mainhand: document.getElementById('mainhand')?.value,
        offhand: document.getElementById('offhand')?.value,
        dropChance: document.getElementById('handDropChance')?.value || '0.085'
    };
}
function collectAdvancedValues() {
    const enabled = document.getElementById('enableAdvanced')?.checked || false;
    return {
        persistent: enabled && document.getElementById('persistent')?.checked,
        silent: enabled && document.getElementById('silent')?.checked,
        invulnerable: enabled && document.getElementById('invulnerable')?.checked,
        noai: enabled && document.getElementById('noai')?.checked,
        customNBT: enabled ? document.getElementById('customNBT')?.value : ''
    };
}

// Befehl generieren
function generateCommand() {
    const mob = mobDatabase[window.appState.currentMobId];
    if (!mob) return;
    const basic = collectBasicValues();
    const attributes = collectAttributeValues();
    const equipment = collectEquipmentValues();
    const advanced = collectAdvancedValues();
    const specific = getSpecificFieldValues();
    const trades = mob.supportsTrades ? getTradeRecipes() : [];

    const command = buildCommand(mob, { basic, attributes, equipment, advanced, specific, trades });
    document.getElementById('commandOutput').value = command;
}

// Start
initApp();
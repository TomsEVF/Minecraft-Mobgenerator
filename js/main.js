// Hauptmodul – koordiniert Daten laden, UI bauen, Event-Listener

import { loadAllMobs, getCurrentMob, setCurrentMob, mobDatabase } from './modules/mobDatabase.js';
import { initTabs, populateMobDropdown, renderSpecificFields, getSpecificFieldValues } from './modules/uiManager.js';
import { initTradeUI, getTradeRecipes } from './modules/tradeManager.js';
import { buildCommand } from './modules/commandBuilder.js';
import { setupCopyButton } from './modules/copyHelper.js';

// Globale App-Zustandsvariable (für einfachen Zugriff in anderen Modulen)
window.appState = {
    currentMobId: 'villager'
};

// Initialisierung
async function initApp() {
    // 1. Mob-Daten laden
    await loadAllMobs();
    await loadItems();

    // 2. Tabs initialisieren
    initTabs();

    // 3. Dropdown füllen
    populateMobDropdown((mobId) => {
        window.appState.currentMobId = mobId;
        setCurrentMob(mobId);
        updateUIForMob();
        generateCommand();
    });

    setupNoAIBehavior();


    // 4. Start-Mob setzen
    const defaultMob = mobDatabase['villager'] ? 'villager' : Object.keys(mobDatabase)[0];
    window.appState.currentMobId = defaultMob;
    setCurrentMob(defaultMob);
    document.getElementById('mob-select').value = defaultMob;

    // 5. UI für den Start-Mob rendern
    updateUIForMob();

    // 6. Buttons
    document.getElementById('generateBtn').addEventListener('click', generateCommand);
    setupCopyButton('copyBtn', 'commandOutput');

    // 7. Live-Update auf allen Inputs
    attachLiveListeners();


    // 🧠 NoAI steuert Rotationseingaben (aktiv nur bei NoAI)
    function setupNoAIBehavior() {
        const noaiCheckbox = document.getElementById('noai');
        const rotationInput = document.getElementById('rotation');
        const pitchInput = document.getElementById('pitch');
        
        if (!noaiCheckbox || !rotationInput || !pitchInput) return;

        // Initial: NoAI aus → Felder deaktiviert, keine Klasse
        rotationInput.disabled = true;
        pitchInput.disabled = true;
        rotationInput.classList.remove('rotation-field');
        pitchInput.classList.remove('rotation-field');

        function toggleRotationFields() {
            const enabled = noaiCheckbox.checked;
            
            // Aktiv/Deaktiviert umschalten
            rotationInput.disabled = !enabled;
            pitchInput.disabled = !enabled;
            
            // Klasse nur hinzufügen, wenn enabled (schwarzer Hintergrund)
            if (enabled) {
                rotationInput.classList.add('rotation-field');
                pitchInput.classList.add('rotation-field');
            } else {
                rotationInput.classList.remove('rotation-field');
                pitchInput.classList.remove('rotation-field');
            }
        }

        noaiCheckbox.addEventListener('change', toggleRotationFields);
    }

    // Diese Funktion in initApp() aufrufen
    setupNoAIBehavior();

    // 8. Ersten Befehl generieren
    generateCommand();
}

// Aktualisiert Behavior- und Trade-Tab basierend auf aktuellem Mob
function updateUIForMob() {
    const mob = mobDatabase[window.appState.currentMobId];
    if (!mob) return;

    // Spezifische Felder rendern
    renderSpecificFields(mob);

    // Trade-UI rendern, falls unterstützt
    initTradeUI(mob.supportsTrades || false);
}

// Live-Listener für alle Eingabefelder
function attachLiveListeners() {
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(el => {
        el.removeEventListener('input', generateCommand);
        el.removeEventListener('change', generateCommand);
        el.addEventListener('input', generateCommand);
        el.addEventListener('change', generateCommand);
    });
}

// Command generieren (Wrapper)
function generateCommand() {
    const mob = mobDatabase[window.appState.currentMobId];
    if (!mob) return;

    // Sammle Werte aus allen Tabs
    const basic = collectBasicValues();
    const attributes = collectAttributeValues();
    const equipment = collectEquipmentValues();
    const advanced = collectAdvancedValues();
    const specific = getSpecificFieldValues();
    const trades = mob.supportsTrades ? getTradeRecipes() : [];

    const command = buildCommand(mob, {
        basic,
        attributes,
        equipment,
        advanced,
        specific,
        trades
    });

    document.getElementById('commandOutput').value = command;
}

// Hilfsfunktionen zum Einsammeln der UI-Werte
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
    return {
        speed: document.getElementById('speed')?.value,
        armor: document.getElementById('armor')?.value,
        attackDamage: document.getElementById('attackDamage')?.value,
        followRange: document.getElementById('followRange')?.value,
        jumpStrength: document.getElementById('jumpStrength')?.value
    };
}

function collectEquipmentValues() {
    return {
        helmet: document.getElementById('helmet')?.value,
        chestplate: document.getElementById('chestplate')?.value,
        leggings: document.getElementById('leggings')?.value,
        boots: document.getElementById('boots')?.value,
        mainhand: document.getElementById('mainhand')?.value,
        offhand: document.getElementById('offhand')?.value,
        dropChance: parseFloat(document.getElementById('handDropChance')?.value) || 0.085
    };
}

function collectAdvancedValues() {
    return {
        persistent: document.getElementById('persistent')?.checked || false,
        silent: document.getElementById('silent')?.checked || false,
        invulnerable: document.getElementById('invulnerable')?.checked || false,
        noai: document.getElementById('noai')?.checked || false,
        customNBT: document.getElementById('customNBT')?.value,
        syntaxVersion: document.getElementById('syntaxVersion')?.value || '1.20.5'
    };
}

// Start
initApp();
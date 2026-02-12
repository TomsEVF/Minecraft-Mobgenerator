// Trade-Manager – komplette Handels-UI inkl. buyB und Legacy-Support

let globalMaxUses = 999999;
let globalXP = 2;
let globalPriceMultiplier = 0.1;

export function initTradeUI(supportsTrades) {
    const container = document.getElementById('trade-container');
    container.innerHTML = '';

    if (!supportsTrades) {
        container.innerHTML = '<p class="placeholder">Dieser Mob unterstützt keine Handelsangebote.</p>';
        return;
    }

    container.innerHTML = generateTradeLayout();
    attachTradeListeners();
    addTrade(false); // Einen Standard-Trade hinzufügen
}

function generateTradeLayout() {
    return `
        <div id="tradeList" class="trade-list"></div>
        <div style="display: flex; gap: 12px; margin-top: 20px;">
            <button id="addTradeBtn" class="btn" style="background: #3b82f6; color: white;">➕ Trade hinzufügen</button>
            <button id="addTwoItemTradeBtn" class="btn" style="background: #8b5cf6; color: white;">🔄 2-Item-Trade</button>
        </div>
        <div style="margin-top: 20px; background: #f9fafb; padding: 16px; border-radius: 10px;">
            <h4 style="margin-bottom: 12px;">⚙️ Globale Trade-Einstellungen</h4>
            <div style="display: grid; grid-template-columns: repeat(3,1fr); gap: 16px;">
                <div>
                    <label>📊 Max Nutzungen</label>
                    <input type="number" id="globalMaxUses" value="999999" min="1" max="999999">
                </div>
                <div>
                    <label>💰 Erfahrung pro Trade</label>
                    <input type="number" id="globalTradeXP" value="2" min="0" max="999">
                </div>
                <div>
                    <label>🔄 Preis-Multiplikator</label>
                    <input type="number" id="globalPriceMultiplier" value="0.1" min="0" max="1" step="0.05">
                </div>
            </div>
        </div>
    `;
}

function attachTradeListeners() {
    document.getElementById('addTradeBtn')?.addEventListener('click', () => addTrade(false));
    document.getElementById('addTwoItemTradeBtn')?.addEventListener('click', () => addTrade(true));

    // Entfernen-Buttons (Event-Delegation)
    document.getElementById('tradeList')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-trade')) {
            e.target.closest('.trade-item').remove();
            // Command-Update wird über Live-Listener ausgelöst
        }
    });

    // Globale Werte speichern
    document.getElementById('globalMaxUses')?.addEventListener('input', (e) => globalMaxUses = e.target.value);
    document.getElementById('globalTradeXP')?.addEventListener('input', (e) => globalXP = e.target.value);
    document.getElementById('globalPriceMultiplier')?.addEventListener('input', (e) => globalPriceMultiplier = e.target.value);
}

export function addTrade(twoItem = false) {
    const list = document.getElementById('tradeList');
    if (!list) return;

    const tradeItem = document.createElement('div');
    tradeItem.className = 'trade-item';
    tradeItem.style = 'background: #f9fafb; padding: 16px; border-radius: 10px; margin-bottom: 12px; border: 1px solid #e2e8f0;';

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-weight: 600;">🛍️ Trade</span>
            <button class="remove-trade" style="background: #fee2e2; border: none; border-radius: 6px; padding: 6px 12px; cursor: pointer;">✕ Entfernen</button>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 12px;">
            <div>
                <label style="font-size: 12px;">💰 Smaragde</label>
                <input type="number" class="trade-emerald" value="1" min="1" max="64" style="width:100%;">
            </div>
            <div>
                <label style="font-size: 12px;">🪄 Item ID</label>
                <input type="text" class="trade-item" value="minecraft:diamond" style="width:100%;">
            </div>
            <div>
                <label style="font-size: 12px;">📦 Menge</label>
                <input type="number" class="trade-count" value="1" min="1" max="64" style="width:100%;">
            </div>
        </div>
    `;

    if (twoItem) {
        html += `
            <div style="margin-top: 16px; border-top: 1px dashed #cbd5e1; padding-top: 16px;">
                <h5 style="font-size: 14px; margin-bottom: 12px; color: #6b21a8;">➕ Zweites Eingabe-Item (buyB)</h5>
                <div style="display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 12px;">
                    <div>
                        <label style="font-size: 12px;">💰 Item 2 ID</label>
                        <input type="text" class="trade-itemB" value="minecraft:iron_ingot" style="width:100%;">
                    </div>
                    <div>
                        <label style="font-size: 12px;">📦 Menge</label>
                        <input type="number" class="trade-countB" value="1" min="1" max="64" style="width:100%;">
                    </div>
                    <div></div>
                </div>
            </div>
        `;
    }

    html += `
        <div style="margin-top: 16px; display: grid; grid-template-columns: repeat(3,1fr); gap: 12px;">
            <div>
                <label style="font-size: 12px;">📊 Max Nutzungen</label>
                <input type="number" class="trade-maxUses" value="" placeholder="Global" style="width:100%;">
            </div>
            <div>
                <label style="font-size: 12px;">💰 Erfahrung</label>
                <input type="number" class="trade-xp" value="" placeholder="Global" style="width:100%;">
            </div>
            <div>
                <label style="font-size: 12px;">🔄 Multiplikator</label>
                <input type="number" class="trade-priceMultiplier" value="" placeholder="Global" step="0.05" min="0" max="1" style="width:100%;">
            </div>
        </div>
    `;

    tradeItem.innerHTML = html;
    list.appendChild(tradeItem);
}

// Sammle alle Trades und formatiere sie als NBT-Recipes
export function getTradeRecipes() {
    const version = document.getElementById('syntaxVersion')?.value || '1.20.5';
    const useModern = version >= '1.20.5';

    const globalMaxUses = document.getElementById('globalMaxUses')?.value || '999999';
    const globalXP = document.getElementById('globalTradeXP')?.value || '2';
    const globalMultiplier = document.getElementById('globalPriceMultiplier')?.value || '0.1';

    const tradeItems = document.querySelectorAll('.trade-item');
    const recipes = [];

    tradeItems.forEach(item => {
        const emerald = item.querySelector('.trade-emerald')?.value || '1';
        const tradeItem = item.querySelector('.trade-item')?.value || 'minecraft:diamond';
        const count = item.querySelector('.trade-count')?.value || '1';

        const maxUses = item.querySelector('.trade-maxUses')?.value || globalMaxUses;
        const xp = item.querySelector('.trade-xp')?.value || globalXP;
        const priceMultiplier = item.querySelector('.trade-priceMultiplier')?.value || globalMultiplier;

        // buy
        let buy;
        if (useModern) buy = `{id:"minecraft:emerald",count:${emerald}}`;
        else buy = `{id:"minecraft:emerald",Count:${emerald}b}`;

        // buyB (optional)
        let buyB = '';
        const itemB = item.querySelector('.trade-itemB')?.value;
        const countB = item.querySelector('.trade-countB')?.value;
        if (itemB && countB) {
            if (useModern) buyB = `,buyB:{id:"${itemB}",count:${countB}}`;
            else buyB = `,buyB:{id:"${itemB}",Count:${countB}b}`;
        }

        // sell
        let sell;
        if (useModern) sell = `{id:"${tradeItem}",count:${count}}`;
        else sell = `{id:"${tradeItem}",Count:${count}b}`;

        recipes.push(`{maxUses:${maxUses},buy:${buy}${buyB},sell:${sell},xp:${xp},priceMultiplier:${priceMultiplier}f}`);
    });

    return recipes;
}
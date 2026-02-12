// Trade-Manager – komplette Handels-UI mit flexiblen Items

import { createItemDatalist, createItemInput, itemList } from './itemDatabase.js';

let globalMaxUses = 999999;
let globalXP = 2;
let globalPriceMultiplier = 0.1;
let datalistCounter = 0;

export async function initTradeUI(supportsTrades) {
    const container = document.getElementById('trade-container');
    container.innerHTML = '';

    if (!supportsTrades) {
        container.innerHTML = '<p class="placeholder">Dieser Mob unterstützt keine Handelsangebote.</p>';
        return;
    }

    // Stelle sicher, dass Items geladen sind
    if (itemList.length === 0) {
        await import('./itemDatabase.js').then(mod => mod.loadItems());
    }

    container.innerHTML = generateTradeLayout();
    attachTradeListeners();
    addTrade(false); // Standard-Trade
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

    document.getElementById('tradeList')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-trade')) {
            e.target.closest('.trade-item').remove();
        }
    });

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

    // Eindeutige Datalist-IDs für dieses Trade-Item
    const buyDatalistId = `items-buy-${datalistCounter++}`;
    const sellDatalistId = `items-sell-${datalistCounter++}`;
    const buyBDatalistId = twoItem ? `items-buyB-${datalistCounter++}` : null;

    // Datalists erzeugen
    const buyDatalist = createItemDatalist(buyDatalistId);
    const sellDatalist = createItemDatalist(sellDatalistId);
    const buyBDatalist = twoItem ? createItemDatalist(buyBDatalistId) : null;

    // HTML aufbauen
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-weight: 600;">🛍️ Trade</span>
            <button class="remove-trade" style="background: #fee2e2; border: none; border-radius: 6px; padding: 6px 12px; cursor: pointer;">✕ Entfernen</button>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 12px;">
            <div>
                <label style="font-size: 12px;">💰 Menge (Buy)</label>
                <input type="number" class="trade-buy-count" value="1" min="1" max="64" style="width:100%;">
            </div>
            <div>
                <label style="font-size: 12px;">🪄 Item (Buy)</label>
                <input type="text" class="trade-buy-item" value="minecraft:emerald" placeholder="minecraft:item" list="${buyDatalistId}" style="width:100%;">
            </div>
            <div></div>
        </div>
    `;

    if (twoItem) {
        html += `
            <div style="margin-top: 16px; border-top: 1px dashed #cbd5e1; padding-top: 16px;">
                <h5 style="font-size: 14px; margin-bottom: 12px; color: #6b21a8;">➕ Zweites Eingabe-Item (buyB)</h5>
                <div style="display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 12px;">
                    <div>
                        <label style="font-size: 12px;">💰 Menge (BuyB)</label>
                        <input type="number" class="trade-buyB-count" value="1" min="1" max="64" style="width:100%;">
                    </div>
                    <div>
                        <label style="font-size: 12px;">🪄 Item (BuyB)</label>
                        <input type="text" class="trade-buyB-item" value="minecraft:iron_ingot" placeholder="minecraft:item" list="${buyBDatalistId}" style="width:100%;">
                    </div>
                    <div></div>
                </div>
            </div>
        `;
    }

    html += `
        <div style="margin-top: 16px; display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 12px;">
            <div>
                <label style="font-size: 12px;">📦 Menge (Sell)</label>
                <input type="number" class="trade-sell-count" value="1" min="1" max="64" style="width:100%;">
            </div>
            <div>
                <label style="font-size: 12px;">🪄 Item (Sell)</label>
                <input type="text" class="trade-sell-item" value="minecraft:diamond" placeholder="minecraft:item" list="${sellDatalistId}" style="width:100%;">
            </div>
            <div></div>
        </div>
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

    // Datalists hinzufügen
    tradeItem.appendChild(buyDatalist);
    tradeItem.appendChild(sellDatalist);
    if (buyBDatalist) tradeItem.appendChild(buyBDatalist);

    list.appendChild(tradeItem);
}

export function getTradeRecipes() {
    const version = document.getElementById('syntaxVersion')?.value || '1.20.5';
    const useModern = version >= '1.20.5';

    const globalMaxUses = document.getElementById('globalMaxUses')?.value || '999999';
    const globalXP = document.getElementById('globalTradeXP')?.value || '2';
    const globalMultiplier = document.getElementById('globalPriceMultiplier')?.value || '0.1';

    const tradeItems = document.querySelectorAll('.trade-item');
    const recipes = [];

    tradeItems.forEach(item => {
        // Buy
        const buyItem = item.querySelector('.trade-buy-item')?.value || 'minecraft:emerald';
        const buyCount = item.querySelector('.trade-buy-count')?.value || '1';
        
        // Sell
        const sellItem = item.querySelector('.trade-sell-item')?.value || 'minecraft:diamond';
        const sellCount = item.querySelector('.trade-sell-count')?.value || '1';

        // Optional buyB
        let buyB = '';
        const buyBItem = item.querySelector('.trade-buyB-item')?.value;
        const buyBCount = item.querySelector('.trade-buyB-count')?.value;
        if (buyBItem && buyBCount) {
            if (useModern) {
                buyB = `,buyB:{id:"${buyBItem}",count:${buyBCount}}`;
            } else {
                buyB = `,buyB:{id:"${buyBItem}",Count:${buyBCount}b}`;
            }
        }

        const maxUses = item.querySelector('.trade-maxUses')?.value || globalMaxUses;
        const xp = item.querySelector('.trade-xp')?.value || globalXP;
        const priceMultiplier = item.querySelector('.trade-priceMultiplier')?.value || globalMultiplier;

        // buy und sell mit korrekter Syntax
        let buy, sell;
        if (useModern) {
            buy = `{id:"${buyItem}",count:${buyCount}}`;
            sell = `{id:"${sellItem}",count:${sellCount}}`;
        } else {
            buy = `{id:"${buyItem}",Count:${buyCount}b}`;
            sell = `{id:"${sellItem}",Count:${sellCount}b}`;
        }

        recipes.push(`{maxUses:${maxUses},buy:${buy}${buyB},sell:${sell},xp:${xp},priceMultiplier:${priceMultiplier}f}`);
    });

    return recipes;
}
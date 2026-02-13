// tradeManager.js – NUR Count:1b, KEINE Komponenten
import { createItemDatalist, itemList } from './itemDatabase.js';

let globalMaxUses = 999999;
let globalXP = 2;
let globalPriceMultiplier = 0.1;
let datalistCounter = 0;

export async function initTradeUI(supportsTrades) {
    const container = document.getElementById('trade-container');
    container.innerHTML = '';
    if (!supportsTrades) {
        container.innerHTML = '<p class="placeholder">Keine Trades</p>';
        return;
    }
    if (itemList.length === 0) await import('./itemDatabase.js').then(mod => mod.loadItems());
    datalistCounter = 0;
    container.innerHTML = generateTradeLayout();
    attachTradeListeners();
    addTrade(false);
}

function generateTradeLayout() {
    return `
        <div id="tradeList" class="trade-list"></div>
        <div style="display: flex; gap: 12px; margin-top: 20px;">
            <button id="addTradeBtn" class="btn btn-trade-add">➕ Trade</button>
            <button id="addTwoItemTradeBtn" class="btn btn-trade-special">🔄 2-Item-Trade</button>
        </div>
        <div class="trade-settings-grid">
            <div><label>Max Uses</label><input type="number" id="globalMaxUses" value="999999"></div>
            <div><label>XP</label><input type="number" id="globalTradeXP" value="2"></div>
            <div><label>Multiplier</label><input type="number" id="globalPriceMultiplier" value="0.1" step="0.05"></div>
        </div>
    `;
}

function attachTradeListeners() {
    document.getElementById('addTradeBtn')?.addEventListener('click', () => addTrade(false));
    document.getElementById('addTwoItemTradeBtn')?.addEventListener('click', () => addTrade(true));
    document.getElementById('tradeList')?.addEventListener('click', e => {
        if (e.target.classList.contains('trade-remove-btn')) e.target.closest('.trade-item').remove();
    });
    document.getElementById('globalMaxUses')?.addEventListener('input', e => globalMaxUses = e.target.value);
    document.getElementById('globalTradeXP')?.addEventListener('input', e => globalXP = e.target.value);
    document.getElementById('globalPriceMultiplier')?.addEventListener('input', e => globalPriceMultiplier = e.target.value);
}

export function addTrade(twoItem = false) {
    const list = document.getElementById('tradeList');
    if (!list) return;
    const tradeItem = document.createElement('div');
    tradeItem.className = 'trade-item';
    const buyDatalistId = `items-buy-${datalistCounter++}`;
    const sellDatalistId = `items-sell-${datalistCounter++}`;
    const buyBDatalistId = twoItem ? `items-buyB-${datalistCounter++}` : null;
    const buyDatalist = createItemDatalist(buyDatalistId);
    const sellDatalist = createItemDatalist(sellDatalistId);
    const buyBDatalist = twoItem ? createItemDatalist(buyBDatalistId) : null;

    let html = `
        <div class="trade-item-header">
            <span>Trade</span>
            <button class="trade-remove-btn">✕</button>
        </div>
        <div class="trade-grid">
            <div><label>Menge Buy</label><input type="number" class="trade-buy-count" value="1" min="1" max="64"></div>
            <div><label>Item Buy</label><input type="text" class="trade-buy-item" value="minecraft:emerald" list="${buyDatalistId}"></div>
            <div></div>
        </div>
    `;
    if (twoItem) {
        html += `
            <div class="trade-buyB-section">
                <div>Zweites Item</div>
                <div class="trade-grid">
                    <div><label>Menge</label><input type="number" class="trade-buyB-count" value="1" min="1" max="64"></div>
                    <div><label>Item</label><input type="text" class="trade-buyB-item" value="minecraft:iron_ingot" list="${buyBDatalistId}"></div>
                    <div></div>
                </div>
            </div>
        `;
    }
    html += `
        <div class="trade-grid" style="margin-top:16px;">
            <div><label>Menge Sell</label><input type="number" class="trade-sell-count" value="1" min="1" max="64"></div>
            <div><label>Item Sell</label><input type="text" class="trade-sell-item" value="minecraft:diamond" list="${sellDatalistId}"></div>
            <div></div>
        </div>
        <div class="trade-grid" style="margin-top:16px;">
            <div><label>Max Uses</label><input type="number" class="trade-maxUses" placeholder="Global"></div>
            <div><label>XP</label><input type="number" class="trade-xp" placeholder="Global"></div>
            <div><label>Multiplier</label><input type="number" class="trade-priceMultiplier" placeholder="Global" step="0.05"></div>
        </div>
    `;
    tradeItem.innerHTML = html;
    tradeItem.appendChild(buyDatalist);
    tradeItem.appendChild(sellDatalist);
    if (buyBDatalist) tradeItem.appendChild(buyBDatalist);
    list.appendChild(tradeItem);
}

export function getTradeRecipes() {
    const globalMaxUses = document.getElementById('globalMaxUses')?.value || '999999';
    const globalXP = document.getElementById('globalTradeXP')?.value || '2';
    const globalMultiplier = document.getElementById('globalPriceMultiplier')?.value || '0.1';
    const recipes = [];
    document.querySelectorAll('.trade-item').forEach(item => {
        const buyItem = item.querySelector('.trade-buy-item')?.value || 'minecraft:emerald';
        const buyCount = item.querySelector('.trade-buy-count')?.value || '1';
        const sellItem = item.querySelector('.trade-sell-item')?.value || 'minecraft:diamond';
        const sellCount = item.querySelector('.trade-sell-count')?.value || '1';
        let buyB = '';
        const buyBItem = item.querySelector('.trade-buyB-item')?.value;
        const buyBCount = item.querySelector('.trade-buyB-count')?.value;
        if (buyBItem && buyBCount) buyB = `,buyB:{id:"${buyBItem}",Count:${buyBCount}b}`;
        const maxUses = item.querySelector('.trade-maxUses')?.value || globalMaxUses;
        const xp = item.querySelector('.trade-xp')?.value || globalXP;
        const priceMultiplier = item.querySelector('.trade-priceMultiplier')?.value || globalMultiplier;
        recipes.push(`{maxUses:${maxUses},buy:{id:"${buyItem}",Count:${buyCount}b}${buyB},sell:{id:"${sellItem}",Count:${sellCount}b},xp:${xp},priceMultiplier:${priceMultiplier}f}`);
    });
    return recipes;
}
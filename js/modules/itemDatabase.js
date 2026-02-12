// Item-Datenbank – lädt Items und erzeugt Datalist-HTML

export let itemList = [];

export async function loadItems() {
    try {
        const response = await fetch('data/items.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        itemList = await response.json();
        console.log(`✅ ${itemList.length} Items geladen.`);
    } catch (error) {
        console.warn('⚠️ Konnte items.json nicht laden, verwende Fallback-Items.', error);
        // Fallback-Items (minimal)
        itemList = [
            'minecraft:emerald',
            'minecraft:diamond',
            'minecraft:iron_ingot',
            'minecraft:gold_ingot',
            'minecraft:netherite_ingot',
            'minecraft:stick'
        ];
    }
}

// Generiert ein <datalist> mit allen Items
export function createItemDatalist(datalistId) {
    const datalist = document.createElement('datalist');
    datalist.id = datalistId;
    
    itemList.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        datalist.appendChild(option);
    });
    
    return datalist;
}

// Erzeugt ein Input-Feld mit zugehörigem Datalist
export function createItemInput(name, value = 'minecraft:emerald', datalistId, placeholder = 'minecraft:item') {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = name;
    input.value = value;
    input.placeholder = placeholder;
    input.setAttribute('list', datalistId);
    return input;
}
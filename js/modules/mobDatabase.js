// mobDatabase.js – mit Fallback und korrekter Deklaration von currentMobId
export let mobDatabase = {};
export let mobCategories = {};

let currentMobId = 'villager'; // <-- diese Zeile war möglicherweise gelöscht

const MOB_REGISTER_URL = 'data/mobs.json';

// Fallback-Mobs, falls Fetch fehlschlägt
const FALLBACK_MOBS = {
    villager: {
        id: 'villager',
        name: 'Dorfbewohner',
        category: 'passive',
        supportsTrades: true,
        defaultName: 'Dorfbewohner',
        specificFields: []
    },
    zombie: {
        id: 'zombie',
        name: 'Zombie',
        category: 'hostile',
        supportsTrades: false,
        defaultName: 'Zombie',
        specificFields: []
    }
};

export async function loadAllMobs() {
    try {
        const res = await fetch(MOB_REGISTER_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const registry = await res.json();

        const categoryPromises = Object.entries(registry).map(async ([category, file]) => {
            const catRes = await fetch(file);
            if (!catRes.ok) throw new Error(`Fehler beim Laden von ${file}`);
            const mobs = await catRes.json();
            return { category, mobs };
        });

        const categoriesData = await Promise.all(categoryPromises);

        categoriesData.forEach(({ category, mobs }) => {
            mobCategories[category] = mobs.map(m => m.id);
            mobs.forEach(mob => {
                mobDatabase[mob.id] = mob;
            });
        });

        console.log(`✅ ${Object.keys(mobDatabase).length} Mobs geladen.`);
    } catch (error) {
        console.error('❌ Fehler beim Laden – verwende Fallback-Mobs:', error);
        mobDatabase = { ...FALLBACK_MOBS };
        mobCategories = {
            passive: ['villager'],
            hostile: ['zombie']
        };
    }
}

export function getCurrentMob() {
    return mobDatabase[currentMobId];
}

export function setCurrentMob(id) {
    if (mobDatabase[id]) {
        currentMobId = id;
    }
}

export function getMobById(id) {
    return mobDatabase[id];
}
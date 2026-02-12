// Mob-Datenbank – lädt alle JSONs und stellt sie bereit

export let mobDatabase = {};        // id → mob-Objekt
export let mobCategories = {};      // Kategorie → Array von IDs

let currentMobId = 'villager';

// Zentrale Mob-Liste (Register)
const MOB_REGISTER_URL = 'data/mobs.json';

export async function loadAllMobs() {
    try {
        // 1. Register laden
        const res = await fetch(MOB_REGISTER_URL);
        const registry = await res.json();

        // 2. Alle Kategorie-Dateien parallel laden
        const categoryPromises = Object.entries(registry).map(async ([category, file]) => {
            const catRes = await fetch(file);
            const mobs = await catRes.json();
            return { category, mobs };
        });

        const categoriesData = await Promise.all(categoryPromises);

        // 3. Daten in die internen Strukturen überführen
        categoriesData.forEach(({ category, mobs }) => {
            mobCategories[category] = mobs.map(m => m.id);
            mobs.forEach(mob => {
                mobDatabase[mob.id] = mob;
            });
        });

        console.log(`✅ ${Object.keys(mobDatabase).length} Mobs geladen.`);
    } catch (error) {
        console.error('❌ Fehler beim Laden der Mob-Daten:', error);
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

export function getAllMobs() {
    return mobDatabase;
}

export function getMobsByCategory(category) {
    const ids = mobCategories[category] || [];
    return ids.map(id => mobDatabase[id]).filter(Boolean);
}
// Mob-Datenbank – lädt alle JSONs und stellt sie bereit

export let mobDatabase = {};        // id → mob-Objekt
export let mobCategories = {};      // Kategorie → Array von IDs

let currentMobId = 'villager';

const MOB_REGISTER_URL = 'data/mobs.json';

export async function loadAllMobs() {
    try {
        const res = await fetch(MOB_REGISTER_URL);
        const registry = await res.json();

        const categoryPromises = Object.entries(registry).map(async ([category, file]) => {
            const catRes = await fetch(file);
            const mobs = await catRes.json();
            return { category, mobs };
        });

        const categoriesData = await Promise.all(categoryPromises);

        categoriesData.forEach(({ category, mobs }) => {
            mobCategories[category] = mobs.map(m => m.id);
            mobs.forEach(mob => {
                if (mobDatabase[mob.id]) {
                    console.warn(`⚠️ Duplicate mob ID "${mob.id}" überschrieben. Letzte Definition aus ${category} gewinnt.`);
                }
                mobDatabase[mob.id] = mob;
            });
        });

        console.log(`✅ ${Object.keys(mobDatabase).length} einzigartige Mobs geladen.`);
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
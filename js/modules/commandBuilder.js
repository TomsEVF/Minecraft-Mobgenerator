// commandBuilder.js – 1.21.1 NBT, immer gültiger Beruf & Level ≥2
export function buildCommand(mob, data) {
    const { basic, attributes, equipment, advanced, specific, trades } = data;
    const parts = [];

    // Name
    if (basic.name && basic.name.trim() !== '') {
        parts.push(`CustomName:'{"text":"${basic.name}","color":"${basic.nameColor}"}'`);
    }

    // Health
    if (basic.health !== 20) parts.push(`Health:${basic.health}f`);

    // NoAI und Rotation (nur wenn NoAI aktiv)
    if (advanced.noai) {
        parts.push(`NoAI:1b`);
        const rot = isNaN(basic.rotation) ? 0 : basic.rotation;
        const pitch = isNaN(basic.pitch) ? 0 : basic.pitch;
        parts.push(`Rotation:[${rot}f,${pitch}f]`);
    }

    // Invulnerable, Persistent, Silent
    if (advanced.invulnerable) parts.push('Invulnerable:1b');
    if (advanced.persistent) parts.push('PersistenceRequired:1b');
    if (advanced.silent) parts.push('Silent:1b');

    // Attribute
    const attr = [];
    if (attributes.speed) attr.push(`{Name:"generic.movement_speed",Base:${attributes.speed}f}`);
    if (attributes.armor) attr.push(`{Name:"generic.armor",Base:${attributes.armor}f}`);
    if (attributes.attackDamage) attr.push(`{Name:"generic.attack_damage",Base:${attributes.attackDamage}f}`);
    if (attributes.followRange) attr.push(`{Name:"generic.follow_range",Base:${attributes.followRange}f}`);
    if (attributes.jumpStrength) attr.push(`{Name:"horse.jump_strength",Base:${attributes.jumpStrength}f}`);
    if (attr.length) parts.push(`Attributes:[${attr.join(',')}]`);

    // Ausrüstung
    const armor = [equipment.boots, equipment.leggings, equipment.chestplate, equipment.helmet];
    const armorItems = armor.map(item => item && item.trim() ? `{id:"${item}",Count:1b}` : '{}');
    if (armorItems.some(v => v !== '{}')) parts.push(`ArmorItems:[${armorItems.join(',')}]`);

    const hand = [equipment.mainhand, equipment.offhand];
    const handItems = hand.map(item => item && item.trim() ? `{id:"${item}",Count:1b}` : '{}');
    if (handItems.some(v => v !== '{}')) parts.push(`HandItems:[${handItems.join(',')}]`);

    const drop = parseFloat(equipment.dropChance);
    if (!isNaN(drop) && drop !== 0.085) {
        parts.push(`ArmorDropChances:[${Array(4).fill(drop).join('f,')}f]`);
        parts.push(`HandDropChances:[${Array(2).fill(drop).join('f,')}f]`);
    }

    // 🏆 VillagerData – IMMER mit gültigem Beruf und Level ≥2
    if (mob.id === 'villager' || mob.id === 'zombie_villager') {
        // Beruf: falls nicht gesetzt (Behavior-Tab inaktiv) oder ungültig, nehmen wir 'mason'
        let profession = specific.Profession ? specific.Profession.replace(/"/g, '') : 'mason';
        // Entferne 'none' falls doch irgendwoher kommend
        if (profession === 'none') profession = 'mason';
        
        // Level: falls nicht gesetzt, nimm 2; falls kleiner 2, setze auf 2
        let level = specific.Level ? parseInt(specific.Level) : 2;
        if (level < 2) level = 2;
        
        const type = specific.Type ? specific.Type.replace(/"/g, '') : 'plains';

        parts.push(`VillagerData:{level:${level},profession:"minecraft:${profession}",type:"minecraft:${type}"}`);
    }

    // Andere spezifische Felder (außer Profession, Level, Type)
    Object.entries(specific).forEach(([key, val]) => {
        if (key !== 'Profession' && key !== 'Level' && key !== 'Type' && val && val !== '0' && val !== '0b') {
            parts.push(`${key}:${val}`);
        }
    });

    // Trades
    if (trades.length) parts.push(`Offers:{Recipes:[${trades.join(',')}]}`);

    // Custom NBT
    if (advanced.customNBT?.trim()) parts.push(advanced.customNBT);

    const nbt = parts.join(',');
    const command = `/summon ${mob.id} ~ ~ ~ {${nbt}}`;
    console.log('🔍 GENERATED COMMAND:', command);
    return command;
}
// Command-Builder – erzeugt aus den gesammelten Werten den /summon-Befehl

export function buildCommand(mob, data) {
    const { basic, attributes, equipment, advanced, specific, trades } = data;
    const useModern = advanced.syntaxVersion >= '1.20.5';

    const nbtParts = [];

    // ----- Name -----
    if (basic.name) {
        nbtParts.push(`CustomName:'{"text":"${basic.name}","color":"${basic.nameColor}"}'`);
    }

    // ----- Health -----
    nbtParts.push(`Health:${basic.health}f`);

    // ----- Rotation -----
    nbtParts.push(`Rotation:[${basic.rotation}f,${basic.pitch}f]`);

    // ----- Attribute -----
    const attrList = [];
    if (attributes.speed) attrList.push(`{Name:"generic.movement_speed",Base:${attributes.speed}f}`);
    if (attributes.armor) attrList.push(`{Name:"generic.armor",Base:${attributes.armor}f}`);
    if (attributes.attackDamage) attrList.push(`{Name:"generic.attack_damage",Base:${attributes.attackDamage}f}`);
    if (attributes.followRange) attrList.push(`{Name:"generic.follow_range",Base:${attributes.followRange}f}`);
    if (attributes.jumpStrength) attrList.push(`{Name:"horse.jump_strength",Base:${attributes.jumpStrength}f}`);
    if (attrList.length) nbtParts.push(`Attributes:[${attrList.join(',')}]`);

    // ----- Ausrüstung -----
    const armorItems = [];
    if (equipment.helmet) armorItems.push(`{id:"${equipment.helmet}",Count:1b}`);
    if (equipment.chestplate) armorItems.push(`{id:"${equipment.chestplate}",Count:1b}`);
    if (equipment.leggings) armorItems.push(`{id:"${equipment.leggings}",Count:1b}`);
    if (equipment.boots) armorItems.push(`{id:"${equipment.boots}",Count:1b}`);
    if (armorItems.length) nbtParts.push(`ArmorItems:[${armorItems.join(',')}]`);

    const handItems = [];
    if (equipment.mainhand) handItems.push(`{id:"${equipment.mainhand}",Count:1b}`);
    if (equipment.offhand) handItems.push(`{id:"${equipment.offhand}",Count:1b}`);
    if (handItems.length) nbtParts.push(`HandItems:[${handItems.join(',')}]`);

    // ----- Advanced Flags -----
    if (advanced.persistent) nbtParts.push('PersistenceRequired:1b');
    if (advanced.silent) nbtParts.push('Silent:1b');
    if (advanced.invulnerable) nbtParts.push('Invulnerable:1b');

    // ----- Mob-spezifische Felder -----
    Object.entries(specific).forEach(([key, value]) => {
        if (value !== null && value !== '') {
            nbtParts.push(`${key}:${value}`);
        }
    });

    // ----- Trades -----
    if (trades.length > 0) {
        nbtParts.push(`Offers:{Recipes:[${trades.join(',')}]}`);
    }

    // ----- Custom NBT -----
    if (advanced.customNBT) {
        nbtParts.push(advanced.customNBT);
    }

    const nbtString = nbtParts.join(',');
    return `/summon ${mob.id} ~ ~1 ~ {${nbtString}}`;
}
// Automatischer Beschuss von Wachtürmen auf feindliche Einheiten.

import { getBuildingTypeById } from "../data/structureTypes.js";
import { tileDistance } from "./tiles.js";
import { removeUnit } from "./units.js";
import { setAnimation } from "../render/spriteAnimation.js";
import { getRealmName, recordEvent } from "./events.js";
import { areAtWar } from "./diplomacy.js";

export function attackWithTower(tower, defender) {
    const type = tower && getBuildingTypeById(tower.typeId);
    if (!type?.attackRange || !defender || !areAtWar(tower.owner, defender.owner) || defender.health <= 0) return { ok: false };
    if (Date.now() < (tower.nextShotAt || 0) || tileDistance(tower.x, tower.y, defender.x, defender.y) > type.attackRange) return { ok: false };
    tower.nextShotAt = Date.now() + (type.attackCooldown || 1600);
    defender.health -= type.attackDamage;
    setAnimation(defender, "damage");
    if (defender.health <= 0) {
        recordEvent(`${getRealmName(tower.owner)}s ${type.name} schlägt ${getRealmName(defender.owner)}s Truppe zurück.`, "combat");
        removeUnit(defender.id);
        return { ok: true, destroyed: true };
    }
    return { ok: true, destroyed: false };
}

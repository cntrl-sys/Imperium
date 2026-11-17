// js/game/combat.js
//
// Einfaches Kampfsystem: Angreifer verursacht Schaden, Verteidiger verliert
// Leben, bei <= 0 wird die Einheit zerstört. Keine Rüstung, keine
// kritischen Treffer, keine Erfahrung — bewusst simpel gehalten.

import { match, getPlayerById } from "./gameState.js";
import { getUnitTypeById } from "../data/units.js";
import { tileDistance, getDirectionFromDelta } from "./tiles.js";
import { removeUnit } from "./units.js";
import { setAnimation, setDirection } from "../render/spriteAnimation.js";
import { getRealmName, recordEvent } from "./events.js";
import { damageBuilding } from "./buildings.js";
import { declareWar } from "./diplomacy.js";
import { getResearchBonus } from "./research.js";

export function canAttack(attacker, defender) {
    if (!attacker || !defender) return false;
    if (match.mode === "realtime"
        ? Date.now() < (attacker.nextAttackAt || 0)
        : attacker.hasActed) return false;
    if (attacker.owner === defender.owner) return false;

    const attackerType = getUnitTypeById(attacker.typeId);
    if (!attackerType || !attackerType.canAttack) return false;

    const distance = tileDistance(attacker.x, attacker.y, defender.x, defender.y);
    return distance <= attackerType.attackRange;
}

export function canAttackBuilding(attacker, building) {
    if (!attacker || !building || building.destroyed || attacker.owner === building.owner) return false;
    if (match.mode === "realtime" ? Date.now() < (attacker.nextAttackAt || 0) : attacker.hasActed) return false;
    const type = getUnitTypeById(attacker.typeId);
    return !!type?.canAttack && tileDistance(attacker.x, attacker.y, building.x, building.y) <= type.attackRange;
}

export function attackBuilding(attacker, building) {
    if (!canAttackBuilding(attacker, building)) return { ok: false };
    declareWar(attacker.owner, building.owner, "Angriff auf ein Gebäude");
    const type = getUnitTypeById(attacker.typeId);
    const player = getPlayerById(attacker.owner);
    const damage = type.attackDamage + (player?.damageBonus || 0) + getResearchBonus(attacker.owner, "attackDamage") + (attacker.academyTrained ? 2 : 0);
    if (match.mode === "realtime") attacker.nextAttackAt = Date.now() + 1000;
    else attacker.hasActed = true;
    setDirection(attacker, getDirectionFromDelta(attacker.x, attacker.y, building.x, building.y));
    setAnimation(attacker, "attack");
    return { ok: true, ...damageBuilding(building, damage, attacker.owner), damage };
}

/**
 * Führt einen Angriff aus. Gibt zurück, ob der Verteidiger dabei zerstört
 * wurde.
 */
export function attack(attacker, defender) {
    if (!canAttack(attacker, defender)) return { ok: false };
    declareWar(attacker.owner, defender.owner, "Angriff auf Truppen");

    const attackerType = getUnitTypeById(attacker.typeId);
    const direction = getDirectionFromDelta(attacker.x, attacker.y, defender.x, defender.y);

    if (match.mode === "realtime") attacker.nextAttackAt = Date.now() + 1000;
    else attacker.hasActed = true;
    setDirection(attacker, direction);
    setAnimation(attacker, "attack");

    const attackerPlayer = getPlayerById(attacker.owner);
    const damage = attackerType.attackDamage + (attackerPlayer?.damageBonus || 0) + getResearchBonus(attacker.owner, "attackDamage") + (attacker.academyTrained ? 2 : 0);
    defender.health -= damage;
    setAnimation(defender, "damage");
    const defenderType = getUnitTypeById(defender.typeId);
    const attackerName = `${getRealmName(attacker.owner)} ${attackerType.name}`;
    const defenderName = `${getRealmName(defender.owner)} ${defenderType?.name || "Einheit"}`;

    let defenderDestroyed = false;
    if (defender.health <= 0) {
        defenderDestroyed = true;
        recordEvent(`${attackerName} besiegt ${defenderName}.`, "combat");
        removeUnit(defender.id);
    } else {
        recordEvent(`${attackerName} trifft ${defenderName}: ${damage} Schaden, ${defender.health} Lebenspunkte verbleiben.`, "combat");
    }

    return { ok: true, defenderDestroyed };
}

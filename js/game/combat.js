// js/game/combat.js
//
// Einfaches Kampfsystem: Angreifer verursacht Schaden, Verteidiger verliert
// Leben, bei <= 0 wird die Einheit zerstört. Keine Rüstung, keine
// kritischen Treffer, keine Erfahrung — bewusst simpel gehalten.

import { match } from "./gameState.js";
import { getUnitTypeById } from "../data/units.js";
import { tileDistance, getDirectionFromDelta } from "./tiles.js";
import { removeUnit } from "./units.js";
import { checkCapitalCapture } from "./capitals.js";
import { setAnimation, setDirection } from "../render/spriteAnimation.js";

export function canAttack(attacker, defender) {
    if (!attacker || !defender) return false;
    if (attacker.hasActed) return false;
    if (attacker.owner === defender.owner) return false;

    const attackerType = getUnitTypeById(attacker.typeId);
    if (!attackerType || !attackerType.canAttack) return false;

    const distance = tileDistance(attacker.x, attacker.y, defender.x, defender.y);
    return distance <= attackerType.attackRange;
}

/**
 * Führt einen Angriff aus. Gibt zurück, ob der Verteidiger dabei zerstört
 * wurde.
 */
export function attack(attacker, defender) {
    if (!canAttack(attacker, defender)) return { ok: false };

    const attackerType = getUnitTypeById(attacker.typeId);
    const direction = getDirectionFromDelta(attacker.x, attacker.y, defender.x, defender.y);

    attacker.hasActed = true;
    setDirection(attacker, direction);
    setAnimation(attacker, "attack");

    defender.health -= attackerType.attackDamage;
    setAnimation(defender, "damage");

    let defenderDestroyed = false;
    if (defender.health <= 0) {
        defenderDestroyed = true;
        const { x, y, owner } = defender;
        removeUnit(defender.id);
        // Wenn dadurch das Feld einer gegnerischen Hauptstadt frei wird,
        // gilt der Angreifer als eindringend -> Sieg/Niederlage prüfen.
        checkCapitalCapture(x, y, attacker.owner);
        void owner;
    }

    return { ok: true, defenderDestroyed };
}

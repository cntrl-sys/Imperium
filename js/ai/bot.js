// js/ai/bot.js
//
// Sehr einfache Bot-Logik für diese Entwicklungsphase:
//   1. Wenn eine gegnerische Einheit in Reichweite ist -> angreifen.
//   2. Sonst -> ein Feld in Richtung gegnerischer Hauptstadt bewegen.
//   3. Wenn keine Bewegung möglich ist -> nichts tun.
//
// Bewusst simpel und in einem eigenen Modul gehalten, damit dieser Code
// später leicht durch eine trainierte/komplexere KI ersetzt werden kann,
// ohne den Rest des Spiels anzufassen.

import { match } from "../game/gameState.js";
import { getUnitsByOwner } from "../game/units.js";
import { canAttack, attack } from "../game/combat.js";
import { getReachableTiles, moveUnit } from "../game/movement.js";
import { getCapitalByOwner } from "../game/gameState.js";
import { isGameOver } from "../game/capitals.js";

export function runBotTurn() {
    const botUnits = getUnitsByOwner("bot");
    const playerCapital = getCapitalByOwner("player");

    for (const unit of botUnits) {
        if (isGameOver()) break;
        if (unit.hasActed) continue;

        const target = findAttackTarget(unit);
        if (target) {
            attack(unit, target);
            continue;
        }

        moveTowardsCapital(unit, playerCapital);
    }
}

function findAttackTarget(unit) {
    const playerUnits = getUnitsByOwner("player");
    return playerUnits.find((enemy) => canAttack(unit, enemy)) || null;
}

function moveTowardsCapital(unit, capital) {
    if (!capital || capital.destroyed) return;

    const reachable = getReachableTiles(unit);
    if (reachable.length === 0) return; // keine Bewegung möglich -> nichts tun

    let best = null;
    let bestDistance = Infinity;
    for (const pos of reachable) {
        const dist = Math.max(Math.abs(pos.x - capital.x), Math.abs(pos.y - capital.y));
        if (dist < bestDistance) {
            bestDistance = dist;
            best = pos;
        }
    }

    if (best) {
        moveUnit(unit, best.x, best.y);
    }
}

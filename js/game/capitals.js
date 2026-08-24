// js/game/capitals.js
//
// Prüft, ob eine Hauptstadt eingenommen/zerstört wurde, und setzt daraus
// resultierend den Sieg-/Niederlage-Status im Match-State.

import { match } from "./gameState.js";

/**
 * Prüft, ob auf dem angegebenen Feld eine gegnerische Hauptstadt steht,
 * und markiert sie ggf. als zerstört/eingenommen. Setzt bei Bedarf
 * match.gameOver.
 * @param {string} attackerOwner - Besitzer der Einheit, die das Feld betritt/angreift
 */
export function checkCapitalCapture(x, y, attackerOwner) {
    const capital = match.capitals.find((c) => c.x === x && c.y === y && !c.destroyed);
    if (!capital) return false;
    if (capital.owner === attackerOwner) return false;

    capital.destroyed = true;

    if (attackerOwner === "player") {
        match.gameOver = "win";
    } else {
        match.gameOver = "lose";
    }

    return true;
}

export function isGameOver() {
    return match.gameOver !== null;
}

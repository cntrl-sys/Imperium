// js/game/movement.js
//
// Bewegungslogik: welche Felder eine ausgewählte Einheit erreichen kann,
// und die eigentliche Ausführung der Bewegung.

import { match } from "./gameState.js";
import { getUnitTypeById } from "../data/units.js";
import { getTile, getNeighbors8, getDirectionFromDelta } from "./tiles.js";
import { getUnitAt } from "./units.js";
import { checkCapitalCapture } from "./capitals.js";
import { setAnimation, setDirection } from "../render/spriteAnimation.js";

/**
 * Liefert alle Felder, auf die die Einheit sich in dieser Runde bewegen
 * kann (Bewegung 1 Feld = ein angrenzendes Feld inkl. Diagonalen, passend
 * zum jeweiligen Terrain, unbesetzt).
 */
export function getReachableTiles(unit) {
    if (unit.hasActed) return [];
    const unitType = getUnitTypeById(unit.typeId);
    if (!unitType) return [];

    return getNeighbors8(unit.x, unit.y).filter((pos) => {
        const tile = getTile(match, pos.x, pos.y);
        if (!tile) return false;
        const terrainOk = unitType.category === "ship" ? tile.terrain === "water" : tile.terrain === "land";
        if (!terrainOk) return false;
        if (getUnitAt(pos.x, pos.y)) return false;
        return true;
    });
}

export function canMoveTo(unit, x, y) {
    return getReachableTiles(unit).some((pos) => pos.x === x && pos.y === y);
}

/**
 * Bewegt die Einheit auf ein gültiges Zielfeld und markiert sie als
 * "hat gehandelt". Aktualisiert außerdem Blickrichtung & Animation.
 */
export function moveUnit(unit, x, y) {
    if (!canMoveTo(unit, x, y)) return false;

    const direction = getDirectionFromDelta(unit.x, unit.y, x, y);
    unit.x = x;
    unit.y = y;
    unit.hasActed = true;
    setDirection(unit, direction);
    setAnimation(unit, "walk");

    // Betritt die Einheit eine gegnerische Hauptstadt, gilt diese als
    // eingenommen -> Sieg/Niederlage.
    checkCapitalCapture(x, y, unit.owner);

    return true;
}

// js/game/units.js
//
// Spiellogik rund um Einheiten: Kauf/Spawn bei der Hauptstadt, Lookup,
// hasActed-Verwaltung. Kennt keine Rendering-Details.

import { match, getPlayerById, getCapitalByOwner } from "./gameState.js";
import { getUnitTypeById } from "../data/units.js";
import { getTile, isLandTile, isWaterTile, getNeighbors8 } from "./tiles.js";
import { ensureAnimationState } from "../render/spriteAnimation.js";

export function getUnitAt(x, y) {
    return match.units.find((u) => u.x === x && u.y === y) || null;
}

export function getUnitById(unitId) {
    return match.units.find((u) => u.id === unitId) || null;
}

export function getUnitsByOwner(owner) {
    return match.units.filter((u) => u.owner === owner);
}

/**
 * Versucht, eine Einheit für den angegebenen Spieler zu kaufen und bei
 * dessen Hauptstadt zu spawnen.
 * @returns {{ok: boolean, reason?: string, unit?: object}}
 */
export function purchaseUnit(ownerId, unitTypeId) {
    const player = getPlayerById(ownerId);
    const unitType = getUnitTypeById(unitTypeId);
    const capital = getCapitalByOwner(ownerId);

    if (!player || !unitType || !capital) {
        return { ok: false, reason: "Kauf nicht möglich." };
    }

    if (player.resources.gold < unitType.cost) {
        return { ok: false, reason: "Nicht genug Gold." };
    }

    const spawnSpot = findSpawnSpot(capital, unitType);
    if (!spawnSpot) {
        return { ok: false, reason: "Kein freies Feld bei der Hauptstadt." };
    }

    player.resources.gold -= unitType.cost;

    const unit = {
        id: `unit-${match.nextUnitId++}`,
        typeId: unitType.id,
        owner: ownerId,
        x: spawnSpot.x,
        y: spawnSpot.y,
        health: unitType.health,
        hasActed: false,
        direction: ownerId === "player" ? "E" : "W",
        animation: { state: "idle", direction: ownerId === "player" ? "E" : "W", frame: 0, elapsed: 0 }
    };

    match.units.push(unit);
    ensureAnimationState(unit);

    return { ok: true, unit };
}

/**
 * Sucht ein freies, zum Einheitentyp passendes Feld direkt an der
 * Hauptstadt (inkl. der Hauptstadt selbst, falls dort noch keine Einheit
 * steht).
 */
function findSpawnSpot(capital, unitType) {
    const candidates = [{ x: capital.x, y: capital.y }, ...getNeighbors8(capital.x, capital.y)];

    for (const spot of candidates) {
        const tile = getTile(match, spot.x, spot.y);
        if (!tile) continue;
        const matchesTerrain =
            unitType.category === "ship" ? isWaterTile(match, spot.x, spot.y) : isLandTile(match, spot.x, spot.y);
        if (!matchesTerrain) continue;
        if (getUnitAt(spot.x, spot.y)) continue;
        return spot;
    }
    return null;
}

export function resetActionsForNewTurn(owner) {
    match.units.filter((u) => u.owner === owner).forEach((u) => {
        u.hasActed = false;
    });
}

export function removeUnit(unitId) {
    const index = match.units.findIndex((u) => u.id === unitId);
    if (index !== -1) match.units.splice(index, 1);
}

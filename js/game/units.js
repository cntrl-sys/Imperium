// js/game/units.js
//
// Spiellogik rund um Einheiten: Kauf/Spawn bei der Hauptstadt, Lookup,
// hasActed-Verwaltung. Kennt keine Rendering-Details.

import { match, getPlayerById, getCapitalByOwner, getPortByOwner } from "./gameState.js";
import { getUnitTypeById } from "../data/units.js";
import { getTile, isLandTile, isWaterTile, getNeighbors8 } from "./tiles.js";
import { ensureAnimationState } from "../render/spriteAnimation.js";
import { getRealmName, recordEvent } from "./events.js";
import { getBuildingsByOwner, getBuildingAt, getResourceCapacity } from "./buildings.js";

export const GOLD_PER_DEPOSIT_HARVEST = 8;

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

    if (!player || !unitType || !capital || capital.destroyed) {
        return { ok: false, reason: "Kauf nicht möglich." };
    }

    if (unitType.nations && !unitType.nations.includes(player.nationId)) {
        return { ok: false, reason: "Diese Einheit ist nur für China verfügbar." };
    }

    if (player.resources.gold < unitType.cost) {
        return { ok: false, reason: "Nicht genug Gold." };
    }

    const spawnSpot = findSpawnSpot(ownerId, capital, unitType);
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
    if (unitType.transportCapacity) unit.cargo = [];

    match.units.push(unit);
    ensureAnimationState(unit);
    recordEvent(`${getRealmName(ownerId)} rekrutiert ${unitType.name} für ${unitType.cost} Gold.`, "recruit");

    return { ok: true, unit };
}

/**
 * Sucht ein freies, passendes Feld an Kaserne, Hafen oder Hauptstadt.
 */
function findSpawnSpot(ownerId, capital, unitType) {
    const port = getPortByOwner(ownerId);
    const origins = unitType.category === "ship" && port
        ? [port]
        : [...getBuildingsByOwner(ownerId).filter((building) => building.typeId === "barracks"), capital];
    for (const origin of origins) {
        if (unitType.category !== "ship" && origin === capital && !getUnitAt(capital.x, capital.y)) {
            return { x: capital.x, y: capital.y };
        }
        const maxRadius = unitType.category === "ship" ? 2 : 3;
        for (let radius = 1; radius <= maxRadius; radius++) {
            for (let y = origin.y - radius; y <= origin.y + radius; y++) {
                for (let x = origin.x - radius; x <= origin.x + radius; x++) {
                    if (Math.max(Math.abs(x - origin.x), Math.abs(y - origin.y)) !== radius) continue;
                    const tile = getTile(match, x, y);
                    if (!tile) continue;
                    const matchesTerrain = unitType.category === "ship"
                        ? isWaterTile(match, x, y)
                        : isLandTile(match, x, y);
                    if (!matchesTerrain || getUnitAt(x, y) || getBuildingAt(x, y)) continue;
                    return { x, y };
                }
            }
        }
    }
    return null;
}

export function resetActionsForNewTurn(owner) {
    match.units.filter((u) => u.owner === owner).forEach((u) => {
        u.hasActed = false;
    });
}

export function collectWorkerResources() {
    const harvested = [];
    for (const worker of match.units) {
        const unitType = getUnitTypeById(worker.typeId);
        if (!unitType?.canGather) continue;
        const tile = getTile(match, worker.x, worker.y);
        const player = getPlayerById(worker.owner);
        if (!tile?.resource || tile.resourceAmount <= 0 || !player) continue;
        if (tile.resource !== "gold" && (player.resources[tile.resource] || 0) >= getResourceCapacity(worker.owner)) continue;

        tile.resourceAmount -= 1;
        const amount = tile.resource === "gold"
            ? (worker.academyTrained ? 12 : GOLD_PER_DEPOSIT_HARVEST)
            : (worker.academyTrained ? 2 : 1);
        player.resources[tile.resource] = (player.resources[tile.resource] || 0) + amount;
        harvested.push({ owner: worker.owner, resource: tile.resource, amount });
    }
    return harvested;
}

export function canEmbarkUnit(passenger, ship) {
    if (!passenger || !ship || passenger.owner !== ship.owner) return false;
    const passengerType = getUnitTypeById(passenger.typeId);
    const shipType = getUnitTypeById(ship.typeId);
    if (!['land', 'cavalry'].includes(passengerType?.category) || shipType?.category !== "ship") return false;
    if (!shipType.transportCapacity) return false;
    if (match.mode === "realtime" ? Date.now() < (ship.transportReadyAt || 0) : ship.hasActed || passenger.hasActed) return false;
    if ((ship.cargo?.length || 0) >= shipType.transportCapacity) return false;
    return Math.max(Math.abs(passenger.x - ship.x), Math.abs(passenger.y - ship.y)) <= 1;
}

export function embarkUnit(passenger, ship) {
    if (!canEmbarkUnit(passenger, ship)) {
        return { ok: false, reason: "Einheit und Schiff müssen frei, befreundet und benachbart sein." };
    }
    ship.cargo ||= [];
    ship.cargo.push(passenger);
    if (match.mode === "realtime") ship.transportReadyAt = Date.now() + 1200;
    else { ship.hasActed = true; passenger.hasActed = true; }
    match.units = match.units.filter((unit) => unit.id !== passenger.id);
    recordEvent(`${getRealmName(ship.owner)} schifft eine Truppe ein.`, "fleet");
    return { ok: true };
}

export function disembarkUnit(ship, x, y) {
    const shipType = ship && getUnitTypeById(ship.typeId);
    const tile = getTile(match, x, y);
    const adjacent = ship && Math.max(Math.abs(ship.x - x), Math.abs(ship.y - y)) <= 1;
    if (shipType?.category !== "ship" || (match.mode === "realtime" ? Date.now() < (ship.transportReadyAt || 0) : ship.hasActed) || !ship.cargo?.length || !tile || !["land", "bridge"].includes(tile.terrain) || !adjacent || getUnitAt(x, y) || getBuildingAt(x, y)) {
        return { ok: false, reason: "Wähle ein freies Landfeld direkt neben einem Schiff mit Truppen." };
    }

    const passenger = ship.cargo.shift();
    passenger.x = x;
    passenger.y = y;
    if (match.mode === "realtime") ship.transportReadyAt = Date.now() + 1200;
    else { passenger.hasActed = true; ship.hasActed = true; }
    match.units.push(passenger);
    recordEvent(`${getRealmName(ship.owner)} setzt eine Truppe an Land.`, "fleet");
    return { ok: true, unit: passenger };
}

export function getDisembarkTiles(ship) {
    const shipType = ship && getUnitTypeById(ship.typeId);
    if (shipType?.category !== "ship" || (match.mode === "realtime" ? Date.now() < (ship.transportReadyAt || 0) : ship.hasActed) || !ship.cargo?.length) return [];
    return getNeighbors8(ship.x, ship.y).filter(({ x, y }) => {
        const tile = getTile(match, x, y);
        return ["land", "bridge"].includes(tile?.terrain) && !getUnitAt(x, y) && !getBuildingAt(x, y);
    });
}

export function removeUnit(unitId) {
    const index = match.units.findIndex((u) => u.id === unitId);
    if (index !== -1) match.units.splice(index, 1);
}

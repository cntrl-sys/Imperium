import { match, getPlayerById } from "./gameState.js";
import { getBuildingTypeById } from "../data/structureTypes.js";
import { getUnitTypeById } from "../data/units.js";
import { getTile } from "./tiles.js";
import { recordEvent, getRealmName } from "./events.js";
import { getResearchBonus } from "./research.js";

const BASE_STORAGE_CAPACITY = 50;

export function getBuildingAt(x, y) {
    return match.buildings.find((building) => !building.destroyed && building.x === x && building.y === y) || null;
}

export function getBuildingsByOwner(owner) {
    return match.buildings.filter((building) => building.owner === owner && !building.destroyed);
}

export function getResourceCapacity(owner) {
    return BASE_STORAGE_CAPACITY + getBuildingsByOwner(owner).reduce((total, building) => {
        const type = getBuildingTypeById(building.typeId);
        return total + (type?.storageBonus || 0);
    }, 0);
}

export function getBuildableTiles(owner, typeId) {
    const player = getPlayerById(owner);
    const type = getBuildingTypeById(typeId);
    if (!player || !type || !canAffordBuilding(player, type)) return [];
    const builders = match.units.filter((unit) => unit.owner === owner && getUnitTypeById(unit.typeId)?.canBuild && (!unit.hasActed || match.mode === "realtime"));
    return match.tiles.flat().filter((tile) => {
        if (tile.terrain !== "land" || getBuildingAt(tile.x, tile.y)) return false;
        if (match.capitals.some((capital) => capital.x === tile.x && capital.y === tile.y)) return false;
        if (match.ports.some((port) => port.x === tile.x && port.y === tile.y)) return false;
        if (match.units.some((unit) => unit.x === tile.x && unit.y === tile.y)) return false;
        return builders.some((worker) => Math.max(Math.abs(worker.x - tile.x), Math.abs(worker.y - tile.y)) <= 1);
    }).map(({ x, y }) => ({ x, y }));
}

export function constructBuilding(owner, typeId, x, y) {
    const player = getPlayerById(owner);
    const type = getBuildingTypeById(typeId);
    const tile = getTile(match, x, y);
    if (!player || !type || !tile) return { ok: false, reason: "Dieser Bau ist nicht verfügbar." };
    if (!canAffordBuilding(player, type)) return { ok: false, reason: "Es fehlen Gold oder Baumaterialien." };
    if (tile.terrain !== "land" || getBuildingAt(x, y) || match.capitals.some((capital) => capital.x === x && capital.y === y) || match.ports.some((port) => port.x === x && port.y === y) || match.units.some((unit) => unit.x === x && unit.y === y)) {
        return { ok: false, reason: "Gebäude brauchen ein freies, ebenes Landfeld." };
    }
    const builder = match.units.find((unit) => unit.owner === owner && getUnitTypeById(unit.typeId)?.canBuild && (!unit.hasActed || match.mode === "realtime") && Math.max(Math.abs(unit.x - x), Math.abs(unit.y - y)) <= 1);
    if (!builder) return { ok: false, reason: "Ein freier Arbeiter muss direkt neben dem Bauplatz stehen." };

    for (const [resource, amount] of Object.entries(type.cost)) player.resources[resource] -= amount;
    if (match.mode !== "realtime") builder.hasActed = true;
    const building = {
        id: `building-${match.nextBuildingId++}`,
        typeId,
        owner,
        x,
        y,
        health: type.health,
        maxHealth: type.health,
        destroyed: false
    };
    match.buildings.push(building);
    recordEvent(`${getRealmName(owner)} errichtet ${type.name}.`, "building");
    return { ok: true, building };
}

export function damageBuilding(building, damage, attackerOwner) {
    if (!building || building.destroyed || building.owner === attackerOwner || damage <= 0) {
        return { ok: false, destroyed: false };
    }
    const reducedDamage = Math.max(1, Math.ceil(damage * (1 - getResearchBonus(building.owner, "buildingDefense"))));
    building.health = Math.max(0, building.health - reducedDamage);
    const type = getBuildingTypeById(building.typeId);
    if (building.health === 0) {
        building.destroyed = true;
        recordEvent(`${type?.name || "Gebäude"} von ${getRealmName(building.owner)} wurde von ${getRealmName(attackerOwner)} zerstört.`, "building-destroyed");
        return { ok: true, destroyed: true };
    }
    recordEvent(`${type?.name || "Gebäude"} von ${getRealmName(building.owner)} wird angegriffen (${building.health} LP verbleiben).`, "combat");
    return { ok: true, destroyed: false };
}

function canAffordBuilding(player, type) {
    return Object.entries(type.cost).every(([resource, amount]) => (player.resources[resource] || 0) >= amount);
}

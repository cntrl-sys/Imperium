// Sichtweite, erkundete Gebiete und Nebel des Krieges.

import { match } from "./gameState.js";
import { getUnitTypeById } from "../data/units.js";
import { getBuildingTypeById } from "../data/structureTypes.js";

const UNIT_VISION = {
    soldier: 4,
    archer: 5,
    worker: 3,
    minotaur: 4,
    hunter: 8,
    "dragon-war": 7,
    "dragon-express": 8,
    "dragon-trade": 7,
    warship: 6,
    merchantShip: 5
};

export function updateVision(owner = "player") {
    if (!match.map) return false;
    match.visibility ||= {};
    const width = match.map.width;
    const height = match.map.height;
    const prior = match.visibility[owner] || {};
    const explored = Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) => Boolean(prior.explored?.[y]?.[x]))
    );
    const visible = Array.from({ length: height }, () => Array(width).fill(false));
    const sources = [];

    match.units.filter((unit) => unit.owner === owner).forEach((unit) => {
        sources.push({ x: unit.x, y: unit.y, radius: UNIT_VISION[unit.typeId] || 4 });
    });
    match.capitals.filter((capital) => capital.owner === owner && !capital.destroyed).forEach((capital) => {
        sources.push({ x: capital.x, y: capital.y, radius: 6 });
    });
    match.ports.filter((port) => port.owner === owner).forEach((port) => {
        sources.push({ x: port.x, y: port.y, radius: 3 });
    });
    match.buildings.filter((building) => building.owner === owner && !building.destroyed).forEach((building) => {
        const type = getBuildingTypeById(building.typeId);
        sources.push({ x: building.x, y: building.y, radius: type?.vision || (building.typeId === "barracks" ? 5 : 3) });
    });

    for (const source of sources) {
        const radiusSquared = source.radius * source.radius;
        for (let y = Math.max(0, source.y - source.radius); y <= Math.min(height - 1, source.y + source.radius); y++) {
            for (let x = Math.max(0, source.x - source.radius); x <= Math.min(width - 1, source.x + source.radius); x++) {
                const dx = x - source.x;
                const dy = y - source.y;
                if (dx * dx + dy * dy > radiusSquared) continue;
                visible[y][x] = true;
                explored[y][x] = true;
            }
        }
    }

    const changed = !sameGrid(prior.visible, visible) || !sameGrid(prior.explored, explored);
    match.visibility[owner] = { visible, explored };
    return changed;
}

export function isVisibleToPlayer(x, y) {
    return Boolean(match.visibility?.player?.visible?.[y]?.[x]);
}

export function isExploredByPlayer(x, y) {
    return Boolean(match.visibility?.player?.explored?.[y]?.[x]);
}

export function getUnitVision(unit) {
    const type = getUnitTypeById(unit?.typeId);
    return UNIT_VISION[unit?.typeId] || (type?.category === "air" ? 7 : 4);
}

function sameGrid(previous, next) {
    if (!Array.isArray(previous) || previous.length !== next.length) return false;
    for (let y = 0; y < next.length; y++) {
        if (!Array.isArray(previous[y]) || previous[y].length !== next[y].length) return false;
        for (let x = 0; x < next[y].length; x++) {
            if (Boolean(previous[y][x]) !== next[y][x]) return false;
        }
    }
    return true;
}

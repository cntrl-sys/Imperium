import { match, getPlayerById } from "./gameState.js";
import { getUnitTypeById } from "../data/units.js";
import { getRealmName, recordEvent } from "./events.js";

export const academyCourses = {
    worker: { name: "Arbeiter", cost: 90, duration: 18, healthBonus: 4 },
    soldier: { name: "Soldat", cost: 150, duration: 25, healthBonus: 6, damageBonus: 2 }
};

export function startAcademyTraining(academyId, unitTypeId) {
    const academy = match.buildings.find((building) => building.id === academyId && building.typeId === "academy" && !building.destroyed);
    const course = academyCourses[unitTypeId];
    const player = academy && getPlayerById(academy.owner);
    if (!academy || !course || !player) return { ok: false, reason: "Akademie oder Ausbildung nicht verfügbar." };
    if (academy.training) return { ok: false, reason: "Diese Akademie bildet bereits eine Einheit aus." };
    if ((player.resources.gold || 0) < course.cost) return { ok: false, reason: `Die Ausbildung kostet ${course.cost} Gold.` };
    player.resources.gold -= course.cost;
    academy.training = { unitTypeId, progress: 0, duration: course.duration };
    recordEvent(`${getRealmName(academy.owner)} beginnt mit der Ausbildung: ${course.name}.`, "training");
    return { ok: true };
}

export function advanceAcademyTraining(deltaMs) {
    let graduated = false;
    for (const academy of match.buildings) {
        const training = academy.training;
        if (academy.typeId !== "academy" || academy.destroyed || !training) continue;
        const course = academyCourses[training.unitTypeId];
        if (!course) { academy.training = null; continue; }
        training.progress = Math.min(training.duration, training.progress + deltaMs / 1000);
        if (training.progress < training.duration) continue;
        const position = findSpawnPosition(academy);
        if (!position) continue;
        const type = getUnitTypeById(training.unitTypeId);
        const unit = {
            id: `unit-${match.nextUnitId++}`, typeId: training.unitTypeId, owner: academy.owner,
            x: position.x, y: position.y, health: type.health + course.healthBonus, maxHealth: type.health + course.healthBonus,
            hasActed: false, direction: "E",
            animation: { state: "idle", direction: "E", frame: 0, elapsed: 0 },
            academyTrained: true
        };
        if (training.unitTypeId === "worker") unit.gatheringResource = null;
        match.units.push(unit);
        academy.training = null;
        recordEvent(`${getRealmName(academy.owner)} hat einen ausgebildeten ${course.name} fertiggestellt.`, "training");
        graduated = true;
    }
    return graduated;
}

function findSpawnPosition(academy) {
    for (let radius = 1; radius <= 3; radius++) {
        for (let y = academy.y - radius; y <= academy.y + radius; y++) for (let x = academy.x - radius; x <= academy.x + radius; x++) {
            if (Math.max(Math.abs(x - academy.x), Math.abs(y - academy.y)) !== radius) continue;
            const tile = match.tiles[y]?.[x];
            if (tile?.terrain !== "land" || match.units.some((unit) => unit.x === x && unit.y === y) || match.buildings.some((building) => !building.destroyed && building.x === x && building.y === y)) continue;
            if (match.capitals.some((capital) => capital.x === x && capital.y === y) || match.ports.some((port) => port.x === x && port.y === y)) continue;
            return { x, y };
        }
    }
    return null;
}

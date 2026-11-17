// js/ai/bot.js
//
// Gegner mit unterschiedlichen Rollen, Einkommen, Rekrutierungsrhythmen
// und Kampfstärken. Die Entscheidungslogik bleibt vom Rendering getrennt.

import { match } from "../game/gameState.js";
import { getUnitAt, getUnitsByOwner, purchaseUnit, disembarkUnit } from "../game/units.js";
import { canAttack, attack, canAttackBuilding, attackBuilding } from "../game/combat.js";
import { getReachableTiles, moveUnit } from "../game/movement.js";
import { getCapitalByOwner } from "../game/gameState.js";
import { getTile, getNeighbors8 } from "../game/tiles.js";
import { unitTypes, getUnitTypeById } from "../data/units.js";
import { isGameOver } from "../game/capitals.js";
import { getBuildingsByOwner, getBuildingAt } from "../game/buildings.js";
import { blocksMovement } from "../game/buildingMovement.js";
import { getBuildingTypeById } from "../data/structureTypes.js";
import { recordEvent, getRealmName } from "../game/events.js";
import { areAtWar, evaluatePeacefulAI } from "../game/diplomacy.js";
import { startResearch } from "../game/research.js";
import { startAcademyTraining } from "../game/academyTraining.js";
import { technologies } from "../data/technologies.js";

export function runBotTurn() {
    evaluatePeacefulAI();
    const playerCapital = getCapitalByOwner("player");

    for (const opponent of match.players.filter((player) => !player.isHuman)) {
        const capital = getCapitalByOwner(opponent.id);
        if (!capital || capital.destroyed) continue;
        buildAIInfrastructure(opponent, capital);
        recruitForStrategy(opponent);
        if (!areAtWar(opponent.id, "player")) continue;
        if (["inselarchipel", "saphirmeer"].includes(match.map.id)) {
            runArchipelagoTurn(opponent, playerCapital);
            continue;
        }
        for (const unit of getUnitsByOwner(opponent.id)) {
            if (isGameOver()) return;
            if (unit.hasActed) continue;

            const target = findAttackTarget(unit);
            if (target) {
                attack(unit, target);
                continue;
            }
            const structure = findAttackableBuilding(unit);
            if (structure) {
                attackBuilding(unit, structure);
                continue;
            }

            moveTowardsCapital(unit, playerCapital);
        }
    }
}

function buildAIInfrastructure(opponent, capital) {
    const buildings = getBuildingsByOwner(opponent.id);
    const plans = [];
    if (!buildings.some((building) => building.typeId === "barracks")) plans.push("barracks");
    if (!buildings.some((building) => building.typeId === "academy")) plans.push("academy");
    if (["engineer", "veteran"].includes(opponent.aiStrategy) && !buildings.some((building) => building.typeId === "warehouse")) plans.push("warehouse");
    if (["engineer", "veteran", "marksman"].includes(opponent.aiStrategy) && !buildings.some((building) => building.typeId === "watchtower")) plans.push("watchtower");

    for (const typeId of plans) {
        const type = getBuildingTypeById(typeId);
        // Eine ältere zwischengespeicherte Gebäudeliste kann neue KI-Pläne
        // noch nicht kennen. In diesem Fall den Bau überspringen, nicht den
        // kompletten Echtzeit-Loop anhalten.
        if (!type?.cost) continue;
        if (!Object.entries(type.cost).every(([resource, amount]) => (opponent.resources[resource] || 0) >= amount)) continue;
        const tile = findAIConstructionSite(capital);
        if (!tile) continue;
        for (const [resource, amount] of Object.entries(type.cost)) opponent.resources[resource] -= amount;
        match.buildings.push({
            id: `building-${match.nextBuildingId++}`, typeId, owner: opponent.id,
            x: tile.x, y: tile.y, health: type.health, maxHealth: type.health, destroyed: false
        });
        recordEvent(`${getRealmName(opponent.id)} errichtet ${type.name}.`, "building");
    }
    if (match.buildings.some((building) => building.owner === opponent.id && building.typeId === "academy" && !building.destroyed) && !opponent.research?.active) {
        const priority = { raider: ["iron-forging", "imperial-ledger"], marksman: ["naval-charts", "iron-forging"], engineer: ["imperial-ledger", "stonework"], veteran: ["stonework", "iron-forging"] }[opponent.aiStrategy] || [];
        const choices = [...priority, ...technologies.map((technology) => technology.id)];
        const next = choices.find((id) => !opponent.research?.completed?.includes(id) && technologies.find((technology) => technology.id === id)?.cost && Object.entries(technologies.find((technology) => technology.id === id).cost).every(([resource, amount]) => (opponent.resources[resource] || 0) >= amount));
        if (next) startResearch(opponent.id, next);
    }
    const idleAcademy = match.buildings.find((building) => building.owner === opponent.id && building.typeId === "academy" && !building.destroyed && !building.training);
    if (idleAcademy && (opponent.resources.gold || 0) >= 150) startAcademyTraining(idleAcademy.id, "soldier");
}

function findAIConstructionSite(capital) {
    for (let radius = 1; radius <= 3; radius++) {
        for (let y = capital.y - radius; y <= capital.y + radius; y++) {
            for (let x = capital.x - radius; x <= capital.x + radius; x++) {
                if (Math.max(Math.abs(x - capital.x), Math.abs(y - capital.y)) !== radius) continue;
                const tile = getTile(match, x, y);
                if (tile?.terrain !== "land" || getBuildingAt(x, y) || getUnitAt(x, y)) continue;
                if (match.capitals.some((entry) => entry.x === x && entry.y === y) || match.ports.some((entry) => entry.x === x && entry.y === y)) continue;
                return { x, y };
            }
        }
    }
    return null;
}

function recruitForStrategy(opponent) {
    const profile = {
        raider: { interval: 3, unit: "soldier", cap: 10 },
        marksman: { interval: 4, unit: "archer", cap: 8 },
        engineer: { interval: 3, unit: "soldier", cap: 12 },
        veteran: { interval: 2, unit: "hunter", cap: 14 }
    }[opponent.aiStrategy] || { interval: 4, unit: "soldier", cap: 8 };
    if (getUnitsByOwner(opponent.id).length >= profile.cap || match.turn % profile.interval !== 0 || opponent.lastRecruitTurn === match.turn) return;
    opponent.lastRecruitTurn = match.turn;
    if (["inselarchipel", "saphirmeer"].includes(match.map.id)) {
        const navalCount = getUnitsByOwner(opponent.id).filter((unit) => getUnitTypeById(unit.typeId)?.category === "ship").length;
        if (navalCount >= 3 || (opponent.resources.gold || 0) < 200) return;
        const passenger = purchaseUnit(opponent.id, "soldier");
        const transport = passenger.ok && purchaseUnit(opponent.id, "warship");
        if (passenger?.ok && transport?.ok) {
            match.units = match.units.filter((unit) => unit.id !== passenger.unit.id);
            transport.unit.cargo ||= [];
            transport.unit.cargo.push(passenger.unit);
        } else if (passenger?.ok) {
            match.units = match.units.filter((unit) => unit.id !== passenger.unit.id);
            opponent.resources.gold += getUnitTypeById("soldier").cost;
        }
        return;
    }
    const nationalUnit = unitTypes.find((unit) => unit.nations?.includes(opponent.nationId));
    const preferred = nationalUnit && opponent.resources.gold >= nationalUnit.cost ? nationalUnit.id : profile.unit;
    purchaseUnit(opponent.id, preferred);
}

function runArchipelagoTurn(opponent, playerCapital) {
    const units = getUnitsByOwner(opponent.id);
    for (const unit of units) {
        if (isGameOver()) return;
        if (unit.hasActed) continue;
        const type = getUnitTypeById(unit.typeId);

        if (type?.category === "ship") {
            const target = findAttackTarget(unit);
            if (target) {
                attack(unit, target);
                continue;
            }
            const structure = findAttackableBuilding(unit);
            if (structure) {
                attackBuilding(unit, structure);
                continue;
            }
            if (unit.cargo?.length) {
                const landing = findLandingSpot(unit, playerCapital);
                if (landing) {
                    const result = disembarkUnit(unit, landing.x, landing.y);
                    if (result.ok) result.unit.deployedFromShip = true;
                } else {
                    moveAlongPath(unit, (tile) => isPlayerLandingWater(tile, playerCapital));
                }
            }
            continue;
        }

        const target = findAttackTarget(unit);
        if (target) {
            attack(unit, target);
            continue;
        }
        const structure = findAttackableBuilding(unit);
        if (structure) {
            attackBuilding(unit, structure);
            continue;
        }
        if (unit.deployedFromShip) moveTowardsCapital(unit, playerCapital);
    }
}

function findLandingSpot(ship, playerCapital) {
    return getNeighbors8(ship.x, ship.y).find(({ x, y }) => {
        const tile = getTile(match, x, y);
        return tile?.terrain === "land" && !getUnitAt(x, y) && !getBuildingAt(x, y) &&
            Math.max(Math.abs(x - playerCapital.x), Math.abs(y - playerCapital.y)) <= 2;
    }) || null;
}

function isPlayerLandingWater(tile, playerCapital) {
    if (!tile || tile.terrain !== "water") return false;
    return getNeighbors8(tile.x, tile.y).some(({ x, y }) => {
        const land = getTile(match, x, y);
        return land?.terrain === "land" && !getUnitAt(x, y) && !getBuildingAt(x, y) &&
            Math.max(Math.abs(x - playerCapital.x), Math.abs(y - playerCapital.y)) <= 2;
    });
}

function moveAlongPath(unit, goalTest) {
    const path = findPath(unit, goalTest);
    if (!path.length) return false;
    const reachable = new Set(getReachableTiles(unit).map((pos) => `${pos.x},${pos.y}`));
    let destination = null;
    for (const step of path) {
        if (!reachable.has(`${step.x},${step.y}`)) break;
        destination = step;
    }
    return destination ? moveUnit(unit, destination.x, destination.y) : false;
}

function findPath(unit, goalTest) {
    const type = getUnitTypeById(unit.typeId);
    const startKey = `${unit.x},${unit.y}`;
    const queue = [{ x: unit.x, y: unit.y }];
    const previous = new Map([[startKey, null]]);
    let goalKey = goalTest(getTile(match, unit.x, unit.y)) ? startKey : null;

    while (queue.length && !goalKey) {
        const current = queue.shift();
        for (const next of getNeighbors8(current.x, current.y)) {
            const tile = getTile(match, next.x, next.y);
            if (!tile) continue;
            const passable = type.category === "ship" ? ["water", "bridge"].includes(tile.terrain) : ["land", "bridge"].includes(tile.terrain);
            if (blocksMovement(unit, getBuildingAt(next.x, next.y))) continue;
            const key = `${next.x},${next.y}`;
            if (!passable || previous.has(key) || (getUnitAt(next.x, next.y) && key !== startKey)) continue;
            previous.set(key, `${current.x},${current.y}`);
            if (goalTest(tile)) {
                goalKey = key;
                break;
            }
            queue.push(next);
        }
    }

    if (!goalKey || goalKey === startKey) return [];
    const path = [];
    for (let key = goalKey; key !== startKey; key = previous.get(key)) {
        const [x, y] = key.split(",").map(Number);
        path.push({ x, y });
    }
    return path.reverse();
}

function findAttackTarget(unit) {
    const playerUnits = getUnitsByOwner("player");
    return playerUnits.find((enemy) => areAtWar(unit.owner, enemy.owner) && canAttack(unit, enemy)) || null;
}

function findAttackableBuilding(unit) {
    return getBuildingsByOwner("player").find((building) => areAtWar(unit.owner, building.owner) && canAttackBuilding(unit, building)) || null;
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

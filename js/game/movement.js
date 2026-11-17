// js/game/movement.js
//
// Bewegungslogik für freie Zielbefehle, Wegfindung und kontinuierlichen
// Vormarsch über das Gelände.

import { match } from "./gameState.js";
import { getUnitTypeById } from "../data/units.js";
import { getTile, getNeighbors8, getDirectionFromDelta } from "./tiles.js";
import { getUnitAt } from "./units.js";
import { setAnimation, setDirection } from "../render/spriteAnimation.js";
import { getBuildingAt } from "./buildings.js";
import { blocksMovement } from "./buildingMovement.js";
import { isVisibleToPlayer } from "./vision.js";
import { areAtWar } from "./diplomacy.js";
import { getResearchBonus } from "./research.js";

/**
 * Liefert angrenzende Felder innerhalb der Bewegungsgeschwindigkeit.
 * Die Echtzeit-Zielbefehle verwenden für längere Wege issueMoveOrder().
 */
export function getReachableTiles(unit) {
    if (unit.hasActed && match.mode !== "realtime") return [];
    const unitType = getUnitTypeById(unit.typeId);
    if (!unitType) return [];
    const maxMovement = Math.max(1, (unitType.movement || 1) + (unitType.category === "ship" ? getResearchBonus(unit.owner, "shipMovement") : 0));
    const queue = [{ x: unit.x, y: unit.y, cost: 0 }];
    const bestCost = new Map([[`${unit.x},${unit.y}`, 0]]);
    const reachable = [];

    while (queue.length) {
        const current = queue.shift();
        if (current.cost >= maxMovement) continue;

        for (const pos of getNeighbors8(current.x, current.y)) {
            const tile = getTile(match, pos.x, pos.y);
            if (!tile) continue;
            if (blocksMovement(unit, getBuildingAt(pos.x, pos.y))) continue;
            const terrainOk = unitType.category === "air" ||
                (unitType.category === "ship" ? ["water", "bridge"].includes(tile.terrain) : ["land", "bridge"].includes(tile.terrain));
            if (!terrainOk || getUnitAt(pos.x, pos.y)) continue;

            const cost = current.cost + 1;
            const key = `${pos.x},${pos.y}`;
            if (cost > maxMovement || (bestCost.has(key) && bestCost.get(key) <= cost)) continue;
            bestCost.set(key, cost);
            reachable.push(pos);
            queue.push({ ...pos, cost });
        }
    }

    return reachable;
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
    if (match.mode !== "realtime") unit.hasActed = true;
    setDirection(unit, direction);
    setAnimation(unit, "walk");

    return true;
}

export function issueMoveOrder(unit, x, y) {
    const path = findPath(unit, x, y);
    if (!path.length) return false;
    unit.moveOrder = { x, y };
    unit.nextMoveAt = performance.now() + 80;
    unit.path = path;
    return true;
}

export function advanceMoveOrders(now, stepCallback) {
    const moving = match.units.filter((unit) => unit.moveOrder).sort((a, b) => a.id.localeCompare(b.id));
    for (const unit of moving) {
        if (unit.owner !== "player" && !areAtWar(unit.owner, "player")) {
            unit.moveOrder = null;
            continue;
        }
        if (now < (unit.nextMoveAt || 0)) continue;
        const goal = unit.moveOrder;
        const path = findPath(unit, goal.x, goal.y);
        if (!path.length) {
            if (unit.x === goal.x && unit.y === goal.y) unit.moveOrder = null;
            else unit.nextMoveAt = now + 450;
            continue;
        }
        const next = path[0];
        const blocker = getUnitAt(next.x, next.y);
        const structure = getBuildingAt(next.x, next.y);
        if ((blocker && blocker !== unit) || blocksMovement(unit, structure)) {
            unit.nextMoveAt = now + 450;
            continue;
        }
        const direction = getDirectionFromDelta(unit.x, unit.y, next.x, next.y);
        unit.x = next.x;
        unit.y = next.y;
        unit.path = path.slice(1);
        const type = getUnitTypeById(unit.typeId);
        const speed = (type?.movement || 1) + (type?.category === "ship" ? getResearchBonus(unit.owner, "shipMovement") : 0);
        unit.nextMoveAt = now + 470 / Math.max(1, speed);
        setDirection(unit, direction);
        setAnimation(unit, "walk");
        if (unit.x === goal.x && unit.y === goal.y) unit.moveOrder = null;
        stepCallback?.(unit);
    }
}

function findPath(unit, goalX, goalY) {
    const type = getUnitTypeById(unit.typeId);
    const target = getTile(match, goalX, goalY);
    if (!type || !target) return [];
    const canEnter = (tile) => type.category === "air" || (type.category === "ship"
        ? ["water", "bridge"].includes(tile.terrain)
        : ["land", "bridge"].includes(tile.terrain));
    const targetOccupant = getUnitAt(goalX, goalY);
    const targetIsHiddenEnemy = unit.owner === "player" && targetOccupant && targetOccupant.owner !== "player" && !isVisibleToPlayer(goalX, goalY);
    const targetBuilding = getBuildingAt(goalX, goalY);
    const targetIsOwnGate = targetBuilding?.typeId === "gate" && targetBuilding.owner === unit.owner;
    const targetIsHiddenBuilding = unit.owner === "player" && targetBuilding && targetBuilding.owner !== "player" && !isVisibleToPlayer(goalX, goalY);
    if (!canEnter(target) || (blocksMovement(unit, targetBuilding) && !targetIsHiddenBuilding && !targetIsOwnGate) || (targetOccupant && targetOccupant !== unit && !targetIsHiddenEnemy)) return [];

    const start = `${unit.x},${unit.y}`;
    const goal = `${goalX},${goalY}`;
    const queue = [{ x: unit.x, y: unit.y }];
    const previous = new Map([[start, null]]);
    while (queue.length) {
        const current = queue.shift();
        const currentKey = `${current.x},${current.y}`;
        if (currentKey === goal) break;
        for (const next of getNeighbors8(current.x, current.y)) {
            const tile = getTile(match, next.x, next.y);
            const key = `${next.x},${next.y}`;
            if (!tile || previous.has(key) || !canEnter(tile)) continue;
            const building = getBuildingAt(next.x, next.y);
            const ownGate = building?.typeId === "gate" && building.owner === unit.owner;
            const hiddenEnemyBuilding = unit.owner === "player" && building?.owner !== "player" && !isVisibleToPlayer(next.x, next.y);
            if (blocksMovement(unit, building) && !hiddenEnemyBuilding && !ownGate) continue;
            const occupant = getUnitAt(next.x, next.y);
            const isHiddenEnemy = unit.owner === "player" && occupant?.owner !== "player" && !isVisibleToPlayer(next.x, next.y);
            if (occupant && occupant !== unit && !isHiddenEnemy) continue;
            previous.set(key, currentKey);
            queue.push(next);
        }
    }
    if (!previous.has(goal)) return [];
    const path = [];
    for (let key = goal; key !== start; key = previous.get(key)) {
        const [x, y] = key.split(",").map(Number);
        path.push({ x, y });
    }
    return path.reverse();
}

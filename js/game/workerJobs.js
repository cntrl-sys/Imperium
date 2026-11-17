import { match } from "./gameState.js";
import { issueMoveOrder } from "./movement.js";
import { getTile } from "./tiles.js";

export function assignWorkerResource(worker, resource, preferredTile = null) {
    if (!worker?.academyTrained || worker.typeId !== "worker" || !["gold", "wood", "stone", "wheat"].includes(resource)) return false;
    worker.gatheringResource = resource;
    worker.resourceCheckAt = 0;
    worker.moveOrder = null;
    worker.path = [];
    sendWorkerToNextDeposit(worker, true, preferredTile);
    return true;
}

export function advanceWorkerResourceOrders(now = performance.now()) {
    for (const worker of match.units) {
        if (!worker.academyTrained || worker.typeId !== "worker" || !worker.gatheringResource || now < (worker.resourceCheckAt || 0)) continue;
        const current = getTile(match, worker.x, worker.y);
        if (current?.resource === worker.gatheringResource && current.resourceAmount > 0) continue;
        if (worker.moveOrder) continue;
        sendWorkerToNextDeposit(worker, false);
    }
}

function sendWorkerToNextDeposit(worker, immediate, preferredTile = null) {
    const candidates = match.tiles.flat().filter((tile) => tile.resource === worker.gatheringResource && tile.resourceAmount > 0)
        .sort((a, b) => {
            const aPreferred = a.x === preferredTile?.x && a.y === preferredTile?.y ? -1 : 0;
            const bPreferred = b.x === preferredTile?.x && b.y === preferredTile?.y ? -1 : 0;
            return aPreferred - bPreferred || (Math.abs(a.x - worker.x) + Math.abs(a.y - worker.y)) - (Math.abs(b.x - worker.x) + Math.abs(b.y - worker.y));
        });
    for (const tile of candidates) {
        if (tile.x === worker.x && tile.y === worker.y) return true;
        if (issueMoveOrder(worker, tile.x, tile.y)) return true;
    }
    worker.resourceCheckAt = performance.now() + (immediate ? 1200 : 2500);
    return false;
}

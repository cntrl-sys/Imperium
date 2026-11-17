// Gemeinsame deterministische Verteilung von Goldadern auf neuen und
// bereits gespeicherten Karten.

export function isGoldDeposit(x, y, mapId) {
    return goldSeed(x, y, mapId) >= 0.965;
}

export function ensureGoldDeposits(tiles, mapId, occupied = []) {
    const occupiedKeys = new Set(occupied.map(({ x, y }) => `${x},${y}`));
    let added = 0;
    for (const row of tiles) for (const tile of row) {
        if (tile.terrain !== "land" || tile.resource || !["plain", "highland", "sand", "dune"].includes(tile.feature)) continue;
        if (occupiedKeys.has(`${tile.x},${tile.y}`) || !isGoldDeposit(tile.x, tile.y, mapId)) continue;
        tile.resource = "gold";
        tile.resourceAmount = 8;
        added++;
    }
    return added;
}

function goldSeed(x, y, mapId) {
    return Math.abs(Math.sin(x * 59.31 + y * 137.77 + mapId.length * 23.41) * 19483.129) % 1;
}

// js/game/tiles.js
//
// Grundlegende Hilfsfunktionen rund um die Tile-Struktur der Karte.
// Kennt nichts von Einheiten, Kampf oder Runden — nur Terrain & Geometrie.

/**
 * Die 8 Richtungen inkl. ihrer (dx, dy)-Verschiebung.
 */
export const DIRECTIONS = {
    N: { dx: 0, dy: -1 },
    NE: { dx: 1, dy: -1 },
    E: { dx: 1, dy: 0 },
    SE: { dx: 1, dy: 1 },
    S: { dx: 0, dy: 1 },
    SW: { dx: -1, dy: 1 },
    W: { dx: -1, dy: 0 },
    NW: { dx: -1, dy: -1 }
};

export function getTile(match, x, y) {
    if (!inBounds(match, x, y)) return null;
    return match.tiles[y][x];
}

export function inBounds(match, x, y) {
    return x >= 0 && y >= 0 && x < match.map.width && y < match.map.height;
}

export function isLandTile(match, x, y) {
    const tile = getTile(match, x, y);
    return !!tile && tile.terrain === "land";
}

export function isWaterTile(match, x, y) {
    const tile = getTile(match, x, y);
    return !!tile && tile.terrain === "water";
}

/**
 * Distanz im 8-Richtungs-Tile-System (Diagonalen zählen wie orthogonale
 * Schritte, entspricht der Chebyshev-Distanz).
 */
export function tileDistance(x1, y1, x2, y2) {
    return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

/**
 * Liefert alle 8 direkt angrenzenden Koordinaten (auch außerhalb der Karte,
 * das Filtern übernimmt der Aufrufer).
 */
export function getNeighbors8(x, y) {
    return Object.values(DIRECTIONS).map(({ dx, dy }) => ({ x: x + dx, y: y + dy }));
}

/**
 * Berechnet die Blickrichtung (eine der 8 Richtungen) aus einer Bewegung
 * von (fromX, fromY) nach (toX, toY).
 */
export function getDirectionFromDelta(fromX, fromY, toX, toY) {
    const dx = Math.sign(toX - fromX);
    const dy = Math.sign(toY - fromY);
    for (const [name, dir] of Object.entries(DIRECTIONS)) {
        if (dir.dx === dx && dir.dy === dy) return name;
    }
    return "S";
}

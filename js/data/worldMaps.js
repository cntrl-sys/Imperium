// Datengetriebene Szenarien: Kartenbild, Größe, Gegnerzahl und Terrain.
import { isGoldDeposit } from "./goldDeposits.js";
import { SAPHIRMEER_WIDTH, SAPHIRMEER_HEIGHT, saphirmeerLandMask, saphirmeerFeatureMask, saphirmeerStarts } from "./saphirmeerTerrain.js";

export const MAP_WIDTH = 42;
export const MAP_HEIGHT = 28;
export const ARCHIPELAGO_WIDTH = 84;
export const ARCHIPELAGO_HEIGHT = 56;

export function getMapDimensions(mapId) {
    return mapId === "saphirmeer"
        ? { width: SAPHIRMEER_WIDTH, height: SAPHIRMEER_HEIGHT }
        : mapId === "inselarchipel"
        ? { width: ARCHIPELAGO_WIDTH, height: ARCHIPELAGO_HEIGHT }
        : { width: MAP_WIDTH, height: MAP_HEIGHT };
}

export const maps = [
    {
        id: "goldene-ebene",
        name: "Goldene Ebene",
        image: "assets/maps/map-goldene-ebene.svg",
        description: "Offenes Kernland mit einem großen Binnenmeer und Raum für weite Feldzüge.",
        opponents: 2
    },
    {
        id: "nordmark",
        name: "Nordmark",
        image: "assets/maps/map-nordmark.svg",
        description: "Ein raues Grenzland, dessen Flussläufe den Vormarsch in enge Korridore lenken.",
        opponents: 2
    },
    {
        id: "wuestenpfad",
        name: "Wüstenpfad",
        image: "assets/maps/map-wuestenpfad.svg",
        description: "Ein weiter Wüstenkorridor mit Oasen und langen Wegen zwischen den Reichen.",
        opponents: 3
    },
    {
        id: "inselarchipel",
        name: "Inselarchipel",
        image: "assets/maps/map-inselarchipel.svg",
        description: "Ein weitläufiges Inselmeer mit frei wählbaren Reichen, vielen neutralen Inseln und Diplomatie.",
        opponents: 4
    },
    {
        id: "saphirmeer",
        name: "Saphirmeer",
        image: "assets/maps/map-saphirmeer.png",
        description: "Eine gemalte Inselwelt mit großem Kernland, getrennten Reichen und schiffbaren Wasserwegen.",
        opponents: 4,
        opponentCountSelectable: true
    },
    {
        id: "bergpass",
        name: "Bergpass",
        image: "assets/maps/map-bergpass.svg",
        description: "Ein schmaler Durchgang durch ein zerklüftetes Hochland mit mehreren Fronten.",
        opponents: 4
    },
    {
        id: "flussdelta",
        name: "Flussdelta",
        image: "assets/maps/map-flussdelta.svg",
        description: "Ein verzweigtes Delta, dessen Flüsse drei Reiche voneinander trennen.",
        opponents: 3
    }
];

export function getMapById(id) {
    return maps.find((map) => map.id === id) || maps[0];
}

function getEnemyCapitals(count, width = MAP_WIDTH, height = MAP_HEIGHT) {
    const positions = [
        { x: Math.floor(width / 2), y: 3 },
        { x: 6, y: Math.floor(height / 2) },
        { x: width - 7, y: Math.floor(height / 2) },
        { x: 12, y: 5 }
    ];
    return positions.slice(0, count);
}

function getArchipelagoSettlements(width, height) {
    const xs = [0.14, 0.5, 0.86].map((ratio) => Math.round(width * ratio));
    const ys = [0.16, 0.5, 0.84].map((ratio) => Math.round(height * ratio));
    return ys.flatMap((y) => xs.map((x) => ({ x, y })));
}

function getArchipelagoSpawns(count, width, height) {
    const settlements = getArchipelagoSettlements(width, height);
    const playerIndex = 4;
    const player = settlements[playerIndex];
    const enemies = settlements.filter((_, index) => index !== playerIndex).slice(0, Math.max(1, Math.min(8, count)));
    return { player, enemies };
}

function getArchipelagoIslands(width, height) {
    const settlements = getArchipelagoSettlements(width, height);
    const islands = settlements.map((point) => ({ ...point, rx: 5.3, ry: 4.2, neutral: false }));
    for (let y = 5, row = 0; y < height - 4; y += 9, row++) {
        for (let x = 5, column = 0; x < width - 4; x += 10, column++) {
            const seed = Math.abs(Math.sin((row + 3) * 91.7 + (column + 7) * 37.1) * 19483.129) % 1;
            const center = { x: x + Math.round((seed - 0.5) * 3), y: y + Math.round((1 - seed - 0.5) * 2) };
            if (settlements.some((point) => Math.hypot((center.x - point.x) * 0.85, center.y - point.y) < 7.8)) continue;
            islands.push({ ...center, rx: 2.4 + seed * 1.1, ry: 1.8 + (1 - seed) * 0.8, neutral: true });
        }
    }
    return islands;
}

function getPort(capital, width = MAP_WIDTH, height = MAP_HEIGHT, isIsland = false) {
    let dx = capital.x < width * 0.28 ? -1 : capital.x > width * 0.72 ? 1 : 0;
    let dy = capital.y < height * 0.28 ? -1 : capital.y > height * 0.72 ? 1 : 0;
    if (isIsland) {
        if (capital.x < width * 0.28) { dx = -1; dy = 0; }
        else if (capital.x > width * 0.72) { dx = 1; dy = 0; }
        else { dx = 0; dy = capital.y < height / 2 ? -1 : 1; }
    }
    const distance = isIsland ? (dx ? 5 : 4) : 2;
    const outwardX = dx || (capital.x < width / 2 ? -1 : 1);
    const outwardY = dy || (capital.y < height / 2 ? -1 : 1);
    return isIsland
        ? { x: capital.x + dx * distance, y: capital.y + dy * distance }
        : { x: capital.x + outwardX * distance, y: capital.y + outwardY * (dx ? 1 : 2) };
}

const terrainPatterns = {
    "goldene-ebene": (x, y) => Math.hypot(x - MAP_WIDTH * 0.52, y - MAP_HEIGHT * 0.48) < 4.2 ? "water" : "land",
    nordmark: (x, y) => Math.abs(y - (x * 0.47 + 3) - Math.sin(x / 4) * 1.2) < 1.15 ? "water" : "land",
    wuestenpfad: (x, y) => {
        const riverY = MAP_HEIGHT * 0.5 + Math.sin(x / 4.4) * 2.8;
        const river = Math.abs(y - riverY) < 1.1;
        const oasisOne = Math.hypot(x - 17, y - 8) < 2.8;
        const oasisTwo = Math.hypot(x - 30, y - 20) < 3;
        return river || oasisOne || oasisTwo ? "water" : "land";
    },
    bergpass: (x, y) => {
        const ridge = Math.abs(x - (MAP_WIDTH / 2 + Math.sin(y / 3) * 1.8));
        return ridge < 2.5 && Math.abs(y - MAP_HEIGHT / 2) > 2 ? "water" : "land";
    },
    flussdelta: (x, y) => {
        const center = MAP_HEIGHT * 0.52 + Math.sin(x / 5) * 1.2;
        const fork = Math.abs(x - MAP_WIDTH / 2) / 8;
        return Math.abs(y - center) < 1.05 || (x > MAP_WIDTH / 2 && Math.abs(Math.abs(y - center) - fork * 5) < 0.8) ? "water" : "land";
    }
};

function featureFor(x, y, mapId) {
    const hash = Math.abs(Math.sin(x * 127.1 + y * 311.7 + mapId.length * 19.19) * 43758.5453) % 1;
    if (mapId === "wuestenpfad") {
        const duneBands = Math.sin(x * 0.31 + Math.sin(y * 0.18) * 1.2) + Math.cos(y * 0.24 - x * 0.1) * 0.42;
        return duneBands + hash * 0.24 > 0.42 ? "dune" : "sand";
    }
    const forestMass = Math.sin(x * 0.27 + Math.sin(y * 0.2) * 1.5) + Math.cos(y * 0.34 - x * 0.13) * 0.68;
    const ridgeMass = Math.sin(x * 0.24 + y * 0.3) + Math.cos(x * 0.18 - y * 0.22) * 0.82;
    if (forestMass + hash * 0.48 > 1.05) return "forest";
    if (ridgeMass + hash * 0.35 > 1.35) return "highland";
    return "plain";
}

export function getMapSpawns(mapId, options = {}) {
    const map = getMapById(mapId);
    const { width, height } = getMapDimensions(mapId);
    const opponentCount = Math.max(1, Math.min(8, Number(options.opponentCount) || map.opponents));
    const archipelago = mapId === "inselarchipel" ? getArchipelagoSpawns(opponentCount, width, height) : null;
    const illustratedStarts = mapId === "saphirmeer" ? saphirmeerStarts : null;
    const playerCapital = archipelago?.player || { x: Math.floor(width / 2), y: height - 5 };
    const illustratedPlayer = illustratedStarts?.[0]?.capital;
    const enemyCapitals = illustratedStarts
        ? illustratedStarts.slice(1, opponentCount + 1).map((start) => start.capital)
        : archipelago?.enemies || getEnemyCapitals(map.opponents, width, height);
    const selectedPlayerCapital = illustratedPlayer || playerCapital;
    return {
        player: {
            capital: selectedPlayerCapital,
            port: illustratedStarts?.[0]?.port || getPort(selectedPlayerCapital, width, height, Boolean(archipelago))
        },
        enemies: enemyCapitals.map((capital, index) => ({
            owner: `enemy-${index + 1}`,
            capital,
            port: illustratedStarts?.[index + 1]?.port || getPort(capital, width, height, Boolean(archipelago))
        }))
    };
}

export function generateMapTiles(mapId, options = {}) {
    const { width, height } = getMapDimensions(mapId);
    const islands = mapId === "inselarchipel" ? getArchipelagoIslands(width, height) : [];
    const pattern = terrainPatterns[mapId] || terrainPatterns["goldene-ebene"];
    const spawns = getMapSpawns(mapId, options);
    if (mapId === "inselarchipel") {
        const settlements = new Map([[`${spawns.player.capital.x},${spawns.player.capital.y}`, "player"]]);
        spawns.enemies.forEach((spawn) => settlements.set(`${spawn.capital.x},${spawn.capital.y}`, spawn.owner));
        islands.forEach((island) => {
            island.owner = settlements.get(`${island.x},${island.y}`) || null;
            island.neutral = !island.owner;
        });
    }
    const tiles = Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) => {
            const isBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1;
            const terrain = isBorder ? "water" : mapId === "inselarchipel"
                ? (isArchipelagoLand(x, y, islands) ? "land" : "water")
                : mapId === "saphirmeer"
                    ? (saphirmeerLandMask[y][x] === "#" ? "land" : "water")
                    : pattern(x, y);
            const illustratedFeatures = { f: "forest", h: "highland", d: "sand", p: "plain" };
            const feature = terrain !== "land" ? "water" : mapId === "saphirmeer"
                ? illustratedFeatures[saphirmeerFeatureMask[y][x]] || "plain"
                : featureFor(x, y, mapId);
            const resource = terrain === "land" ? resourceFor(feature, x, y, mapId) : null;
            return { x, y, terrain, feature, resource, resourceAmount: resource === "gold" ? 8 : resource ? 4 : 0 };
        })
    );

    carveNavigableWaterways(tiles, mapId);
    if (mapId !== "inselarchipel" && mapId !== "saphirmeer") {
        for (const enemy of spawns.enemies) carveLandRoute(tiles, enemy.capital, spawns.player.capital);
    }
    for (const spawn of [spawns.player, ...spawns.enemies]) {
        forceTerrain(tiles, spawn.capital, "land");
        forceTerrain(tiles, spawn.port, "land");
        const waterNeighbor = mapId === "saphirmeer"
            ? getAdjacentWaterNeighbor(tiles, spawn.port)
            : {
                x: spawn.port.x + Math.sign(spawn.port.x - spawn.capital.x),
                y: spawn.port.y + Math.sign(spawn.port.y - spawn.capital.y)
            };
        forceTerrain(tiles, waterNeighbor, "water");
    }

    return { width, height, tiles, islands };
}

function getAdjacentWaterNeighbor(tiles, origin) {
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]]) {
        const x = origin.x + dx, y = origin.y + dy;
        if (tiles[y]?.[x]?.terrain === "water") return { x, y };
    }
    return { x: origin.x, y: origin.y };
}

function isArchipelagoLand(x, y, islands) {
    return islands.some((island) => {
        const angle = Math.atan2(y - island.y, x - island.x);
        const coast = 0.91 + Math.sin(angle * 3 + island.x * 0.07) * 0.05 + Math.cos(angle * 5 - island.y * 0.11) * 0.04;
        return ((x - island.x) / island.rx) ** 2 + ((y - island.y) / island.ry) ** 2 < coast;
    });
}

function carveNavigableWaterways(tiles, mapId) {
    if (mapId === "goldene-ebene") {
        // Eine schmale Flussmündung verbindet den Binnensee mit der Ostküste.
        for (let x = 22; x < MAP_WIDTH; x++) {
            const y = Math.round(MAP_HEIGHT * 0.5 + (x - 22) * 0.16);
            forceTerrain(tiles, { x, y }, "water");
        }
    } else if (mapId === "wuestenpfad") {
        // Zwei Oasenbecken münden in den schiffbaren Hauptfluss.
        for (let y = 8; y <= 12; y++) forceTerrain(tiles, { x: 17, y }, "water");
        for (let y = 16; y <= 20; y++) forceTerrain(tiles, { x: 30, y }, "water");
    }
}

function carveLandRoute(tiles, start, goal) {
    let x = start.x;
    let y = start.y;
    const dx = goal.x - start.x;
    const dy = goal.y - start.y;
    const length = Math.max(Math.abs(dx), Math.abs(dy));
    if (!length) { carveRoadTile(tiles, x, y); return; }
    const distance = Math.hypot(dx, dy);
    const bend = (((start.x * 13 + goal.x * 17 + start.y * 7 + goal.y * 11) % 5) - 2) * 0.7;
    for (let step = 1; step <= length; step++) {
        const t = step / length;
        const curve = Math.sin(Math.PI * t) * bend;
        const targetX = Math.round(start.x + dx * t - (dy / distance) * curve);
        const targetY = Math.round(start.y + dy * t + (dx / distance) * curve);
        while (x !== targetX || y !== targetY) {
            carveRoadTile(tiles, x, y);
            if (x !== targetX) x += Math.sign(targetX - x);
            if (y !== targetY) y += Math.sign(targetY - y);
        }
    }
    carveRoadTile(tiles, goal.x, goal.y);
}

function carveRoadTile(tiles, x, y) {
    const tile = tiles[y]?.[x];
    if (!tile) return;
    tile.resource = null;
    tile.resourceAmount = 0;
    if (tile.terrain === "water") {
        tile.terrain = "bridge";
        tile.feature = "bridge";
    } else {
        tile.terrain = "land";
        tile.feature = "road";
    }
}

function forceTerrain(tiles, { x, y }, terrain) {
    if (!tiles[y] || !tiles[y][x]) return;
    tiles[y][x].terrain = terrain;
    tiles[y][x].feature = terrain === "land" ? "plain" : "water";
    tiles[y][x].resource = null;
    tiles[y][x].resourceAmount = 0;
}

function resourceFor(feature, x, y, mapId) {
    const seed = Math.abs(Math.sin(x * 73.13 + y * 157.91) * 24634.6345) % 1;
    if (feature === "forest" && seed < 0.25) return "wood";
    if (feature === "highland" && seed < 0.3) return "stone";
    if ((feature === "plain" || feature === "sand") && seed < 0.09) return "wheat";
    if (["plain", "highland", "sand", "dune"].includes(feature) && isGoldDeposit(x, y, mapId)) return "gold";
    return null;
}

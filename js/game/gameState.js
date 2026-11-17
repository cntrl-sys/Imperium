// js/game/gameState.js
//
// Zentraler Zustand für eine laufende Partie (im Gegensatz zum
// Navigations-State in js/game.js, der nur Screen-Wechsel und die
// Auswahl von Nation/Karte verwaltet).
//
// "match" ist die einzige Quelle der Wahrheit für alles, was während des
// laufenden Spiels passiert: Spielzeit, Ressourcen,
// Einheiten, Hauptstädte, Häfen, Sieg/Niederlage.

import { getNationById, nations } from "../data/nations.js";
import { getMapById, generateMapTiles, getMapSpawns } from "../data/worldMaps.js";
import { getUnitTypeById } from "../data/units.js";
import { getBuildingTypeById } from "../data/structureTypes.js";
import { ensureDiplomacy } from "./diplomacy.js";

const STARTING_GOLD = 100;

export const match = {
    turn: 1,
    mode: "realtime",
    elapsedSeconds: 0,
    phase: "player", // legacy save compatibility
    map: null, // { id, width, height }
    tiles: [], // tiles[y][x] = { x, y, terrain }

    players: [], // { id, nationId, isHuman, resources: { gold } }

    units: [], // { id, typeId, owner, x, y, health, hasActed, direction, animation }
    nextUnitId: 1,

    capitals: [], // { id, owner, x, y, type: "capital", destroyed }
    ports: [], // { id, owner, x, y, type: "port" }
    buildings: [],
    nextBuildingId: 1,

    selectedUnitId: null,
    selectedUnitIds: [],
    visibility: null,
    diplomacy: null,
    goldDepositsVersion: 0,

    gameOver: null // null | "win" | "lose"
};

/**
 * Initialisiert eine neue Partie anhand der zuvor gewählten Nation und
 * Karte. Erzeugt Spieler, Bot, Hauptstädte, Häfen und eine kleine
 * Startaufstellung.
 */
export function initMatch(nationId, mapId, options = {}) {
    const nation = getNationById(nationId);
    const mapMeta = getMapById(mapId);
    const generated = generateMapTiles(mapId, options);
    const spawns = getMapSpawns(mapId, options);

    match.turn = 1;
    match.mode = "realtime";
    match.elapsedSeconds = 0;
    match.phase = "player";
    match.map = {
        id: mapId, name: mapMeta ? mapMeta.name : mapId, image: mapMeta?.image || null, width: generated.width, height: generated.height,
        opponentCount: spawns.enemies.length, islands: generated.islands
    };
    match.tiles = generated.tiles;
    match.goldDepositsVersion = 1;

    const opponents = pickBotNations(nationId, spawns.enemies.length);
    const aiProfiles = shuffle([
        { aiStrategy: "raider", goldPerTurn: 32, damageBonus: 0, startGold: 250 },
        { aiStrategy: "marksman", goldPerTurn: 30, damageBonus: 1, startGold: 240 },
        { aiStrategy: "engineer", goldPerTurn: 38, damageBonus: 1, startGold: 175 },
        { aiStrategy: "veteran", goldPerTurn: 45, damageBonus: 2, startGold: 200 }
    ]);
    match.players = [
        {
            id: "player",
            nationId: nation ? nation.id : nationId,
            isHuman: true,
            goldPerTurn: STARTING_GOLD / 4,
            tradeUsedTurn: 0,
            research: { completed: [], active: null },
            resources: { gold: STARTING_GOLD, wheat: 0, wood: 0, stone: 0 }
        },
        ...spawns.enemies.map((spawn, index) => ({
            id: spawn.owner,
            nationId: opponents[index].id,
            isHuman: false,
            ...aiProfiles[index % aiProfiles.length],
            tradeUsedTurn: 0,
            research: { completed: [], active: null },
            resources: { gold: aiProfiles[index % aiProfiles.length].startGold, wheat: 12, wood: 12, stone: 12 }
        }))
    ];
    match.diplomacy = {};
    ensureDiplomacy();

    const allSpawns = [{ owner: "player", ...spawns.player }, ...spawns.enemies];
    match.capitals = allSpawns.map(({ owner, capital }) => ({
        id: `${owner}-capital`, owner, x: capital.x, y: capital.y, type: "capital", destroyed: false,
        siegeProgress: 0, siegeOwner: null
    }));
    match.ports = allSpawns.map(({ owner, port }) => ({
        id: `${owner}-port`, owner, x: port.x, y: port.y, type: "port"
    }));

    match.units = [];
    match.buildings = [];
    match.nextBuildingId = 1;
    match.nextUnitId = 1;
    match.selectedUnitId = null;
    match.selectedUnitIds = [];
    match.visibility = null;
    match.gameOver = null;
    match.events = [];

    // Kleine Startaufstellung, damit der Ablauf sofort testbar ist.
    // Datengetrieben über die zentralen Unit-Daten, keine feste Sonderlogik.
    for (const [index, spawn] of allSpawns.entries()) {
        if (["inselarchipel", "saphirmeer"].includes(mapId) && spawn.owner !== "player") {
            const passenger = createUnit(spawn.owner, "soldier", spawn.capital.x, spawn.capital.y);
            const shipPosition = findWaterNeighbor(generated.tiles, spawn.port);
            const ship = spawnUnitInternal(spawn.owner, "warship", shipPosition.x, shipPosition.y);
            ship.cargo = [passenger];
        } else {
            spawnUnitInternal(spawn.owner, "soldier", spawn.capital.x, spawn.capital.y);
            if (spawn.owner !== "player") {
                const guard = getNearbyFreeLand(spawn.capital);
                if (guard) spawnUnitInternal(spawn.owner, "archer", guard.x, guard.y);
            }
        }
        if (spawn.owner !== "player" && ["engineer", "veteran"].includes(match.players[index].aiStrategy)) {
            const type = getBuildingTypeById("barracks");
            const tile = getNearbyFreeLand(spawn.capital);
            if (tile) {
                match.buildings.push({
                    id: `building-${match.nextBuildingId++}`, typeId: "barracks", owner: spawn.owner,
                    x: tile.x, y: tile.y, health: type.health, maxHealth: type.health, destroyed: false
                });
            }
        }
    }

    return match;
}

function getNearbyFreeLand(origin) {
    for (let radius = 1; radius <= 3; radius++) {
        for (let y = origin.y - radius; y <= origin.y + radius; y++) {
            for (let x = origin.x - radius; x <= origin.x + radius; x++) {
                if (Math.max(Math.abs(x - origin.x), Math.abs(y - origin.y)) !== radius) continue;
                const tile = match.tiles[y]?.[x];
                if (!tile || tile.terrain !== "land" || match.units.some((unit) => unit.x === x && unit.y === y) || match.buildings.some((building) => building.x === x && building.y === y)) continue;
                if (match.capitals.some((capital) => capital.x === x && capital.y === y) || match.ports.some((port) => port.x === x && port.y === y)) continue;
                return { x, y };
            }
        }
    }
    return null;
}

function pickBotNations(playerNationId, count) {
    return shuffle(nations.filter((nation) => nation.id !== playerNationId)).slice(0, count);
}

function shuffle(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index--) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
}

function spawnUnitInternal(owner, typeId, x, y) {
    const unit = createUnit(owner, typeId, x, y);
    match.units.push(unit);
    return unit;
}

function createUnit(owner, typeId, x, y) {
    const unitType = getUnitTypeById(typeId);
    const unit = {
        id: `unit-${match.nextUnitId++}`,
        typeId,
        owner,
        x,
        y,
        health: unitType ? unitType.health : 10,
        hasActed: false,
        direction: owner === "player" ? "E" : "W",
        animation: { state: "idle", direction: owner === "player" ? "E" : "W", frame: 0, elapsed: 0 }
    };
    if (unitType?.transportCapacity) unit.cargo = [];
    return unit;
}

function findWaterNeighbor(tiles, origin) {
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const tile = tiles[origin.y + dy]?.[origin.x + dx];
            if (tile?.terrain === "water") return { x: tile.x, y: tile.y };
        }
    }
    return { x: origin.x, y: origin.y };
}

export function getPlayerById(playerId) {
    return match.players.find((p) => p.id === playerId) || null;
}

export function getCapitalByOwner(owner) {
    return match.capitals.find((c) => c.owner === owner) || null;
}

export function getPortByOwner(owner) {
    return match.ports.find((p) => p.owner === owner) || null;
}

export function getSelectedUnit() {
    if (!match.selectedUnitId) return null;
    return match.units.find((u) => u.id === match.selectedUnitId) || null;
}

export function getSelectedUnits() {
    const ids = match.selectedUnitIds?.length ? match.selectedUnitIds : [match.selectedUnitId];
    return ids.map((id) => match.units.find((unit) => unit.id === id)).filter((unit) => unit?.owner === "player");
}

export function selectUnit(unitId) {
    match.selectedUnitId = unitId;
    match.selectedUnitIds = unitId ? [unitId] : [];
}

export function selectUnits(unitIds) {
    match.selectedUnitIds = [...new Set(unitIds)].filter((id) => match.units.some((unit) => unit.id === id && unit.owner === "player"));
    match.selectedUnitId = match.selectedUnitIds[0] || null;
}

export function clearSelection() {
    match.selectedUnitId = null;
    match.selectedUnitIds = [];
}

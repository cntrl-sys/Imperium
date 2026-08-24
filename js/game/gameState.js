// js/game/gameState.js
//
// Zentraler Zustand für eine laufende Partie (im Gegensatz zum
// Navigations-State in js/game.js, der nur Screen-Wechsel und die
// Auswahl von Nation/Karte verwaltet).
//
// "match" ist die einzige Quelle der Wahrheit für alles, was während des
// eigentlichen rundenbasierten Spiels passiert: Runde, Ressourcen,
// Einheiten, Hauptstädte, Häfen, Sieg/Niederlage.

import { getNationById, nations } from "../data/nations.js";
import { getMapById, generateMapTiles, getMapSpawns } from "../data/maps.js";
import { getUnitTypeById } from "../data/units.js";

const STARTING_GOLD = 100;

export const match = {
    turn: 1,
    phase: "player", // "player" | "bot"
    map: null, // { id, width, height }
    tiles: [], // tiles[y][x] = { x, y, terrain }

    players: [], // { id, nationId, isHuman, resources: { gold } }

    units: [], // { id, typeId, owner, x, y, health, hasActed, direction, animation }
    nextUnitId: 1,

    capitals: [], // { id, owner, x, y, type: "capital", destroyed }
    ports: [], // { id, owner, x, y, type: "port" }

    selectedUnitId: null,

    gameOver: null // null | "win" | "lose"
};

/**
 * Initialisiert eine neue Partie anhand der zuvor gewählten Nation und
 * Karte. Erzeugt Spieler, Bot, Hauptstädte, Häfen und eine kleine
 * Startaufstellung.
 */
export function initMatch(nationId, mapId) {
    const nation = getNationById(nationId);
    const mapMeta = getMapById(mapId);
    const generated = generateMapTiles(mapId);
    const spawns = getMapSpawns(mapId);

    match.turn = 1;
    match.phase = "player";
    match.map = { id: mapId, name: mapMeta ? mapMeta.name : mapId, width: generated.width, height: generated.height };
    match.tiles = generated.tiles;

    // Bot bekommt vorerst irgendeine andere Nation als der Spieler
    // (rein für Farbe/Darstellung — Diplomatie o.ä. gibt es noch nicht).
    const botNation = pickBotNation(nationId);

    match.players = [
        {
            id: "player",
            nationId: nation ? nation.id : nationId,
            isHuman: true,
            resources: { gold: STARTING_GOLD }
        },
        {
            id: "bot",
            nationId: botNation.id,
            isHuman: false,
            resources: { gold: STARTING_GOLD }
        }
    ];

    match.capitals = [
        {
            id: "player-capital",
            owner: "player",
            x: spawns.player.capital.x,
            y: spawns.player.capital.y,
            type: "capital",
            destroyed: false
        },
        {
            id: "bot-capital",
            owner: "bot",
            x: spawns.bot.capital.x,
            y: spawns.bot.capital.y,
            type: "capital",
            destroyed: false
        }
    ];

    match.ports = [
        { id: "player-port", owner: "player", x: spawns.player.port.x, y: spawns.player.port.y, type: "port" },
        { id: "bot-port", owner: "bot", x: spawns.bot.port.x, y: spawns.bot.port.y, type: "port" }
    ];

    match.units = [];
    match.nextUnitId = 1;
    match.selectedUnitId = null;
    match.gameOver = null;

    // Kleine Startaufstellung, damit der Ablauf sofort testbar ist.
    // Datengetrieben über die zentralen Unit-Daten, keine feste Sonderlogik.
    spawnUnitInternal("player", "soldier", spawns.player.capital.x, spawns.player.capital.y);
    spawnUnitInternal("bot", "soldier", spawns.bot.capital.x, spawns.bot.capital.y);

    return match;
}

function pickBotNation(playerNationId) {
    // Nimmt einfach die erste Nation aus der Liste, die nicht der Spieler ist.
    return nations.find((n) => n.id !== playerNationId) || nations[0];
}

function spawnUnitInternal(owner, typeId, x, y) {
    const unitType = getUnitTypeById(typeId);
    match.units.push({
        id: `unit-${match.nextUnitId++}`,
        typeId,
        owner,
        x,
        y,
        health: unitType ? unitType.health : 10,
        hasActed: false,
        direction: owner === "player" ? "E" : "W",
        animation: { state: "idle", direction: owner === "player" ? "E" : "W", frame: 0, elapsed: 0 }
    });
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

export function selectUnit(unitId) {
    match.selectedUnitId = unitId;
}

export function clearSelection() {
    match.selectedUnitId = null;
}

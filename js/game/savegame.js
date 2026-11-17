import { match } from "./gameState.js";
import { ensureGoldDeposits } from "../data/goldDeposits.js";
import { ensureDiplomacy } from "./diplomacy.js";

const STORAGE_KEY = "imperivm.save.v1";
const SAVE_VERSION = 1;

export function saveCurrentMatch() {
    if (!match.map || !match.players.length) return false;
    try {
        const payload = { version: SAVE_VERSION, savedAt: new Date().toISOString(), match };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        return true;
    } catch (error) {
        console.warn("Der Spielstand konnte nicht automatisch gespeichert werden.", error);
        return false;
    }
}

export function getSavedGame() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const payload = JSON.parse(raw);
        return isValidSave(payload) ? payload : null;
    } catch {
        return null;
    }
}

export function restoreSavedMatch() {
    const payload = getSavedGame();
    if (!payload) return false;
    Object.assign(match, payload.match);
    match.mode = "realtime";
    match.elapsedSeconds ||= 0;
    match.selectedUnitIds ||= match.selectedUnitId ? [match.selectedUnitId] : [];
    match.units.forEach((unit) => {
        if (unit.moveOrder) unit.nextMoveAt = 0;
    });
    match.events ||= [];
    match.players.forEach((player) => { player.research ||= { completed: [], active: null }; });
    match.buildings ||= [];
    match.nextBuildingId ||= match.buildings.length + 1;
    ensureDiplomacy();
    if ((match.goldDepositsVersion || 0) < 1) {
        const occupied = [...match.units, ...match.capitals, ...match.ports, ...match.buildings];
        ensureGoldDeposits(match.tiles, match.map.id, occupied);
        match.goldDepositsVersion = 1;
    }
    return true;
}

export function importSavedGameText(text) {
    try {
        const payload = JSON.parse(text);
        if (!isValidSave(payload)) return { ok: false, reason: "Die Datei enthält keinen gültigen IMPERIVM-Spielstand." };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        return { ok: true };
    } catch {
        return { ok: false, reason: "Der Spielstand konnte nicht gelesen oder lokal gespeichert werden." };
    }
}

export function exportSavedGame() {
    const payload = getSavedGame();
    if (!payload) return false;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const elapsed = Math.floor(payload.match.elapsedSeconds || 0);
    link.download = `imperivm-spielstand-${String(Math.floor(elapsed / 60)).padStart(2, "0")}-${String(elapsed % 60).padStart(2, "0")}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
}

function isValidSave(payload) {
    const savedMatch = payload?.match;
    return payload?.version === SAVE_VERSION &&
        savedMatch && Number.isInteger(savedMatch.turn) && savedMatch.turn > 0 &&
        savedMatch.map && typeof savedMatch.map.id === "string" &&
        Array.isArray(savedMatch.tiles) && savedMatch.tiles.length > 0 &&
        Array.isArray(savedMatch.players) && savedMatch.players.some((player) => player.id === "player") &&
        Array.isArray(savedMatch.units) && Array.isArray(savedMatch.capitals) && Array.isArray(savedMatch.ports);
}

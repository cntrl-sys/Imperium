import { match, getPlayerById } from "./gameState.js";
import { getTechnologyById } from "../data/technologies.js";
import { recordEvent, getRealmName } from "./events.js";

function ensureResearch(player) {
    player.research ||= { completed: [], active: null };
    player.research.completed ||= [];
    return player.research;
}

export function startResearch(ownerId, technologyId) {
    const player = getPlayerById(ownerId);
    const technology = getTechnologyById(technologyId);
    if (!player || !technology) return { ok: false, reason: "Diese Forschung ist nicht verfügbar." };
    const research = ensureResearch(player);
    if (!match.buildings.some((building) => building.owner === ownerId && building.typeId === "academy" && !building.destroyed)) return { ok: false, reason: "Errichte zuerst eine Akademie." };
    if (research.active) return { ok: false, reason: "Es läuft bereits eine Forschung." };
    if (research.completed.includes(technologyId)) return { ok: false, reason: "Diese Technologie wurde bereits erforscht." };
    if (!Object.entries(technology.cost).every(([key, cost]) => (player.resources[key] || 0) >= cost)) return { ok: false, reason: "Es fehlen Ressourcen für diese Forschung." };
    Object.entries(technology.cost).forEach(([key, cost]) => { player.resources[key] -= cost; });
    research.active = { technologyId, progress: 0, duration: technology.duration };
    recordEvent(`${getRealmName(ownerId)} beginnt mit ${technology.name}.`, "research");
    return { ok: true };
}

export function advanceResearch(deltaMs) {
    let completedAny = false;
    for (const player of match.players) {
        const active = ensureResearch(player).active;
        if (!active) continue;
        active.progress = Math.min(active.duration, active.progress + deltaMs / 1000);
        if (active.progress < active.duration) continue;
        const technology = getTechnologyById(active.technologyId);
        player.research.completed.push(active.technologyId);
        player.research.active = null;
        recordEvent(`${getRealmName(player.id)} hat ${technology?.name || "eine Technologie"} erforscht.`, "research");
        completedAny = true;
    }
    return completedAny;
}

export function getResearchBonus(ownerId, effect) {
    const player = getPlayerById(ownerId);
    if (!player) return 0;
    return ensureResearch(player).completed.reduce((total, id) => total + (getTechnologyById(id)?.effects[effect] || 0), 0);
}

export function getResearchStatus(ownerId) {
    const player = getPlayerById(ownerId);
    if (!player) return { completed: [], active: null };
    return ensureResearch(player);
}

export function canAffordResearch(ownerId, technologyId) {
    const player = getPlayerById(ownerId);
    const technology = getTechnologyById(technologyId);
    return !!player && !!technology && Object.entries(technology.cost).every(([key, cost]) => (player.resources[key] || 0) >= cost);
}


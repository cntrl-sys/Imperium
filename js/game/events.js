import { match, getPlayerById } from "./gameState.js";
import { getNationById } from "../data/nations.js";

const MAX_EVENTS = 80;

export function recordEvent(text, type = "info") {
    match.events ||= [];
    match.events.unshift({
        id: `${match.turn}-${Date.now()}-${match.events.length}`,
        turn: match.turn,
        type,
        text
    });
    match.events.length = Math.min(match.events.length, MAX_EVENTS);
}

export function getRealmName(ownerId) {
    const player = getPlayerById(ownerId);
    if (!player) return ownerId;
    const nation = getNationById(player.nationId);
    return nation?.name || ownerId;
}

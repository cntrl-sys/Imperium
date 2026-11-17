// Beziehungen, Friedensstatus und selbstständige Kriegserklärungen.

import { match } from "./gameState.js";
import { getRealmName, recordEvent } from "./events.js";

const aggressionByStrategy = { raider: 0.43, veteran: 0.36, marksman: 0.24, engineer: 0.14 };

export function diplomacyKey(first, second) {
    return [first, second].sort().join("::");
}

export function ensureDiplomacy() {
    match.diplomacy ||= {};
    const player = match.players.find((entry) => entry.isHuman);
    if (!player) return;
    for (const opponent of match.players.filter((entry) => !entry.isHuman)) {
        const key = diplomacyKey(player.id, opponent.id);
        if (match.diplomacy[key]) continue;
        match.diplomacy[key] = {
            first: player.id,
            second: opponent.id,
            status: "peace",
            mood: 58 + Math.floor(Math.random() * 31),
            aiAggression: aggressionByStrategy[opponent.aiStrategy] || 0.22,
            nextDecisionAt: 100 + Math.random() * 160,
            warStartedAt: null
        };
    }
}

export function getDiplomacyRelation(first, second) {
    if (!first || !second || first === second) return null;
    return match.diplomacy?.[diplomacyKey(first, second)] || null;
}

export function areAtWar(first, second) {
    return getDiplomacyRelation(first, second)?.status === "war";
}

export function changeDiplomacyMood(first, second, delta) {
    const relation = getDiplomacyRelation(first, second);
    if (!relation || relation.status === "war") return;
    relation.mood = Math.max(-100, Math.min(100, relation.mood + delta));
}

export function declareWar(attacker, defender, reason = "") {
    if (!attacker || !defender || attacker === defender) return false;
    ensureDiplomacy();
    const key = diplomacyKey(attacker, defender);
    const relation = match.diplomacy[key] || {
        first: attacker, second: defender, status: "peace", mood: 50,
        aiAggression: 0.25, nextDecisionAt: 0, warStartedAt: null
    };
    if (relation.status === "war") return false;
    relation.status = "war";
    relation.mood = -100;
    relation.warStartedAt = match.elapsedSeconds || 0;
    match.diplomacy[key] = relation;
    const detail = reason ? ` (${reason})` : "";
    recordEvent(`${getRealmName(attacker)} erklärt ${getRealmName(defender)} den Krieg${detail}.`, "diplomacy");
    return true;
}

export function evaluatePeacefulAI() {
    ensureDiplomacy();
    const time = match.elapsedSeconds || 0;
    const player = match.players.find((entry) => entry.isHuman);
    if (!player) return false;
    let changed = false;
    for (const opponent of match.players.filter((entry) => !entry.isHuman)) {
        const relation = getDiplomacyRelation(player.id, opponent.id);
        if (!relation || relation.status === "war" || time < relation.nextDecisionAt) continue;
        const chance = Math.max(0.06, Math.min(0.72, relation.aiAggression + (55 - relation.mood) / 240));
        if (Math.random() < chance) {
            changed = declareWar(opponent.id, player.id, "der Frieden ist zerbrochen") || changed;
        } else {
            relation.nextDecisionAt = time + 45 + Math.random() * 100;
        }
    }
    return changed;
}

export function getMoodLabel(mood, status) {
    if (status === "war") return "Im Krieg";
    if (mood >= 72) return "Freundlich";
    if (mood >= 42) return "Wohlwollend";
    if (mood >= 12) return "Vorsichtig";
    return "Misstrauisch";
}

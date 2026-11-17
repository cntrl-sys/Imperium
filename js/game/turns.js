// js/game/turns.js
//
// Liefert den regelmäßigen Einkommen- und Versorgungstakt fürs Echtzeitspiel.

import { match } from "./gameState.js";
import { collectWorkerResources } from "./units.js";
import { isGameOver } from "./capitals.js";
import { getRealmName, recordEvent } from "./events.js";
import { getResearchBonus } from "./research.js";

const GOLD_PER_TURN = 25;

// Resource and progression clock. The internal pulse drives AI recruitment
// cadence and remains part of the existing save format.
export function advanceRealtimeEconomy() {
    if (isGameOver()) return true;
    match.turn += 1;
    match.players.forEach((player) => {
        player.resources.gold += (player.goldPerTurn || GOLD_PER_TURN) + getResearchBonus(player.id, "goldPerTurn");
    });
    const harvested = collectWorkerResources();
    for (const item of harvested) {
        const labels = { gold: "Gold", wheat: "Getreide", wood: "Holz", stone: "Stein" };
        recordEvent(`${getRealmName(item.owner)} sammelt ${item.amount} ${labels[item.resource] || item.resource}.`, "economy");
    }
    recordEvent(`Einkommen und Versorgung treffen ein.`, "economy");
    return false;
}

import { match, getPlayerById, getCapitalByOwner } from "./gameState.js";
import { getRealmName, recordEvent } from "./events.js";
import { getResourceCapacity } from "./buildings.js";
import { areAtWar, changeDiplomacyMood, getDiplomacyRelation } from "./diplomacy.js";

const RESOURCE_VALUES = { gold: 1, wheat: 1, wood: 1.1, stone: 1.1 };
const RESOURCE_LABELS = { gold: "Gold", wheat: "Getreide", wood: "Holz", stone: "Stein" };

export function proposeTrade(fromOwner, toOwner, offer, request) {
    const from = getPlayerById(fromOwner);
    const to = getPlayerById(toOwner);
    const targetCapital = getCapitalByOwner(toOwner);
    if (!from || !to || to.isHuman || !targetCapital || targetCapital.destroyed) {
        return { ok: false, reason: "Mit diesem Reich ist derzeit kein Handel möglich." };
    }
    if (areAtWar(fromOwner, toOwner)) return { ok: false, reason: "Während eines Krieges ist kein Handel möglich." };
    if (from.tradeUsedTurn === match.turn) {
        return { ok: false, reason: "Du kannst nur alle zehn Sekunden ein neues Handelsangebot senden." };
    }
    if (!validTradeLine(offer) || !validTradeLine(request)) {
        return { ok: false, reason: "Wähle für beide Seiten eine gültige Menge." };
    }
    if ((from.resources[offer.resource] || 0) < offer.amount) {
        return { ok: false, reason: "Du besitzt nicht genug von diesem Angebot." };
    }
    if ((to.resources[request.resource] || 0) < request.amount) {
        return { ok: false, reason: "Dieses Reich kann die gewünschte Menge nicht liefern." };
    }

    from.tradeUsedTurn = match.turn;
    const offerValue = offer.amount * RESOURCE_VALUES[offer.resource];
    const requestValue = request.amount * RESOURCE_VALUES[request.resource];
    const relation = getDiplomacyRelation(fromOwner, toOwner);
    const baseThreshold = to.aiStrategy === "raider" ? 1.08 : to.aiStrategy === "marksman" ? 1.02 : to.aiStrategy === "veteran" ? 0.9 : 0.96;
    const threshold = baseThreshold - ((relation?.mood || 0) - 50) / 650;
    const approved = offerValue >= requestValue * threshold;

    if (!approved) {
        changeDiplomacyMood(fromOwner, toOwner, -3);
        recordEvent(`${getRealmName(toOwner)} lehnt das Handelsangebot ab.`, "diplomacy");
        return { ok: true, approved: false, reason: "Das Angebot ist dem Reich zu gering." };
    }

    const fromAfter = (from.resources[request.resource] || 0) - (offer.resource === request.resource ? offer.amount : 0) + request.amount;
    const toAfter = (to.resources[offer.resource] || 0) - (request.resource === offer.resource ? request.amount : 0) + offer.amount;
    if ((request.resource !== "gold" && fromAfter > getResourceCapacity(fromOwner)) ||
        (offer.resource !== "gold" && toAfter > getResourceCapacity(toOwner))) {
        changeDiplomacyMood(fromOwner, toOwner, -1);
        recordEvent(`${getRealmName(toOwner)} lehnt den Handel ab: Der Lagerraum reicht nicht aus.`, "diplomacy");
        return { ok: true, approved: false, reason: "Ein Lager ist für diese Lieferung zu klein." };
    }

    from.resources[offer.resource] -= offer.amount;
    to.resources[offer.resource] = (to.resources[offer.resource] || 0) + offer.amount;
    to.resources[request.resource] -= request.amount;
    from.resources[request.resource] = (from.resources[request.resource] || 0) + request.amount;
    changeDiplomacyMood(fromOwner, toOwner, 6);
    recordEvent(`${getRealmName(toOwner)} nimmt den Handel an: ${offer.amount} ${RESOURCE_LABELS[offer.resource]} gegen ${request.amount} ${RESOURCE_LABELS[request.resource]}.`, "diplomacy");
    return { ok: true, approved: true, reason: "Das Reich nimmt den Handel an." };
}

function validTradeLine(line) {
    return line && Object.hasOwn(RESOURCE_VALUES, line.resource) && Number.isInteger(line.amount) && line.amount > 0;
}

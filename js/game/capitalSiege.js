// Echtzeitbelagerungen und Einnahme von Hauptstädten.

import { match } from "./gameState.js";
import { getUnitTypeById } from "../data/units.js";
import { getRealmName, recordEvent } from "./events.js";
import { declareWar } from "./diplomacy.js";

const SIEGE_RADIUS = 2;
const DEFENDER_RADIUS = 3;
const REQUIRED_SIEGE_FORCE = 3;
const SIEGE_DURATION_MS = 30_000;

export function advanceCapitalSieges(deltaMs) {
    if (match.gameOver) return;
    for (const capital of match.capitals) {
        if (capital.destroyed) continue;
        const defendersNearby = match.units.some((unit) => {
            if (unit.owner !== capital.owner || !getUnitTypeById(unit.typeId)?.canAttack) return false;
            return Math.max(Math.abs(unit.x - capital.x), Math.abs(unit.y - capital.y)) <= DEFENDER_RADIUS;
        });
        const sieger = match.players.find((player) => player.id !== capital.owner && !defendersNearby &&
            match.units.filter((unit) => {
                const type = getUnitTypeById(unit.typeId);
                return unit.owner === player.id && type?.canAttack && type.category !== "ship" &&
                    Math.max(Math.abs(unit.x - capital.x), Math.abs(unit.y - capital.y)) <= SIEGE_RADIUS;
            }).length >= REQUIRED_SIEGE_FORCE);

        if (sieger) {
            declareWar(sieger.id, capital.owner, "Belagerung");
            if (capital.siegeOwner !== sieger.id) {
                capital.siegeOwner = sieger.id;
                capital.siegeProgress = 0;
                recordEvent(`${getRealmName(sieger.id)} beginnt mit der Belagerung von ${getRealmName(capital.owner)}.`, "siege");
            }
            capital.siegeProgress = Math.min(SIEGE_DURATION_MS, (capital.siegeProgress || 0) + deltaMs);
            if (capital.siegeProgress >= SIEGE_DURATION_MS) captureCapital(capital, sieger.id);
        } else if (!defendersNearby && capital.siegeProgress > 0) {
            capital.siegeProgress = Math.max(0, capital.siegeProgress - deltaMs * 2);
            if (!capital.siegeProgress) capital.siegeOwner = null;
        }
    }
}

function captureCapital(capital, attackerOwner) {
    capital.destroyed = true;
    capital.siegeProgress = SIEGE_DURATION_MS;
    recordEvent(`${getRealmName(attackerOwner)} hat die Hauptstadt von ${getRealmName(capital.owner)} nach einer langen Belagerung erobert.`, "capture");
    match.units = match.units.filter((unit) => unit.owner !== capital.owner);
    (match.buildings || []).filter((building) => building.owner === capital.owner && !building.destroyed).forEach((building) => {
        building.destroyed = true;
        building.health = 0;
    });

    if (capital.owner === "player") {
        match.gameOver = "lose";
        recordEvent("Deine Hauptstadt ist gefallen. Das Reich ist besiegt.", "defeat");
    } else if (attackerOwner === "player") {
        const remainingOpponents = match.capitals.filter((entry) => entry.owner !== "player" && !entry.destroyed);
        if (!remainingOpponents.length) {
            match.gameOver = "win";
            recordEvent("Alle gegnerischen Hauptstädte sind gefallen. Das Reich hat gesiegt!", "victory");
        }
    }
}

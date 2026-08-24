// js/game/turns.js
//
// Steuert den Rundenablauf: Spielerphase -> Botphase -> nächste Runde.

import { match, clearSelection } from "./gameState.js";
import { resetActionsForNewTurn } from "./units.js";
import { runBotTurn } from "../ai/bot.js";
import { isGameOver } from "./capitals.js";

/**
 * Beendet die Spielerrunde, lässt den Bot handeln und startet die nächste
 * Runde. Gibt zurück, ob das Spiel danach vorbei ist.
 */
export function endPlayerTurn() {
    if (isGameOver()) return true;

    clearSelection();
    match.phase = "bot";

    runBotTurn();

    if (isGameOver()) {
        return true;
    }

    match.phase = "player";
    match.turn += 1;
    resetActionsForNewTurn("player");
    resetActionsForNewTurn("bot");
    clearSelection();

    return false;
}

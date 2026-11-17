// Hauptstadtstatus und Kompatibilität für bestehende Spielsysteme.

import { match } from "./gameState.js";

export function isGameOver() {
    return match.gameOver !== null;
}

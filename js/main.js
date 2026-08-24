// js/main.js
//
// Einstiegspunkt der Anwendung. Registriert alle Screens beim
// Screen-Manager und startet das Spiel.

import { initGame, registerScreen } from "./game.js";
import { renderStartScreen } from "./screens/startScreen.js";
import { renderNationScreen } from "./screens/nationScreen.js";
import { renderMapScreen } from "./screens/mapScreen.js";
import { renderGameScreen } from "./screens/gameScreen.js";

registerScreen("start", renderStartScreen);
registerScreen("nation", renderNationScreen);
registerScreen("map", renderMapScreen);
registerScreen("game", renderGameScreen);

document.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("app");
    initGame(root);
});

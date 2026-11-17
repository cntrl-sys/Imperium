// js/screens/startScreen.js

import { changeScreen, gameState } from "../game.js";
import { exportSavedGame, getSavedGame, importSavedGameText } from "../game/savegame.js";

export function renderStartScreen(root) {
    const screen = document.createElement("div");
    screen.className = "screen start-screen";
    screen.style.backgroundImage = "url('assets/start-background.png')";

    screen.innerHTML = `
        <div class="start-menu">
            <div class="start-menu__title">IMPERIVM</div>
            <nav class="start-menu__list">
                <button class="start-menu__item" data-action="continue-game">Spiel fortsetzen</button>
                <button class="start-menu__item" data-action="new-game">Neues Spiel</button>
                <span class="start-menu__divider"></span>
                <button class="start-menu__item start-menu__item--small" data-action="export-save">Spielstand exportieren</button>
                <button class="start-menu__item start-menu__item--small" data-action="import-save">Spielstand importieren</button>
                <input data-save-file type="file" accept=".json,application/json" hidden>
            </nav>
            <p class="start-save-status" data-save-status aria-live="polite"></p>
        </div>
    `;

    root.appendChild(screen);

    const continueButton = screen.querySelector('[data-action="continue-game"]');
    const exportButton = screen.querySelector('[data-action="export-save"]');
    const saveStatus = screen.querySelector('[data-save-status]');
    const fileInput = screen.querySelector('[data-save-file]');
    const savedGame = getSavedGame();
    continueButton.disabled = !savedGame;
    exportButton.disabled = !savedGame;
    if (savedGame) {
        const date = new Date(savedGame.savedAt);
        const elapsed = Math.floor(savedGame.match.elapsedSeconds || 0);
        const time = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
        saveStatus.textContent = `Automatisch gespeichert · Spielzeit ${time}${Number.isNaN(date.getTime()) ? "" : ` · ${date.toLocaleString("de-DE")}`}`;
    }

    continueButton.addEventListener("click", () => {
        if (!getSavedGame()) return;
        gameState.resumeSavedGame = true;
        changeScreen("game");
    });
    exportButton.addEventListener("click", () => exportSavedGame());
    screen.querySelector('[data-action="import-save"]').addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        let result;
        try {
            result = importSavedGameText(await file.text());
        } catch {
            result = { ok: false, reason: "Die ausgewählte Datei konnte nicht gelesen werden." };
        }
        saveStatus.textContent = result.ok ? "Spielstand importiert. Du kannst die Partie jetzt fortsetzen." : result.reason;
        continueButton.disabled = !result.ok;
        exportButton.disabled = !result.ok;
        fileInput.value = "";
    });

    screen.querySelector('[data-action="new-game"]').addEventListener("click", () => {
        gameState.resumeSavedGame = false;
        changeScreen("nation");
    });

}

// js/screens/startScreen.js

import { changeScreen } from "../game.js";

export function renderStartScreen(root) {
    const screen = document.createElement("div");
    screen.className = "screen start-screen";
    screen.style.backgroundImage = "url('assets/start-background.png')";

    screen.innerHTML = `
        <div class="start-menu">
            <div class="start-menu__title">IMPERIVM</div>
            <nav class="start-menu__list">
                <button class="start-menu__item" data-action="new-game">Neues Spiel</button>
                <div class="start-menu__divider"></div>
                <button class="start-menu__item" data-action="load-game">Spiel laden</button>
                <div class="start-menu__divider"></div>
                <button class="start-menu__item" data-action="settings">Einstellungen</button>
            </nav>
        </div>
        <div class="start-notice" hidden></div>
    `;

    root.appendChild(screen);

    const notice = screen.querySelector(".start-notice");

    screen.querySelector('[data-action="new-game"]').addEventListener("click", () => {
        changeScreen("nation");
    });

    screen.querySelector('[data-action="load-game"]').addEventListener("click", () => {
        showNotice(notice, "Spielstände werden in einem späteren Entwicklungsschritt verfügbar sein.");
    });

    screen.querySelector('[data-action="settings"]').addEventListener("click", () => {
        showNotice(notice, "Die Einstellungen werden in einem späteren Entwicklungsschritt verfügbar sein.");
    });
}

function showNotice(noticeEl, message) {
    noticeEl.textContent = message;
    noticeEl.hidden = false;
    noticeEl.classList.remove("start-notice--visible");
    void noticeEl.offsetWidth; // Reflow erzwingen, damit die Animation neu startet
    noticeEl.classList.add("start-notice--visible");
}

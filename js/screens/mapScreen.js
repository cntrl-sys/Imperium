// js/screens/mapScreen.js

import { maps } from "../data/maps.js";
import { changeScreen, selectMap } from "../game.js";

export function renderMapScreen(root, state) {
    const screen = document.createElement("div");
    screen.className = "screen map-screen";

    screen.innerHTML = `
        <header class="screen-header">
            <h1>Wähle deine Karte</h1>
        </header>
        <div class="map-grid"></div>
        <footer class="screen-footer">
            <button class="btn btn--seal" data-action="start" disabled>Start</button>
        </footer>
    `;

    root.appendChild(screen);

    const gridEl = screen.querySelector(".map-grid");
    const startBtn = screen.querySelector('[data-action="start"]');

    // Kartenraster vollständig aus Datenstruktur generieren (3 pro Reihe via CSS-Grid).
    maps.forEach((map) => {
        const tile = document.createElement("button");
        tile.className = "map-tile";
        tile.type = "button";
        tile.dataset.mapId = map.id;
        tile.innerHTML = `
            <img class="map-tile__image" src="${map.image}" alt="${map.name}">
            <span class="map-tile__label">${map.name}</span>
        `;
        tile.addEventListener("click", () => {
            selectMap(map.id);
            highlightSelected(map.id);
            startBtn.disabled = false;
        });
        gridEl.appendChild(tile);
    });

    if (state.selectedMapId) {
        highlightSelected(state.selectedMapId);
        startBtn.disabled = false;
    }

    startBtn.addEventListener("click", () => {
        if (!state.selectedMapId) return;
        changeScreen("game");
    });

    function highlightSelected(mapId) {
        gridEl.querySelectorAll(".map-tile").forEach((el) => {
            el.classList.toggle("map-tile--selected", el.dataset.mapId === mapId);
        });
    }
}

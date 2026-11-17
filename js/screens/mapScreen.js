// js/screens/mapScreen.js

import { maps } from "../data/worldMaps.js";
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
            <div class="map-options" hidden>
                <label for="archipelago-opponents">Gegnerreiche</label>
                <select id="archipelago-opponents" aria-label="Anzahl gegnerischer Reiche">
                    ${Array.from({ length: 8 }, (_, index) => `<option value="${index + 1}">${index + 1}</option>`).join("")}
                </select>
                <span>Weitere Inseln bleiben neutral und unbewohnt.</span>
            </div>
            <button class="btn btn--seal" data-action="start" disabled>Start</button>
        </footer>
    `;

    root.appendChild(screen);

    const gridEl = screen.querySelector(".map-grid");
    const startBtn = screen.querySelector('[data-action="start"]');
    const optionsEl = screen.querySelector(".map-options");
    const opponentSelect = screen.querySelector("#archipelago-opponents");
    const previouslySelectedMap = maps.find((entry) => entry.id === state.selectedMapId);
    let archipelagoOpponentCount = previouslySelectedMap?.opponentCountSelectable && state.selectedOpponentCount
        ? state.selectedOpponentCount
        : maps.find((entry) => entry.id === "inselarchipel").opponents;
    opponentSelect.value = String(archipelagoOpponentCount);

    const updateSelection = (mapId) => {
        const selectedMap = maps.find((entry) => entry.id === mapId);
        if (!selectedMap) return;
        const opponentCount = selectedMap.opponentCountSelectable ? Number(opponentSelect.value) : selectedMap.opponents;
        selectMap(selectedMap.id, opponentCount);
        optionsEl.hidden = !selectedMap.opponentCountSelectable;
        startBtn.disabled = false;
    };

    // Kartenraster vollständig aus Datenstruktur generieren (3 pro Reihe via CSS-Grid).
    maps.forEach((map) => {
        const tile = document.createElement("button");
        tile.className = "map-tile";
        tile.type = "button";
        tile.dataset.mapId = map.id;
        tile.innerHTML = `
            <img class="map-tile__image" src="${map.image}" alt="${map.name}">
            <span class="map-tile__opponents">${map.opponentCountSelectable ? "1–8 Gegner wählbar" : `${map.opponents} Gegner`}</span>
            <span class="map-tile__label">
                <strong>${map.name}</strong>
                <span>${map.description}</span>
            </span>
        `;
        tile.addEventListener("click", () => {
            if (map.opponentCountSelectable) opponentSelect.value = String(archipelagoOpponentCount);
            updateSelection(map.id);
            highlightSelected(map.id);
        });
        gridEl.appendChild(tile);
    });

    if (state.selectedMapId) {
        const selectedMap = maps.find((entry) => entry.id === state.selectedMapId);
        if (selectedMap?.opponentCountSelectable) {
            opponentSelect.value = String(archipelagoOpponentCount);
            optionsEl.hidden = false;
        }
        highlightSelected(state.selectedMapId);
        startBtn.disabled = false;
    }

    opponentSelect.addEventListener("change", () => {
        archipelagoOpponentCount = Number(opponentSelect.value);
        const selectedMap = maps.find((entry) => entry.id === state.selectedMapId);
        if (selectedMap?.opponentCountSelectable) selectMap(selectedMap.id, archipelagoOpponentCount);
    });

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

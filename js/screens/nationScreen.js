// js/screens/nationScreen.js

import { nations, getNationById } from "../data/nations.js";
import { changeScreen, selectNation } from "../game.js";

export function renderNationScreen(root, state) {
    const screen = document.createElement("div");
    screen.className = "screen nation-screen";

    screen.innerHTML = `
        <header class="screen-header">
            <h1>Wähle deine Nation</h1>
        </header>
        <div class="nation-layout">
            <ul class="nation-list"></ul>
            <div class="nation-detail" data-empty="true">
                <p class="nation-detail__placeholder">Wähle eine Nation aus, um mehr zu erfahren.</p>
            </div>
        </div>
        <footer class="screen-footer">
            <button class="btn btn--seal" data-action="confirm" disabled>Bestätigen</button>
        </footer>
    `;

    root.appendChild(screen);

    const listEl = screen.querySelector(".nation-list");
    const detailEl = screen.querySelector(".nation-detail");
    const confirmBtn = screen.querySelector('[data-action="confirm"]');

    // Nationenliste vollständig aus Datenstruktur generieren.
    nations.forEach((nation) => {
        const item = document.createElement("li");
        item.className = "nation-list__item";
        item.dataset.nationId = nation.id;
        item.style.setProperty("--nation-color", nation.color);
        item.innerHTML = `
            <span class="nation-list__name">${nation.name}</span>
            <span class="nation-list__leader">${nation.leader}</span>
        `;
        item.addEventListener("click", () => {
            selectNation(nation.id);
            renderDetail(nation);
            highlightSelected(nation.id);
            confirmBtn.disabled = false;
        });
        listEl.appendChild(item);
    });

    // Falls bereits eine Nation im State gewählt war (z.B. Rückkehr auf diesen Screen).
    if (state.selectedNationId) {
        const existing = getNationById(state.selectedNationId);
        if (existing) {
            renderDetail(existing);
            highlightSelected(existing.id);
            confirmBtn.disabled = false;
        }
    }

    confirmBtn.addEventListener("click", () => {
        if (!state.selectedNationId) return;
        changeScreen("map");
    });

    function highlightSelected(nationId) {
        listEl.querySelectorAll(".nation-list__item").forEach((el) => {
            el.classList.toggle("nation-list__item--selected", el.dataset.nationId === nationId);
        });
    }

    function renderDetail(nation) {
        detailEl.dataset.empty = "false";
        detailEl.style.setProperty("--nation-color", nation.color);
        detailEl.innerHTML = `
            <div class="nation-detail__image-wrap">
                <img class="nation-detail__image" src="${nation.image}" alt="${nation.leader}">
            </div>
            <div class="nation-detail__body">
                <h2 class="nation-detail__name">${nation.name}</h2>
                <p class="nation-detail__leader">Anführer: ${nation.leader}</p>
                <p class="nation-detail__description">${nation.description}</p>
                <h3 class="nation-detail__abilities-title">Fähigkeiten</h3>
                <ul class="nation-detail__abilities">
                    ${nation.abilities
                        .map(
                            (ability) => `
                        <li class="ability">
                            <span class="ability__name">${ability.name}</span>
                            <span class="ability__description">${ability.description}</span>
                        </li>`
                        )
                        .join("")}
                </ul>
            </div>
        `;
    }
}

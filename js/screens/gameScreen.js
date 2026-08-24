// js/screens/gameScreen.js
//
// Der eigentliche Game Screen. Baut Karte, Einheiten, Ressourcenanzeige,
// Kaufmenü und Rundensystem aus dem Match-State (js/game/gameState.js) auf.
// Enthält bewusst nur Rendering + DOM-Interaktion — die eigentliche
// Spiellogik lebt in js/game/*.js und js/ai/bot.js.

import { changeScreen } from "../game.js";
import { getNationById } from "../data/nations.js";
import { unitTypes, getUnitTypeById } from "../data/units.js";
import { match, initMatch, getSelectedUnit, selectUnit, clearSelection, getPlayerById } from "../game/gameState.js";
import { getUnitAt, purchaseUnit } from "../game/units.js";
import { getReachableTiles, moveUnit } from "../game/movement.js";
import { canAttack, attack } from "../game/combat.js";
import { endPlayerTurn } from "../game/turns.js";
import { tickAnimation } from "../render/spriteAnimation.js";
import { applySpriteToElement } from "../render/spriteRenderer.js";

const TILE_SIZE = 56;

// Kurzsymbol pro Einheitentyp für die Fallback-Darstellung, solange kein
// echtes Sprite-Sheet existiert.
const FALLBACK_SYMBOLS = {
    soldier: "⚔",
    archer: "➶",
    warship: "⛵",
    merchantShip: "⛴"
};

let animationLoopHandle = null;
let lastFrameTime = 0;

export function renderGameScreen(root, navState) {
    stopAnimationLoop();

    initMatch(navState.selectedNationId, navState.selectedMapId);

    const screen = document.createElement("div");
    screen.className = "screen game-screen game-screen--active";

    const playerNation = getNationById(getPlayerById("player").nationId);
    if (playerNation) {
        screen.style.setProperty("--nation-color", playerNation.color);
    }

    screen.innerHTML = `
        <header class="hud-top">
            <div class="hud-top__stat" data-stat="turn">Runde 1</div>
            <div class="hud-top__stat" data-stat="nation">${
                playerNation ? `${playerNation.name} — ${playerNation.leader}` : ""
            }</div>
            <div class="hud-top__stat hud-top__stat--gold" data-stat="gold">Gold: 100</div>
        </header>

        <div class="map-viewport">
            <div class="map-board"></div>
        </div>

        <div class="hud-bottom-left">
            <button class="btn btn--hud" data-action="toggle-units">Einheiten</button>
        </div>
        <div class="hud-bottom-right">
            <button class="btn btn--hud btn--end-turn" data-action="end-turn">Runde beenden</button>
        </div>

        <div class="units-panel" hidden>
            <div class="units-panel__header">
                <h2>Einheiten</h2>
                <button class="units-panel__close" data-action="close-units" aria-label="Schließen">✕</button>
            </div>
            <div class="units-panel__grid"></div>
        </div>

        <div class="game-message" hidden></div>

        <div class="game-over-screen" hidden>
            <div class="game-over-screen__panel">
                <h1 class="game-over-screen__title"></h1>
                <button class="btn" data-action="back-to-start">Zurück zum Hauptmenü</button>
            </div>
        </div>
    `;

    root.appendChild(screen);

    const boardEl = screen.querySelector(".map-board");
    const turnEl = screen.querySelector('[data-stat="turn"]');
    const goldEl = screen.querySelector('[data-stat="gold"]');
    const unitsPanel = screen.querySelector(".units-panel");
    const unitsGrid = screen.querySelector(".units-panel__grid");
    const messageEl = screen.querySelector(".game-message");
    const gameOverEl = screen.querySelector(".game-over-screen");

    boardEl.style.width = `${match.map.width * TILE_SIZE}px`;
    boardEl.style.height = `${match.map.height * TILE_SIZE}px`;

    buildBoardTiles(boardEl);
    buildUnitsPanelContent(unitsGrid);
    renderUnits(boardEl);
    updateHud(turnEl, goldEl);

    // ---- Interaktionen ----

    boardEl.addEventListener("click", (event) => {
        // Nicht auf ".tile" verlassen: Einheiten und Marker liegen als
        // eigene Ebenen ÜBER den Tiles, ein Klick auf eine Einheit trifft
        // also nie ein Tile-Element selbst. Stattdessen die Feldkoordinate
        // direkt aus der Klickposition relativ zum Board berechnen.
        const rect = boardEl.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / TILE_SIZE);
        const y = Math.floor((event.clientY - rect.top) / TILE_SIZE);
        if (x < 0 || y < 0 || x >= match.map.width || y >= match.map.height) return;

        handleTileClick(x, y, boardEl);
        afterAction(boardEl, turnEl, goldEl, gameOverEl);
    });

    screen.querySelector('[data-action="toggle-units"]').addEventListener("click", () => {
        refreshUnitsPanelAffordability(unitsGrid);
        unitsPanel.hidden = !unitsPanel.hidden;
    });
    screen.querySelector('[data-action="close-units"]').addEventListener("click", () => {
        unitsPanel.hidden = true;
    });

    unitsGrid.addEventListener("click", (event) => {
        const card = event.target.closest(".unit-card");
        if (!card) return;
        const result = purchaseUnit("player", card.dataset.unitTypeId);
        if (!result.ok) {
            showMessage(messageEl, result.reason);
            return;
        }
        unitsPanel.hidden = true;
        renderUnits(boardEl);
        updateHud(turnEl, goldEl);
    });

    screen.querySelector('[data-action="end-turn"]').addEventListener("click", () => {
        clearSelection();
        renderBoardHighlights(boardEl, []);
        const gameOver = endPlayerTurn();
        renderUnits(boardEl);
        updateHud(turnEl, goldEl);
        if (gameOver) showGameOver(gameOverEl);
    });

    screen.querySelector('[data-action="back-to-start"]').addEventListener("click", () => {
        stopAnimationLoop();
        changeScreen("start");
    });

    startAnimationLoop(boardEl);
}

// ============================================================
// Karte / Tiles
// ============================================================

function buildBoardTiles(boardEl) {
    const terrainLayer = document.createElement("div");
    terrainLayer.className = "tile-layer";

    for (let y = 0; y < match.map.height; y++) {
        for (let x = 0; x < match.map.width; x++) {
            const tile = match.tiles[y][x];
            const tileEl = document.createElement("div");
            tileEl.className = `tile tile--${tile.terrain}`;
            tileEl.dataset.x = String(x);
            tileEl.dataset.y = String(y);
            positionEl(tileEl, x, y);
            terrainLayer.appendChild(tileEl);
        }
    }
    boardEl.appendChild(terrainLayer);

    const markerLayer = document.createElement("div");
    markerLayer.className = "marker-layer";
    match.capitals.forEach((capital) => markerLayer.appendChild(buildStructureMarker(capital, "capital", "🏛")));
    match.ports.forEach((port) => markerLayer.appendChild(buildStructureMarker(port, "port", "⚓")));
    boardEl.appendChild(markerLayer);

    const highlightLayer = document.createElement("div");
    highlightLayer.className = "highlight-layer";
    boardEl.appendChild(highlightLayer);

    const unitLayer = document.createElement("div");
    unitLayer.className = "unit-layer";
    boardEl.appendChild(unitLayer);
}

function positionEl(el, x, y) {
    el.style.left = `${x * TILE_SIZE}px`;
    el.style.top = `${y * TILE_SIZE}px`;
    el.style.width = `${TILE_SIZE}px`;
    el.style.height = `${TILE_SIZE}px`;
}

function buildStructureMarker(structure, kind, symbol) {
    const nation = getNationById(getPlayerById(structure.owner).nationId);
    const el = document.createElement("div");
    el.className = `structure-marker structure-marker--${kind}`;
    positionEl(el, structure.x, structure.y);
    el.style.setProperty("--marker-color", nation ? nation.color : "#b8935a");
    el.dataset.owner = structure.owner;
    el.textContent = symbol;
    return el;
}

// ============================================================
// Einheiten rendern
// ============================================================

/**
 * Baut die Einheiten-Layer komplett neu auf. Wird nach echten
 * Zustandsänderungen aufgerufen (Kauf, Bewegung, Angriff, Rundenwechsel),
 * NICHT bei jedem Animations-Tick — dafür gibt es updateUnitSprites().
 */
function renderUnits(boardEl) {
    const unitLayer = boardEl.querySelector(".unit-layer");
    unitLayer.innerHTML = "";

    match.units.forEach((unit) => {
        const el = buildUnitElement(unit);
        unitLayer.appendChild(el);
    });
}

function buildUnitElement(unit) {
    const nationId = getPlayerById(unit.owner).nationId;
    const nation = getNationById(nationId);

    const el = document.createElement("div");
    el.className = "unit";
    el.dataset.unitId = unit.id;
    el.dataset.owner = unit.owner;
    positionEl(el, unit.x, unit.y);
    el.style.setProperty("--unit-color", nation ? nation.color : "#b8935a");
    if (unit.hasActed) el.classList.add("unit--spent");
    if (match.selectedUnitId === unit.id) el.classList.add("unit--selected");

    const spriteEl = document.createElement("div");
    spriteEl.className = "unit__sprite";
    el.appendChild(spriteEl);
    updateUnitSpriteVisual(spriteEl, unit, nationId);

    const healthBar = document.createElement("div");
    healthBar.className = "unit__health";
    const unitType = getUnitTypeById(unit.typeId);
    const pct = unitType ? Math.max(0, Math.min(100, (unit.health / unitType.health) * 100)) : 100;
    healthBar.innerHTML = `<span style="width:${pct}%"></span>`;
    el.appendChild(healthBar);

    return el;
}

function updateUnitSpriteVisual(spriteEl, unit, nationId) {
    const usedSprite = applySpriteToElement(spriteEl, unit, nationId);
    if (!usedSprite) {
        spriteEl.classList.add("unit__sprite--fallback");
        spriteEl.textContent = FALLBACK_SYMBOLS[unit.typeId] || "?";
    } else {
        spriteEl.classList.remove("unit__sprite--fallback");
        spriteEl.textContent = "";
    }
}

/**
 * Leichtgewichtiges Update pro Animations-Frame: aktualisiert nur die
 * Sprite-Darstellung bereits vorhandener Unit-Elemente, ohne die Karte
 * komplett neu aufzubauen (Performance, siehe Projektvorgaben).
 */
function updateUnitSprites(boardEl) {
    match.units.forEach((unit) => {
        const el = boardEl.querySelector(`.unit[data-unit-id="${unit.id}"]`);
        if (!el) return;
        const spriteEl = el.querySelector(".unit__sprite");
        if (!spriteEl) return;
        const nationId = getPlayerById(unit.owner).nationId;
        updateUnitSpriteVisual(spriteEl, unit, nationId);
    });
}

function renderBoardHighlights(boardEl, tiles) {
    const layer = boardEl.querySelector(".highlight-layer");
    layer.innerHTML = "";
    tiles.forEach((pos) => {
        const el = document.createElement("div");
        el.className = "tile-highlight";
        positionEl(el, pos.x, pos.y);
        layer.appendChild(el);
    });
}

// ============================================================
// Interaktion: Tile-Klicks
// ============================================================

function handleTileClick(x, y, boardEl) {
    if (match.gameOver) return;
    if (match.phase !== "player") return;

    const clickedUnit = getUnitAt(x, y);
    const selected = getSelectedUnit();

    // Fall 1: eigene Einheit anklicken -> auswählen.
    if (clickedUnit && clickedUnit.owner === "player") {
        selectUnit(clickedUnit.id);
        renderBoardHighlights(boardEl, getReachableTiles(clickedUnit));
        return;
    }

    // Fall 2: gegnerische Einheit anklicken -> angreifen, wenn in Reichweite.
    if (clickedUnit && clickedUnit.owner !== "player" && selected) {
        if (canAttack(selected, clickedUnit)) {
            attack(selected, clickedUnit);
            clearSelection();
            renderBoardHighlights(boardEl, []);
        }
        return;
    }

    // Fall 3: leeres, gültiges Zielfeld anklicken -> bewegen.
    if (!clickedUnit && selected) {
        const moved = moveUnit(selected, x, y);
        if (moved) {
            clearSelection();
            renderBoardHighlights(boardEl, []);
        }
        return;
    }

    // Sonst: Auswahl aufheben.
    clearSelection();
    renderBoardHighlights(boardEl, []);
}

function afterAction(boardEl, turnEl, goldEl, gameOverEl) {
    renderUnits(boardEl);
    updateHud(turnEl, goldEl);
    if (match.gameOver) showGameOver(gameOverEl);
}

// ============================================================
// Einheiten-Kaufmenü
// ============================================================

function buildUnitsPanelContent(unitsGrid) {
    unitsGrid.innerHTML = unitTypes.map((unitType) => buildUnitCardHtml(unitType)).join("");
}

function buildUnitCardHtml(unitType) {
    const traits = [
        `Bewegung ${unitType.movement}`,
        unitType.canAttack ? `Schaden ${unitType.attackDamage}` : "Kein Angriff",
        `Leben ${unitType.health}`,
        `Reichweite ${unitType.attackRange}`
    ];
    if (unitType.cargoCapacity) traits.push(`Traglast ${unitType.cargoCapacity}`);

    return `
        <button class="unit-card" type="button" data-unit-type-id="${unitType.id}">
            <span class="unit-card__symbol">${FALLBACK_SYMBOLS[unitType.id] || "?"}</span>
            <span class="unit-card__name">${unitType.name}</span>
            <ul class="unit-card__traits">
                ${traits.map((t) => `<li>${t}</li>`).join("")}
            </ul>
            <span class="unit-card__cost">${unitType.cost} Gold</span>
        </button>
    `;
}

function refreshUnitsPanelAffordability(unitsGrid) {
    const gold = getPlayerById("player").resources.gold;
    unitsGrid.querySelectorAll(".unit-card").forEach((card) => {
        const unitType = getUnitTypeById(card.dataset.unitTypeId);
        card.classList.toggle("unit-card--disabled", unitType.cost > gold);
    });
}

// ============================================================
// HUD / Meldungen / Spielende
// ============================================================

function updateHud(turnEl, goldEl) {
    turnEl.textContent = `Runde ${match.turn}`;
    goldEl.textContent = `Gold: ${getPlayerById("player").resources.gold}`;
}

let messageTimeout = null;
function showMessage(messageEl, text) {
    messageEl.textContent = text;
    messageEl.hidden = false;
    window.clearTimeout(messageTimeout);
    messageTimeout = window.setTimeout(() => {
        messageEl.hidden = true;
    }, 2600);
}

function showGameOver(gameOverEl) {
    stopAnimationLoop();
    const title = gameOverEl.querySelector(".game-over-screen__title");
    title.textContent = match.gameOver === "win" ? "SIEG" : "NIEDERLAGE";
    gameOverEl.classList.toggle("game-over-screen--win", match.gameOver === "win");
    gameOverEl.classList.toggle("game-over-screen--lose", match.gameOver === "lose");
    gameOverEl.hidden = false;
}

// ============================================================
// Animations-Loop (idle-Atmung etc.)
// ============================================================
//
// Baut die Karte NICHT jeden Frame neu auf — aktualisiert nur die
// Sprite-Darstellung bestehender Unit-Elemente (siehe updateUnitSprites).

function startAnimationLoop(boardEl) {
    lastFrameTime = performance.now();
    const step = (time) => {
        const dt = time - lastFrameTime;
        lastFrameTime = time;
        match.units.forEach((unit) => tickAnimation(unit, dt));
        updateUnitSprites(boardEl);
        animationLoopHandle = window.requestAnimationFrame(step);
    };
    animationLoopHandle = window.requestAnimationFrame(step);
}

function stopAnimationLoop() {
    if (animationLoopHandle) {
        window.cancelAnimationFrame(animationLoopHandle);
        animationLoopHandle = null;
    }
}

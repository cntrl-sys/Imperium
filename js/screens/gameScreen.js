// js/screens/gameScreen.js
//
// Der eigentliche Game Screen. Baut Karte, Einheiten, Ressourcenanzeige,
// Kaufmenü und Echtzeitsteuerung aus dem Match-State (js/game/gameState.js) auf.
// Enthält bewusst nur Rendering + DOM-Interaktion — die eigentliche
// Spiellogik lebt in js/game/*.js und js/ai/bot.js.

import { changeScreen } from "../game.js";
import { getNationById } from "../data/nations.js";
import { unitTypes, getUnitTypeById } from "../data/units.js";
import { match, initMatch, getSelectedUnit, getSelectedUnits, selectUnit, selectUnits, clearSelection, getPlayerById } from "../game/gameState.js";
import { getUnitAt, purchaseUnit, embarkUnit, disembarkUnit, getDisembarkTiles, GOLD_PER_DEPOSIT_HARVEST } from "../game/units.js";
import { getReachableTiles, issueMoveOrder, advanceMoveOrders } from "../game/movement.js";
import { canAttack, attack } from "../game/combat.js";
import { advanceRealtimeEconomy } from "../game/turns.js";
import { runBotTurn } from "../ai/bot.js";
import { resetActionsForNewTurn } from "../game/units.js";
import { proposeTrade } from "../game/trade.js";
import { recordEvent } from "../game/events.js";
import { restoreSavedMatch, saveCurrentMatch } from "../game/savegame.js";
import { buildingTypes } from "../data/structureTypes.js";
import { constructBuilding, getBuildableTiles, getBuildingAt, getResourceCapacity } from "../game/buildings.js";
import { attackBuilding, canAttackBuilding } from "../game/combat.js";
import { tickAnimation } from "../render/spriteAnimation.js";
import { applySpriteToElement } from "../render/spriteRenderer.js";
import { updateVision, isVisibleToPlayer, isExploredByPlayer, getUnitVision } from "../game/vision.js";
import { advanceCapitalSieges } from "../game/capitalSiege.js";
import { attackWithTower } from "../game/towerCombat.js";
import { areAtWar, declareWar, getDiplomacyRelation, getMoodLabel } from "../game/diplomacy.js";
import { advanceResearch, startResearch, getResearchStatus, canAffordResearch, getResearchBonus } from "../game/research.js";
import { technologies } from "../data/technologies.js";
import { advanceAcademyTraining, academyCourses, startAcademyTraining } from "../game/academyTraining.js";
import { advanceWorkerResourceOrders, assignWorkerResource } from "../game/workerJobs.js";

const TILE_SIZE = 64;

// Kurzsymbol pro Einheitentyp für die Fallback-Darstellung, solange kein
// echtes Sprite-Sheet existiert.
const FALLBACK_SYMBOLS = {
    soldier: "⚔",
    archer: "➶",
    worker: "✚",
    minotaur: "🐂",
    hunter: "🏹",
    "dragon-war": "🐉",
    "dragon-express": "🐲",
    "dragon-trade": "🐉",
    warship: "⛵",
    merchantShip: "⛴",
    "legionary": "♜", "egyptian-chariot": "🐎", hoplite: "🛡", "desert-rider": "🏇",
    longbowman: "🏹", "war-elephant": "🐘", "companion-cavalry": "🐎", cuirassier: "🏇",
    "horse-archer": "🏇", cossack: "🏇", samurai: "⚔", "persian-immortal": "⚔",
    spartan: "🛡", "numidian-rider": "🏇", "palmyrene-cat": "🐎", "carian-crossbow": "🏹"
};

let animationLoopHandle = null;
let lastFrameTime = 0;

export function renderGameScreen(root, navState) {
    stopAnimationLoop();

    if (navState.resumeSavedGame) {
        if (!restoreSavedMatch()) initMatch(navState.selectedNationId, navState.selectedMapId, { opponentCount: navState.selectedOpponentCount });
        navState.resumeSavedGame = false;
    } else {
        initMatch(navState.selectedNationId, navState.selectedMapId, { opponentCount: navState.selectedOpponentCount });
        const nation = getNationById(getPlayerById("player").nationId);
        recordEvent(`${nation?.name || "Dein Reich"} beginnt eine Kampagne auf ${match.map.name}.`, "info");
        saveCurrentMatch();
    }
    updateVision("player");

    const screen = document.createElement("div");
    screen.className = "screen game-screen game-screen--active";

    const playerNation = getNationById(getPlayerById("player").nationId);
    if (playerNation) {
        screen.style.setProperty("--nation-color", playerNation.color);
    }

    screen.innerHTML = `
        <header class="hud-top">
            <div class="hud-top__stat" data-stat="turn">Spielzeit 00:00</div>
            <div class="hud-top__stat" data-stat="nation">${
                playerNation ? `${playerNation.name} — ${playerNation.leader}` : ""
            }</div>
            <div class="hud-top__stat hud-top__stat--gold" data-stat="gold">Gold: 100</div>
            <div class="hud-top__stat hud-top__stat--materials" data-stat="materials"></div>
            <div class="hud-top__stat" data-stat="opponents" title="Erobere alle gegnerischen Hauptstädte">Ziel: ${match.players.length - 1} Hauptstädte</div>
        </header>

        <div class="map-viewport">
            <div class="map-board"></div>
        </div>
        <button class="map-minimap" type="button" aria-label="Karte anzeigen und Kartenausschnitt wechseln">
            <canvas width="168" height="112"></canvas>
        </button>

        <div class="hud-bottom-left">
            <button class="btn btn--hud" data-action="toggle-units">Rekrutieren</button>
            <button class="btn btn--hud btn--trade" data-action="toggle-trade">Handel</button>
            <button class="btn btn--hud" data-action="toggle-buildings">Bauen</button>
            <button class="btn btn--hud" data-action="toggle-research">Forschung</button>
            <button class="btn btn--hud" data-action="toggle-academy">Akademie</button>
            <button class="btn btn--hud" data-action="toggle-chronicle">Chronik</button>
            <button class="btn btn--hud" data-action="toggle-relations">Beziehungen</button>
        </div>
        <div class="game-controls-hint">Truppen sammeln · mindestens 3 Kämpfer belagern Hauptstädte · Jäger erkunden weiter</div>
        <div class="hud-bottom-right"><span class="realtime-indicator"><i></i> Echtzeit</span></div>

        <div class="units-panel" hidden>
            <div class="units-panel__header">
                <h2>Einheiten</h2>
                <button class="units-panel__close" data-action="close-units" aria-label="Schließen">✕</button>
            </div>
            <div class="units-panel__grid"></div>
        </div>

        <section class="trade-panel" hidden aria-label="Handel mit einem gegnerischen Reich">
            <div class="trade-panel__offer">
                <header class="trade-panel__header">
                    <div><span class="trade-panel__eyebrow">Diplomatie</span><h2>Handel vorschlagen</h2></div>
                    <button class="units-panel__close" data-action="close-trade" aria-label="Schließen">✕</button>
                </header>
                <label class="trade-field">Reich
                    <select data-trade="opponent"></select>
                </label>
                <div class="trade-exchange">
                    <label class="trade-field">Du bietest
                        <span class="trade-field__row"><select data-trade="offer-resource"></select><input data-trade="offer-amount" type="number" min="1" step="1" value="12"></span>
                    </label>
                    <span class="trade-exchange__mark">↔</span>
                    <label class="trade-field">Du forderst
                        <span class="trade-field__row"><select data-trade="request-resource"></select><input data-trade="request-amount" type="number" min="1" step="1" value="10"></span>
                    </label>
                </div>
                <button class="btn btn--seal trade-submit" data-action="propose-trade">Angebot senden</button>
                <p class="trade-status" data-trade="status" aria-live="polite">Wähle ein Reich und stelle dein Angebot zusammen.</p>
            </div>
            <div class="trade-panel__portrait">
                <img data-trade="portrait" alt="Gesandter des ausgewählten Reiches">
                <div class="trade-panel__portrait-caption" data-trade="caption">Gesandter</div>
            </div>
        </section>

        <section class="relations-panel" hidden aria-label="Beziehungen der Reiche">
            <header class="relations-panel__header">
                <div><span class="trade-panel__eyebrow">Diplomatie</span><h2>Stimmung der Reiche</h2></div>
                <button class="units-panel__close" data-action="close-relations" aria-label="Schließen">✕</button>
            </header>
            <p class="relations-panel__intro">Alle Reiche beginnen im Frieden. Bündnisse und Feindschaften können sich im Lauf der Partie ändern.</p>
            <div class="relations-board"></div>
        </section>

        <section class="chronicle-panel" hidden aria-label="Ereignis-Chronik">
            <header class="chronicle-panel__header">
                <div><span class="trade-panel__eyebrow">Berichte des Reiches</span><h2>Chronik</h2></div>
                <button class="units-panel__close" data-action="close-chronicle" aria-label="Schließen">✕</button>
            </header>
            <ol class="chronicle-list" aria-live="polite"></ol>
        </section>

        <section class="buildings-panel" hidden aria-label="Gebäude errichten">
            <header class="buildings-panel__header">
                <div><span class="trade-panel__eyebrow">Ausbau des Reiches</span><h2>Gebäude errichten</h2></div>
                <button class="units-panel__close" data-action="close-buildings" aria-label="Schließen">✕</button>
            </header>
            <p class="buildings-panel__hint">Ein Arbeiter baut nebenan. Mauern blockieren, eigene Tore öffnen sich für deine Truppen und Türme beschießen Angreifer automatisch.</p>
            <div class="buildings-panel__grid"></div>
        </section>

        <section class="research-panel" hidden aria-label="Forschung">
            <header class="research-panel__header">
                <div><span class="trade-panel__eyebrow">Wissen deines Reiches</span><h2>Forschung</h2></div>
                <button class="units-panel__close" data-action="close-research" aria-label="Schließen">✕</button>
            </header>
            <p class="research-panel__hint">Errichte eine Akademie. Eine Forschung läuft jeweils in Echtzeit und bleibt in deinem Spielstand erhalten.</p>
            <div class="research-panel__grid"></div>
        </section>

        <section class="academy-panel" hidden aria-label="Ausbildung in der Akademie">
            <header class="academy-panel__header">
                <div><span class="trade-panel__eyebrow">Ausbildung deines Reiches</span><h2>Akademie</h2></div>
                <button class="units-panel__close" data-action="close-academy" aria-label="Schließen">✕</button>
            </header>
            <p class="academy-panel__hint">Ausgebildete Einheiten sind stärker. Spezialisierte Arbeiter erhalten mehr Rohstoffe und wechseln bei erschöpften Vorkommen automatisch zum nächsten Feld ihrer Zuteilung.</p>
            <div class="academy-panel__grid"></div>
        </section>

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
    const materialsEl = screen.querySelector('[data-stat="materials"]');
    const opponentsEl = screen.querySelector('[data-stat="opponents"]');
    const unitsPanel = screen.querySelector(".units-panel");
    const unitsGrid = screen.querySelector(".units-panel__grid");
    const tradePanel = screen.querySelector(".trade-panel");
    const relationsPanel = screen.querySelector(".relations-panel");
    const relationsBoard = screen.querySelector(".relations-board");
    const tradeOpponentSelect = screen.querySelector('[data-trade="opponent"]');
    const tradePortrait = screen.querySelector('[data-trade="portrait"]');
    const tradePortraitPanel = screen.querySelector(".trade-panel__portrait");
    const tradeCaption = screen.querySelector('[data-trade="caption"]');
    const tradeStatus = screen.querySelector('[data-trade="status"]');
    const chroniclePanel = screen.querySelector(".chronicle-panel");
    const chronicleList = screen.querySelector(".chronicle-list");
    const buildingsPanel = screen.querySelector(".buildings-panel");
    const buildingsGrid = screen.querySelector(".buildings-panel__grid");
    const researchPanel = screen.querySelector(".research-panel");
    const researchGrid = screen.querySelector(".research-panel__grid");
    const academyPanel = screen.querySelector(".academy-panel");
    const academyGrid = screen.querySelector(".academy-panel__grid");
    const controlsHint = screen.querySelector(".game-controls-hint");
    let pendingBuildingType = null;
    const messageEl = screen.querySelector(".game-message");
    const gameOverEl = screen.querySelector(".game-over-screen");
    const minimap = screen.querySelector(".map-minimap");
    const minimapCanvas = minimap.querySelector("canvas");
    const minimapContext = minimapCanvas.getContext("2d");

    boardEl.style.width = `${match.map.width * TILE_SIZE}px`;
    boardEl.style.height = `${match.map.height * TILE_SIZE}px`;

    buildBoardTiles(boardEl);
    buildUnitsPanelContent(unitsGrid, playerNation?.id);
    buildBuildingsPanelContent(buildingsGrid);
    populateResourceSelect(screen.querySelector('[data-trade="offer-resource"]'), "gold");
    populateResourceSelect(screen.querySelector('[data-trade="request-resource"]'), "wood");
    renderResourceMarkers(boardEl);
    renderUnits(boardEl);
    updateStructureMarkers(boardEl);
    renderChronicle(chronicleList);
    const resumedUnit = getSelectedUnit();
    if (resumedUnit) {
        const highlights = getReachableTiles(resumedUnit);
        if (getUnitTypeById(resumedUnit.typeId)?.category === "ship") highlights.push(...getDisembarkTiles(resumedUnit));
        renderBoardHighlights(boardEl, highlights);
    }
    updateHud(turnEl, goldEl, opponentsEl, materialsEl);
    const viewport = screen.querySelector(".map-viewport");
    drawMinimap(minimapContext, viewport, minimapCanvas);
    viewport.addEventListener("scroll", () => drawMinimap(minimapContext, viewport, minimapCanvas));
    minimap.addEventListener("click", (event) => {
        const rect = minimapCanvas.getBoundingClientRect();
        const boardX = ((event.clientX - rect.left) / rect.width) * boardEl.offsetWidth;
        const boardY = ((event.clientY - rect.top) / rect.height) * boardEl.offsetHeight;
        viewport.scrollTo({
            left: boardX - viewport.clientWidth / 2,
            top: boardY - viewport.clientHeight / 2,
            behavior: "smooth"
        });
    });
    requestAnimationFrame(() => {
        const capital = match.capitals.find((entry) => entry.owner === "player");
        viewport.scrollLeft = Math.max(0, capital.x * TILE_SIZE - viewport.clientWidth / 2);
        viewport.scrollTop = Math.max(0, capital.y * TILE_SIZE - viewport.clientHeight / 2);
        drawMinimap(minimapContext, viewport, minimapCanvas);
    });

    // ---- Interaktionen ----

    boardEl.addEventListener("click", (event) => {
        // Die Terrainkarte ist eine durchgehende Canvas-Fläche ohne einzelne
        // Kachel-Elemente. Die Feldkoordinate kommt aus der Board-Position.
        const rect = boardEl.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / TILE_SIZE);
        const y = Math.floor((event.clientY - rect.top) / TILE_SIZE);
        if (x < 0 || y < 0 || x >= match.map.width || y >= match.map.height) return;

        if (pendingBuildingType) {
            const result = constructBuilding("player", pendingBuildingType, x, y);
            if (result.ok) {
                pendingBuildingType = null;
                controlsHint.textContent = "Truppen sammeln · 3 Kämpfer halten eine Hauptstadtbelagerung · Jäger sehen weiter";
                renderBoardHighlights(boardEl, []);
                showMessage(messageEl, "Das Gebäude wurde errichtet.");
            } else {
                showMessage(messageEl, result.reason);
            }
        } else {
            handleTileClick(x, y, boardEl, messageEl, event);
        }
        afterAction(boardEl, turnEl, goldEl, opponentsEl, materialsEl, gameOverEl, minimapContext, viewport, minimapCanvas, chronicleList);
    });

    screen.querySelector('[data-action="toggle-units"]').addEventListener("click", () => {
        researchPanel.hidden = true;
        academyPanel.hidden = true;
        tradePanel.hidden = true;
        relationsPanel.hidden = true;
        chroniclePanel.hidden = true;
        buildingsPanel.hidden = true;
        refreshUnitsPanelAffordability(unitsGrid);
        unitsPanel.hidden = !unitsPanel.hidden;
    });
    screen.querySelector('[data-action="close-units"]').addEventListener("click", () => {
        unitsPanel.hidden = true;
    });

    screen.querySelector('[data-action="toggle-chronicle"]').addEventListener("click", () => {
        researchPanel.hidden = true;
        academyPanel.hidden = true;
        unitsPanel.hidden = true;
        tradePanel.hidden = true;
        relationsPanel.hidden = true;
        chroniclePanel.hidden = !chroniclePanel.hidden;
        renderChronicle(chronicleList);
    });
    screen.querySelector('[data-action="close-chronicle"]').addEventListener("click", () => {
        chroniclePanel.hidden = true;
    });

    screen.querySelector('[data-action="toggle-relations"]').addEventListener("click", () => {
        researchPanel.hidden = true;
        academyPanel.hidden = true;
        unitsPanel.hidden = true;
        tradePanel.hidden = true;
        chroniclePanel.hidden = true;
        buildingsPanel.hidden = true;
        relationsPanel.hidden = !relationsPanel.hidden;
        if (!relationsPanel.hidden) renderMoodBoard(relationsBoard);
    });
    screen.querySelector('[data-action="close-relations"]').addEventListener("click", () => {
        relationsPanel.hidden = true;
    });

    screen.querySelector('[data-action="toggle-buildings"]').addEventListener("click", () => {
        researchPanel.hidden = true;
        academyPanel.hidden = true;
        tradePanel.hidden = true;
        relationsPanel.hidden = true;
        chroniclePanel.hidden = true;
        unitsPanel.hidden = true;
        if (pendingBuildingType) {
            pendingBuildingType = null;
            renderBoardHighlights(boardEl, []);
            controlsHint.textContent = "Truppen sammeln · 3 Kämpfer halten eine Hauptstadtbelagerung · Jäger sehen weiter";
        }
        buildingsPanel.hidden = !buildingsPanel.hidden;
        refreshBuildingAffordability(buildingsGrid);
    });
    screen.querySelector('[data-action="close-buildings"]').addEventListener("click", () => {
        buildingsPanel.hidden = true;
    });
    screen.querySelector('[data-action="toggle-research"]').addEventListener("click", () => {
        academyPanel.hidden = true;
        [unitsPanel, tradePanel, relationsPanel, chroniclePanel, buildingsPanel].forEach((panel) => { panel.hidden = true; });
        researchPanel.hidden = !researchPanel.hidden;
        renderResearchPanel(researchGrid);
    });
    screen.querySelector('[data-action="close-research"]').addEventListener("click", () => { researchPanel.hidden = true; });
    researchGrid.addEventListener("click", (event) => {
        const card = event.target.closest("[data-research-id]");
        if (!card || card.disabled) return;
        const result = startResearch("player", card.dataset.researchId);
        if (!result.ok) showMessage(messageEl, result.reason);
        renderResearchPanel(researchGrid);
        saveCurrentMatch();
    });
    screen.querySelector('[data-action="toggle-academy"]').addEventListener("click", () => {
        [unitsPanel, tradePanel, relationsPanel, chroniclePanel, buildingsPanel, researchPanel].forEach((panel) => { panel.hidden = true; });
        academyPanel.hidden = !academyPanel.hidden;
        renderAcademyPanel(academyGrid);
    });
    screen.querySelector('[data-action="close-academy"]').addEventListener("click", () => { academyPanel.hidden = true; });
    academyGrid.addEventListener("click", (event) => {
        const button = event.target.closest("[data-academy-train]");
        if (!button || button.disabled) return;
        const result = startAcademyTraining(button.dataset.academyId, button.dataset.academyTrain);
        if (!result.ok) showMessage(messageEl, result.reason);
        renderAcademyPanel(academyGrid);
        updateHud(turnEl, goldEl, opponentsEl, materialsEl);
        saveCurrentMatch();
    });
    buildingsGrid.addEventListener("click", (event) => {
        const card = event.target.closest("[data-building-type]");
        if (!card || card.disabled) return;
        pendingBuildingType = card.dataset.buildingType;
        buildingsPanel.hidden = true;
        clearSelection();
        const validTiles = getBuildableTiles("player", pendingBuildingType);
        renderBuildHighlights(boardEl, validTiles);
        controlsHint.textContent = "Gebäude platzieren: markiertes Feld wählen · „Bauen“ bricht ab";
        showMessage(messageEl, validTiles.length ? "Wähle ein markiertes Feld für den Bau." : "Kein gültiger Bauplatz. Prüfe Arbeiter und Baumaterialien.");
    });

    screen.querySelector('[data-action="toggle-trade"]').addEventListener("click", () => {
        researchPanel.hidden = true;
        academyPanel.hidden = true;
        unitsPanel.hidden = true;
        relationsPanel.hidden = true;
        chroniclePanel.hidden = true;
        buildingsPanel.hidden = true;
        tradePanel.hidden = !tradePanel.hidden;
        if (tradePanel.hidden) return;
        refreshTradeOpponents(tradeOpponentSelect);
        resetTradeResponse(tradeOpponentSelect, tradePortrait, tradePortraitPanel, tradeCaption, tradeStatus);
    });
    screen.querySelector('[data-action="close-trade"]').addEventListener("click", () => {
        tradePanel.hidden = true;
    });
    tradeOpponentSelect.addEventListener("change", () => resetTradeResponse(tradeOpponentSelect, tradePortrait, tradePortraitPanel, tradeCaption, tradeStatus));
    tradePanel.querySelectorAll("select, input").forEach((input) => {
        input.addEventListener("input", () => resetTradeResponse(tradeOpponentSelect, tradePortrait, tradePortraitPanel, tradeCaption, tradeStatus));
        input.addEventListener("change", () => resetTradeResponse(tradeOpponentSelect, tradePortrait, tradePortraitPanel, tradeCaption, tradeStatus));
    });
    screen.querySelector('[data-action="propose-trade"]').addEventListener("click", () => {
        resetTradeResponse(tradeOpponentSelect, tradePortrait, tradePortraitPanel, tradeCaption, tradeStatus);
        const opponentId = tradeOpponentSelect.value;
        const offer = {
            resource: screen.querySelector('[data-trade="offer-resource"]').value,
            amount: Number(screen.querySelector('[data-trade="offer-amount"]').value)
        };
        const request = {
            resource: screen.querySelector('[data-trade="request-resource"]').value,
            amount: Number(screen.querySelector('[data-trade="request-amount"]').value)
        };
        const result = proposeTrade("player", opponentId, offer, request);
        saveCurrentMatch();
        tradeStatus.textContent = result.reason;
        if (!result.ok) return;

        tradePortraitPanel.classList.toggle("trade-panel__portrait--approved", result.approved);
        tradePortraitPanel.classList.toggle("trade-panel__portrait--denied", !result.approved);
        const opponent = getPlayerById(opponentId);
        const opponentNation = opponent && getNationById(opponent.nationId);
        tradeCaption.textContent = result.approved ? "Das Reich nimmt den Handel an" : "Das Reich lehnt den Handel ab";
        if (opponentNation) {
            const artId = getTradeArtId(opponentNation.id);
            const reaction = result.approved ? "approve" : "deny";
            setTradePortrait(tradePortrait, `assets/trade/${reaction}/${artId}.png`, opponentNation.image);
        }
        updateHud(turnEl, goldEl, opponentsEl, materialsEl);
        renderChronicle(chronicleList);
        refreshUnitsPanelAffordability(unitsGrid);
        if (!relationsPanel.hidden) renderMoodBoard(relationsBoard);
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
        saveCurrentMatch();
        renderUnits(boardEl);
        renderChronicle(chronicleList);
        updateHud(turnEl, goldEl, opponentsEl, materialsEl);
        drawMinimap(minimapContext, viewport, minimapCanvas);
    });

    screen.querySelector('[data-action="back-to-start"]').addEventListener("click", () => {
        stopAnimationLoop();
        changeScreen("start");
    });

    startAnimationLoop(boardEl);
    if (match.gameOver) showGameOver(gameOverEl);
}

// ============================================================
// Karte / Tiles
// ============================================================

function buildBoardTiles(boardEl) {
    const terrainLayer = document.createElement("div");
    terrainLayer.className = "tile-layer";
    const terrainCanvas = document.createElement("canvas");
    terrainCanvas.className = "terrain-canvas";
    terrainCanvas.width = match.map.width * TILE_SIZE;
    terrainCanvas.height = match.map.height * TILE_SIZE;
    terrainLayer.style.width = `${terrainCanvas.width}px`;
    terrainLayer.style.height = `${terrainCanvas.height}px`;
    terrainCanvas.style.width = `${terrainCanvas.width}px`;
    terrainCanvas.style.height = `${terrainCanvas.height}px`;
    terrainLayer.appendChild(terrainCanvas);
    drawTerrainMap(terrainCanvas);
    boardEl.appendChild(terrainLayer);

    const markerLayer = document.createElement("div");
    markerLayer.className = "marker-layer";
    match.capitals.forEach((capital) => markerLayer.appendChild(buildStructureMarker(capital, "capital", "🏛")));
    match.ports.forEach((port) => markerLayer.appendChild(buildStructureMarker(port, "port", "⚓")));
    match.buildings.forEach((building) => markerLayer.appendChild(buildBuildingMarker(building)));
    boardEl.appendChild(markerLayer);

    const resourceLayer = document.createElement("div");
    resourceLayer.className = "resource-layer";
    boardEl.appendChild(resourceLayer);

    const highlightLayer = document.createElement("div");
    highlightLayer.className = "highlight-layer";
    boardEl.appendChild(highlightLayer);

    const unitLayer = document.createElement("div");
    unitLayer.className = "unit-layer";
    boardEl.appendChild(unitLayer);

    const fogCanvas = document.createElement("canvas");
    fogCanvas.className = "fog-layer";
    fogCanvas.width = match.map.width * TILE_SIZE;
    fogCanvas.height = match.map.height * TILE_SIZE;
    fogCanvas.style.width = `${fogCanvas.width}px`;
    fogCanvas.style.height = `${fogCanvas.height}px`;
    boardEl.appendChild(fogCanvas);
    drawFogOfWar(fogCanvas);
}

function drawFogOfWar(canvas) {
    const source = document.createElement("canvas");
    source.width = match.map.width * 2;
    source.height = match.map.height * 2;
    const sourceContext = source.getContext("2d");
    const image = sourceContext.createImageData(source.width, source.height);
    for (let y = 0; y < match.map.height; y++) for (let x = 0; x < match.map.width; x++) {
        const alpha = isVisibleToPlayer(x, y) ? 0 : isExploredByPlayer(x, y) ? 148 : 238;
        for (let oy = 0; oy < 2; oy++) for (let ox = 0; ox < 2; ox++) {
            const index = ((y * 2 + oy) * source.width + x * 2 + ox) * 4;
            image.data[index] = 5;
            image.data[index + 1] = 10;
            image.data[index + 2] = 12;
            image.data[index + 3] = alpha;
        }
    }
    sourceContext.putImageData(image, 0, 0);
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.filter = "blur(14px)";
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    context.filter = "none";
}

function drawTerrainMap(canvas) {
    const ctx = canvas.getContext("2d");
    const size = TILE_SIZE;
    const width = canvas.width;
    const height = canvas.height;
    if (match.map.id === "saphirmeer" && match.map.image) {
        ctx.fillStyle = "#16425a";
        ctx.fillRect(0, 0, width, height);
        const artwork = new Image();
        artwork.onload = () => {
            if (match.map?.id !== "saphirmeer" || !canvas.isConnected) return;
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(artwork, 0, 0, width, height);
        };
        artwork.src = match.map.image;
        return;
    }
    const sea = ctx.createLinearGradient(0, 0, width, height);
    sea.addColorStop(0, "#315963");
    sea.addColorStop(0.55, "#1d414a");
    sea.addColorStop(1, "#15333d");
    ctx.fillStyle = sea;
    ctx.fillRect(0, 0, width, height);
    const randomAt = (x, y, n = 0) => {
        let value = (x * 92821 + y * 68917 + match.map.id.length * 977 + n * 374761393) >>> 0;
        value = Math.imul(value ^ (value >>> 13), 1274126177);
        return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
    };
    const landTiles = [];
    // Draw the entire sea first so later coast and terrain shapes cover its
    // details naturally instead of exposing the old tile-by-tile seams.
    for (let y = 0; y < match.map.height; y++) for (let x = 0; x < match.map.width; x++) {
        const tile = match.tiles[y][x];
        const cx = (x + 0.5) * size;
        const cy = (y + 0.5) * size;
        if (tile.terrain !== "water") { landTiles.push(tile); continue; }
        ctx.strokeStyle = `rgba(160,204,192,${0.08 + randomAt(x, y, 1) * 0.12})`;
        ctx.lineWidth = 1 + randomAt(x, y, 2) * 2.2;
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.62, cy + (randomAt(x, y, 3) - 0.5) * size * 0.4);
        ctx.bezierCurveTo(cx - size * 0.2, cy - 13, cx + size * 0.2, cy + 13,
            cx + size * 0.64, cy + (randomAt(x, y, 4) - 0.5) * size * 0.4);
        ctx.stroke();
    }

    // Broad, overlapping coast shapes avoid the repeated circular patches of
    // the old map and create connected landmasses with irregular shorelines.
    landTiles.forEach((tile) => {
        const { x, y } = tile;
        const cx = (x + 0.5) * size;
        const cy = (y + 0.5) * size;
        const radius = size * (0.76 + randomAt(x, y, 5) * 0.12);
        const coastline = [];
        for (let point = 0; point < 24; point++) {
            const angle = (point / 24) * Math.PI * 2;
            const wave = Math.sin(angle * 3 + x * 0.7 + y * 0.25) * 0.06 + Math.cos(angle * 5 - y * 0.35) * 0.035;
            const r = radius * (0.94 + wave + randomAt(x, y, point + 6) * 0.08);
            coastline.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
        }
        ctx.beginPath();
        const firstMid = { x: (coastline[0].x + coastline.at(-1).x) / 2, y: (coastline[0].y + coastline.at(-1).y) / 2 };
        ctx.moveTo(firstMid.x, firstMid.y);
        coastline.forEach((point, index) => {
            const next = coastline[(index + 1) % coastline.length];
            ctx.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
        });
        ctx.closePath();
        const feature = tile.feature;
        const palette = tile.terrain === "bridge" ? ["#887653", "#a28b5e", "#685940"]
            : feature === "forest" ? ["#3d6042", "#4c704b", "#2d4e38"]
            : feature === "highland" ? ["#777660", "#8c896e", "#656a57"]
            : feature === "dune" || feature === "sand" ? ["#b39a65", "#c5ac73", "#a18858"]
            : feature === "road" ? ["#8e7a52", "#a38c5b", "#746342"]
            : ["#74834d", "#829157", "#637747"];
        const patch = ctx.createRadialGradient(cx - size * 0.27, cy - size * 0.3, 2, cx, cy, radius * 1.1);
        patch.addColorStop(0, palette[1]);
        patch.addColorStop(0.56, palette[0]);
        patch.addColorStop(1, palette[2]);
        ctx.globalAlpha = tile.terrain === "bridge" ? 0.96 : 0.88;
        ctx.fillStyle = patch;
        ctx.fill();
        ctx.globalAlpha = 1;
    });

    landTiles.forEach((tile) => {
        const { x, y } = tile;
        const cx = (x + 0.5) * size;
        const cy = (y + 0.5) * size;
        const rand = (n) => randomAt(x, y, n);
        if (tile.feature === "forest") {
            // Group canopies into irregular groves with layered highlights and shadows.
            for (let tree = 0; tree < 8; tree++) {
                const tx = cx + (rand(tree + 20) - 0.5) * size * 0.78;
                const ty = cy + (rand(tree + 30) - 0.5) * size * 0.7;
                const tr = size * (0.075 + rand(tree + 40) * 0.045);
                ctx.fillStyle = "rgba(22,42,29,.42)";
                ctx.beginPath(); ctx.ellipse(tx + tr * 0.25, ty + tr * 0.45, tr * 1.02, tr * 0.63, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = tree % 3 === 0 ? "#2f523a" : tree % 2 ? "#4c7047" : "#3b6041";
                ctx.beginPath(); ctx.arc(tx, ty, tr, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "rgba(183,194,126,.25)";
                ctx.beginPath(); ctx.arc(tx - tr * 0.28, ty - tr * 0.3, tr * 0.44, 0, Math.PI * 2); ctx.fill();
            }
        } else if (tile.feature === "highland") {
            for (let ridge = 0; ridge < 2; ridge++) {
                const mx = cx + (rand(ridge + 50) - 0.5) * size * 0.5;
                const my = cy + (rand(ridge + 60) - 0.5) * size * 0.45;
                const peak = size * (0.22 + rand(ridge + 70) * 0.06);
                ctx.fillStyle = "rgba(55,58,49,.48)";
                ctx.beginPath(); ctx.moveTo(mx - peak * 1.2, my + peak * 0.7); ctx.quadraticCurveTo(mx - peak * 0.25, my - peak * 0.2, mx, my - peak); ctx.quadraticCurveTo(mx + peak * 0.5, my - peak * 0.1, mx + peak * 1.3, my + peak * 0.7); ctx.fill();
                ctx.fillStyle = "rgba(209,207,178,.48)";
                ctx.beginPath(); ctx.moveTo(mx, my - peak); ctx.lineTo(mx + peak * 0.32, my - peak * 0.22); ctx.lineTo(mx + peak * 0.05, my - peak * 0.05); ctx.lineTo(mx - peak * 0.12, my + peak * 0.12); ctx.fill();
                ctx.strokeStyle = "rgba(223,216,177,.2)";
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.ellipse(mx, my + peak * 0.5, peak * 1.05, peak * 0.35, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
            }
        } else if (tile.feature === "dune" || tile.feature === "sand") {
            ctx.strokeStyle = "rgba(241,218,158,.28)";
            ctx.lineWidth = 2;
            for (let band = 0; band < 3; band++) {
                const offset = (band - 1) * size * 0.2;
                ctx.beginPath(); ctx.moveTo(cx - size * 0.4, cy + offset + 5); ctx.bezierCurveTo(cx - size * 0.1, cy + offset - 12, cx + size * 0.12, cy + offset + 15, cx + size * 0.42, cy + offset - 2); ctx.stroke();
            }
        } else if (tile.terrain === "bridge") {
            ctx.strokeStyle = "rgba(57,43,29,.76)";
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(cx - size * 0.3, cy - 9); ctx.lineTo(cx + size * 0.3, cy - 9); ctx.moveTo(cx - size * 0.3, cy + 9); ctx.lineTo(cx + size * 0.3, cy + 9); ctx.stroke();
            ctx.strokeStyle = "rgba(225,194,128,.76)";
            ctx.lineWidth = 2;
            for (let plank = -16; plank <= 16; plank += 7) {
                ctx.beginPath(); ctx.moveTo(cx + plank, cy - 8); ctx.lineTo(cx + plank, cy + 8); ctx.stroke();
            }
        } else {
            for (let speck = 0; speck < 7; speck++) {
                ctx.fillStyle = `rgba(218,209,151,${0.09 + rand(speck + 70) * 0.13})`;
                ctx.beginPath(); ctx.ellipse(cx + (rand(speck + 80) - 0.5) * size * 0.8, cy + (rand(speck + 90) - 0.5) * size * 0.76, 2 + rand(speck + 100) * 3, 1.5, rand(speck + 110), 0, Math.PI * 2); ctx.fill();
            }
        }
    });

    // Lay connected, slightly winding dirt roads over the land and across the bridges.
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let y = 0; y < match.map.height; y++) for (let x = 0; x < match.map.width; x++) {
        if (match.tiles[y][x].feature !== "road" && match.tiles[y][x].feature !== "bridge") continue;
        const cx = (x + 0.5) * size;
        const cy = (y + 0.5) * size;
        for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
            const next = match.tiles[y + dy]?.[x + dx];
            if (next?.feature !== "road" && next?.feature !== "bridge") continue;
            ctx.strokeStyle = "rgba(79,64,42,.58)";
            ctx.lineWidth = size * 0.19;
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(cx + dx * size * 0.24, cy + dy * size * 0.24 + Math.sin(x + y) * 2, (x + dx + 0.5) * size, (y + dy + 0.5) * size); ctx.stroke();
            ctx.strokeStyle = "rgba(193,167,112,.5)";
            ctx.lineWidth = size * 0.1;
            ctx.stroke();
        }
    }
    const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.2, width / 2, height / 2, Math.max(width, height) * 0.72);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(8,16,15,.24)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
}

function positionEl(el, x, y) {
    el.style.left = `${x * TILE_SIZE}px`;
    el.style.top = `${y * TILE_SIZE}px`;
    el.style.width = `${TILE_SIZE}px`;
    el.style.height = `${TILE_SIZE}px`;
}

function drawMinimap(context, viewport, canvas) {
    if (!context || !viewport) return;
    const cellWidth = canvas.width / match.map.width;
    const cellHeight = canvas.height / match.map.height;
    const terrainColors = {
        water: "#244c59", plain: "#778151", road: "#9b865b", bridge: "#9a8055", forest: "#365941",
        highland: "#81785d", sand: "#af935b", dune: "#c4a969"
    };

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#071015";
    context.fillRect(0, 0, canvas.width, canvas.height);
    match.tiles.forEach((row) => row.forEach((tile) => {
        if (!isExploredByPlayer(tile.x, tile.y)) return;
        context.globalAlpha = isVisibleToPlayer(tile.x, tile.y) ? 1 : 0.52;
        context.fillStyle = terrainColors[tile.feature] || terrainColors[tile.terrain] || "#74804d";
        context.beginPath();
        context.ellipse((tile.x + 0.5) * cellWidth, (tile.y + 0.5) * cellHeight, cellWidth * 0.78, cellHeight * 0.78, 0, 0, Math.PI * 2);
        context.fill();
    }));
    context.globalAlpha = 1;

    match.capitals.forEach((capital) => {
        if (capital.owner !== "player" && !isVisibleToPlayer(capital.x, capital.y)) return;
        const owner = getPlayerById(capital.owner);
        const nation = owner && getNationById(owner.nationId);
        context.fillStyle = capital.destroyed ? "#77736a" : nation?.color || "#e5c778";
        context.beginPath();
        context.arc((capital.x + 0.5) * cellWidth, (capital.y + 0.5) * cellHeight, Math.max(2, cellWidth * 0.65), 0, Math.PI * 2);
        context.fill();
    });
    match.buildings.filter((building) => !building.destroyed).forEach((building) => {
        if (building.owner !== "player" && !isVisibleToPlayer(building.x, building.y)) return;
        const owner = getPlayerById(building.owner);
        const nation = owner && getNationById(owner.nationId);
        context.fillStyle = nation?.color || "#e5c778";
        context.beginPath();
        context.arc((building.x + 0.5) * cellWidth, (building.y + 0.5) * cellHeight, Math.max(1.5, cellWidth * 0.4), 0, Math.PI * 2);
        context.fill();
    });
    match.units.forEach((unit) => {
        if (unit.owner !== "player" && !isVisibleToPlayer(unit.x, unit.y)) return;
        const owner = getPlayerById(unit.owner);
        const nation = owner && getNationById(owner.nationId);
        context.fillStyle = nation?.color || "#fff1c6";
        context.beginPath();
        context.arc((unit.x + 0.5) * cellWidth, (unit.y + 0.5) * cellHeight, Math.max(1.5, cellWidth * 0.55), 0, Math.PI * 2);
        context.fill();
    });

    const x = (viewport.scrollLeft / (match.map.width * TILE_SIZE)) * canvas.width;
    const y = (viewport.scrollTop / (match.map.height * TILE_SIZE)) * canvas.height;
    const width = (viewport.clientWidth / (match.map.width * TILE_SIZE)) * canvas.width;
    const height = (viewport.clientHeight / (match.map.height * TILE_SIZE)) * canvas.height;
    context.strokeStyle = "rgba(255, 245, 214, 0.95)";
    context.lineWidth = 1.5;
    context.strokeRect(x, y, width, height);
}

function buildStructureMarker(structure, kind, symbol) {
    const nation = getNationById(getPlayerById(structure.owner).nationId);
    const el = document.createElement("div");
    el.className = `structure-marker structure-marker--${kind}`;
    positionEl(el, structure.x, structure.y);
    el.style.setProperty("--marker-color", nation ? nation.color : "#b8935a");
    el.dataset.owner = structure.owner;
    el.dataset.kind = kind;
    el.textContent = symbol;
    if (kind === "capital") {
        const track = document.createElement("span");
        track.className = "capital-siege__track";
        const fill = document.createElement("span");
        fill.className = "capital-siege__fill";
        track.appendChild(fill);
        el.appendChild(track);
    }
    return el;
}

function buildBuildingMarker(building) {
    const type = buildingTypes.find((entry) => entry.id === building.typeId);
    const nation = getNationById(getPlayerById(building.owner)?.nationId);
    const marker = document.createElement("div");
    marker.className = "structure-marker structure-marker--building";
    marker.dataset.buildingId = building.id;
    marker.dataset.owner = building.owner;
    marker.dataset.typeId = building.typeId;
    marker.classList.add(`structure-marker--type-${building.typeId}`);
    positionEl(marker, building.x, building.y);
    marker.style.setProperty("--marker-color", nation?.color || "#b8935a");
    marker.title = `${type?.name || "Gebäude"} · ${building.health}/${building.maxHealth} LP`;
    marker.textContent = type?.symbol || "⌂";
    const health = document.createElement("span");
    health.className = "building-marker__health";
    const fill = document.createElement("span");
    fill.style.width = `${Math.max(0, (building.health / building.maxHealth) * 100)}%`;
    health.appendChild(fill);
    marker.appendChild(health);
    if (building.destroyed) marker.classList.add("structure-marker--destroyed");
    return marker;
}

function renderResourceMarkers(boardEl) {
    const layer = boardEl.querySelector(".resource-layer");
    if (!layer) return;
    layer.innerHTML = "";
    const symbols = { gold: "◈", wheat: "✦", wood: "♣", stone: "◆" };
    match.tiles.flat().forEach((tile) => {
        if (!tile.resource || tile.resourceAmount <= 0 || !isExploredByPlayer(tile.x, tile.y)) return;
        const marker = document.createElement("div");
        marker.className = `resource-marker resource-marker--${tile.resource}`;
        marker.textContent = symbols[tile.resource];
        marker.dataset.amount = String(tile.resource === "gold" ? tile.resourceAmount * 8 : tile.resourceAmount);
        marker.title = tile.resource === "gold"
            ? `Goldader · ${tile.resourceAmount * 8} Gold verbleiben · Arbeiter sammelt 8 Gold je 10 Sekunden`
            : `${tile.resource}: ${tile.resourceAmount} verbleiben`;
        positionEl(marker, tile.x, tile.y);
        layer.appendChild(marker);
    });
}

// ============================================================
// Einheiten rendern
// ============================================================

/**
 * Baut die Einheiten-Layer komplett neu auf. Wird nach echten
 * Zustandsänderungen aufgerufen (Kauf, Bewegung, Angriff, Gebäudebau),
 * NICHT bei jedem Animations-Tick — dafür gibt es updateUnitSprites().
 */
function renderUnits(boardEl) {
    const unitLayer = boardEl.querySelector(".unit-layer");
    unitLayer.innerHTML = "";

    match.units.forEach((unit) => {
        if (unit.owner !== "player" && !isVisibleToPlayer(unit.x, unit.y)) return;
        const el = buildUnitElement(unit);
        unitLayer.appendChild(el);
    });
}

function buildUnitElement(unit) {
    const nationId = getPlayerById(unit.owner).nationId;
    const nation = getNationById(nationId);
    const unitType = getUnitTypeById(unit.typeId);

    const el = document.createElement("div");
    el.className = "unit";
    el.dataset.unitId = unit.id;
    el.dataset.owner = unit.owner;
    positionEl(el, unit.x, unit.y);
    el.style.setProperty("--unit-color", nation ? nation.color : "#b8935a");
    if (unit.hasActed && match.mode !== "realtime") el.classList.add("unit--spent");
    if ((match.selectedUnitIds || [match.selectedUnitId]).includes(unit.id)) el.classList.add("unit--selected");
    const maxHealth = unit.maxHealth || unitType?.health || unit.health;
    const jobDescription = unit.gatheringResource ? ` · Sammelauftrag: ${unit.gatheringResource}` : "";
    const unitDescription = `${nation?.name || "Reich"}: ${unitType?.name || "Einheit"}${unit.academyTrained ? " · ausgebildet" : ""}${jobDescription} · ${unit.health}/${maxHealth} LP${unit.cargo?.length ? ` · ${unit.cargo.length} Truppe(n) an Bord` : ""}`;
    el.title = unitDescription;
    el.setAttribute("aria-label", unitDescription);

    const spriteEl = document.createElement("div");
    spriteEl.className = "unit__sprite";
    el.appendChild(spriteEl);
    updateUnitSpriteVisual(spriteEl, unit, nationId);
    if (unitType?.nations) {
        const badge = document.createElement("span");
        badge.className = "unit__national-badge";
        badge.textContent = unitType.symbol || "✦";
        badge.setAttribute("aria-hidden", "true");
        el.appendChild(badge);
    }

    const healthBar = document.createElement("div");
    healthBar.className = "unit__health";
    const pct = unitType ? Math.max(0, Math.min(100, (unit.health / (unit.maxHealth || unitType.health)) * 100)) : 100;
    healthBar.innerHTML = `<span style="width:${pct}%"></span>`;
    el.appendChild(healthBar);

    if (unit.cargo?.length) {
        const cargoBadge = document.createElement("span");
        cargoBadge.className = "unit__cargo";
        cargoBadge.textContent = String(unit.cargo.length);
        cargoBadge.setAttribute("aria-label", `${unit.cargo.length} transportierte Einheit(en)`);
        el.appendChild(cargoBadge);
    }

    return el;
}

function updateUnitSpriteVisual(spriteEl, unit, nationId) {
    const usedSprite = applySpriteToElement(spriteEl, unit, nationId);
    if (!usedSprite) {
        spriteEl.classList.add("unit__sprite--fallback");
        spriteEl.textContent = FALLBACK_SYMBOLS[unit.typeId] || getUnitTypeById(unit.typeId)?.symbol || "?";
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
    match.units.filter((unit) => unit.owner === "player" && unit.moveOrder).forEach((unit) => {
        const marker = document.createElement("div");
        marker.className = "tile-highlight tile-highlight--order";
        positionEl(marker, unit.moveOrder.x, unit.moveOrder.y);
        layer.appendChild(marker);
    });
}

function renderBuildHighlights(boardEl, tiles) {
    const layer = boardEl.querySelector(".highlight-layer");
    layer.innerHTML = "";
    tiles.forEach((pos) => {
        const el = document.createElement("div");
        el.className = "tile-highlight tile-highlight--build";
        el.textContent = "⚒";
        positionEl(el, pos.x, pos.y);
        layer.appendChild(el);
    });
}

// ============================================================
// Interaktion: Tile-Klicks
// ============================================================

function handleTileClick(x, y, boardEl, messageEl, event = {}) {
    if (match.gameOver) return;
    let clickedUnit = getUnitAt(x, y);
    if (clickedUnit?.owner !== "player" && !isVisibleToPlayer(x, y)) clickedUnit = null;
    const selected = getSelectedUnits();
    const multiKey = event.shiftKey || event.ctrlKey || event.metaKey;

    if (clickedUnit?.owner === "player") {
        if (!multiKey && selected.length === 1 && selected[0].id !== clickedUnit.id) {
            const firstType = getUnitTypeById(selected[0].typeId);
            const clickedType = getUnitTypeById(clickedUnit.typeId);
            // Einschiffen wird nur ausgelöst, wenn eine Landtruppe ausgewählt
            // ist und anschließend ein benachbartes eigenes Schiff angeklickt
            // wird. Ist das Schiff ausgewählt, bleibt der Klick auf eine
            // andere eigene Einheit immer eine normale Auswahl.
            const passenger = selected[0];
            const isAdjacent = Math.max(Math.abs(passenger.x - clickedUnit.x), Math.abs(passenger.y - clickedUnit.y)) <= 1;
            if (["land", "cavalry"].includes(firstType?.category) && clickedType?.category === "ship" && isAdjacent) {
                const result = embarkUnit(passenger, clickedUnit);
                if (result.ok) {
                    clearSelection();
                    showMessage(messageEl, "Die Einheit ist an Bord gegangen.");
                } else showMessage(messageEl, result.reason);
                return;
            }
        }
        if (multiKey) {
            const ids = selected.map((unit) => unit.id);
            const next = ids.includes(clickedUnit.id) ? ids.filter((id) => id !== clickedUnit.id) : [...ids, clickedUnit.id];
            selectUnits(next);
        } else selectUnit(clickedUnit.id);
        renderBoardHighlights(boardEl, []);
        return;
    }

    if (!selected.length) {
        clearSelection();
        renderBoardHighlights(boardEl, []);
        return;
    }

    if (clickedUnit && clickedUnit.owner !== "player") {
        const attackers = selected.filter((unit) => getUnitTypeById(unit.typeId)?.canAttack);
        const ready = attackers.filter((unit) => canAttack(unit, clickedUnit));
        if (ready.length === 1 && attackers.length === 1) {
            ready[0].moveOrder = null;
            attack(ready[0], clickedUnit);
            return;
        }
        const immediate = attackers.filter((unit) => canAttack(unit, clickedUnit));
        immediate.forEach((unit) => { unit.moveOrder = null; attack(unit, clickedUnit); });
        const approaching = attackers.filter((unit) => !immediate.includes(unit));
        issueAttackOrder(approaching, clickedUnit);
        showMessage(messageEl, "Angriffsbefehl erteilt.");
        return;
    }

    let clickedBuilding = getBuildingAt(x, y);
    if (clickedBuilding?.owner !== "player" && !isVisibleToPlayer(x, y)) clickedBuilding = null;
    if (clickedBuilding?.typeId === "gate" && clickedBuilding.owner === "player") {
        const moved = selected.length === 1 && issueMoveOrder(selected[0], x, y);
        if (moved) showMessage(messageEl, "Das eigene Tor öffnet sich für deine Truppen.");
        else if (selected.length > 1) showMessage(messageEl, "Schicke die Truppen einzeln durch das Tor.");
        return;
    }
    if (clickedBuilding) {
        const attackers = selected.filter((unit) => getUnitTypeById(unit.typeId)?.canAttack);
        const ready = attackers.filter((unit) => canAttackBuilding(unit, clickedBuilding));
        if (ready.length === 1 && attackers.length === 1) { ready[0].moveOrder = null; attackBuilding(ready[0], clickedBuilding); }
        else if (attackers.length) {
            ready.forEach((unit) => { unit.moveOrder = null; attackBuilding(unit, clickedBuilding); });
            issueAttackOrder(attackers.filter((unit) => !ready.includes(unit)), clickedBuilding);
        }
        return;
    }

    const tile = match.tiles[y]?.[x];
    if (!tile || (selected.length > 1 && selected.some((unit) => getUnitTypeById(unit.typeId)?.category !== getUnitTypeById(selected[0].typeId)?.category))) {
        if (selected.length > 1) showMessage(messageEl, "Für einen gemeinsamen Marsch müssen die gewählten Truppen zum selben Gelände passen.");
        return;
    }
    if (selected.length === 1) {
        const unit = selected[0];
        if (unit.typeId === "worker" && unit.academyTrained && tile.resource && assignWorkerResource(unit, tile.resource, tile)) {
            showMessage(messageEl, `Arbeiter sammelt jetzt ${tile.resource} und sucht nach Erschöpfung automatisch das nächste Vorkommen.`);
            return;
        }
        if (getUnitTypeById(unit.typeId)?.category === "ship" && unit.cargo?.length && ["land", "bridge"].includes(tile.terrain)) {
            const result = disembarkUnit(unit, x, y);
            if (result.ok) showMessage(messageEl, "Truppen sind an Land gegangen.");
            else showMessage(messageEl, result.reason);
            return;
        }
    }
    const ordered = selected.length > 1 ? issueGroupMoveOrders(selected, x, y) : (issueMoveOrder(selected[0], x, y) ? selected : []);
    if (ordered.length) {
        showMessage(messageEl, `${ordered.length} Truppe(n) rücken zum markierten Ziel vor.`);
    } else showMessage(messageEl, "Dorthin führt kein freier Weg für die gewählte Truppe.");
}

function issueAttackOrder(units, target) {
    units.forEach((unit) => declareWar(unit.owner, target.owner, "Angriffsbefehl"));
    const occupied = match.units.some((unit) => unit.x === target.x && unit.y === target.y) ||
        match.buildings.some((building) => building.x === target.x && building.y === target.y);
    const spots = occupied ? [
        { x: target.x - 1, y: target.y }, { x: target.x + 1, y: target.y },
        { x: target.x, y: target.y - 1 }, { x: target.x, y: target.y + 1 },
        { x: target.x - 1, y: target.y - 1 }, { x: target.x + 1, y: target.y - 1 },
        { x: target.x - 1, y: target.y + 1 }, { x: target.x + 1, y: target.y + 1 }
    ] : [{ x: target.x, y: target.y }];
    const reserved = new Set();
    units.forEach((unit) => {
        for (const goal of spots) {
            const key = `${goal.x},${goal.y}`;
            if (reserved.has(key) || getUnitAt(goal.x, goal.y) || getBuildingAt(goal.x, goal.y)) continue;
            if (issueMoveOrder(unit, goal.x, goal.y)) { reserved.add(key); break; }
        }
    });
}

function issueGroupMoveOrders(units, x, y) {
    const candidates = [];
    for (let radius = 0; radius <= 4; radius++) {
        for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
            const tx = x + dx, ty = y + dy;
            const tile = match.tiles[ty]?.[tx];
            if (!tile || getUnitAt(tx, ty) || getBuildingAt(tx, ty)) continue;
            candidates.push({ x: tx, y: ty });
        }
        if (candidates.length >= units.length) break;
    }
    const reserved = new Set();
    const ordered = [];
    for (const unit of units) {
        const type = getUnitTypeById(unit.typeId);
        for (const goal of candidates) {
            const key = `${goal.x},${goal.y}`;
            if (reserved.has(key)) continue;
            const terrain = match.tiles[goal.y][goal.x].terrain;
            const passable = type.category === "air" || (type.category === "ship"
                ? ["water", "bridge"].includes(terrain)
                : ["land", "bridge"].includes(terrain));
            if (!passable) continue;
            if (issueMoveOrder(unit, goal.x, goal.y)) {
                reserved.add(key);
                ordered.push(unit);
                break;
            }
        }
    }
    return ordered;
}

function afterAction(boardEl, turnEl, goldEl, opponentsEl, materialsEl, gameOverEl, minimapContext, viewport, minimapCanvas, chronicleList) {
    renderUnits(boardEl);
    renderBoardHighlights(boardEl, []);
    updateStructureMarkers(boardEl);
    updateHud(turnEl, goldEl, opponentsEl, materialsEl);
    renderResourceMarkers(boardEl);
    drawMinimap(minimapContext, viewport, minimapCanvas);
    renderChronicle(chronicleList);
    const relationsPanel = boardEl.closest(".game-screen").querySelector(".relations-panel");
    if (relationsPanel && !relationsPanel.hidden) renderMoodBoard(relationsPanel.querySelector(".relations-board"));
    saveCurrentMatch();
    if (match.gameOver) showGameOver(gameOverEl);
}

function renderChronicle(list) {
    list.replaceChildren();
    const events = match.events || [];
    if (!events.length) {
        const empty = document.createElement("li");
        empty.className = "chronicle-list__empty";
        empty.textContent = "Noch gibt es keine Berichte.";
        list.appendChild(empty);
        return;
    }
    events.slice(0, 40).forEach((event) => {
        const item = document.createElement("li");
        item.className = `chronicle-entry chronicle-entry--${event.type || "info"}`;
        const turn = document.createElement("span");
        turn.className = "chronicle-entry__turn";
        turn.textContent = formatTime(Math.max(0, (event.turn - 1) * 10));
        const text = document.createElement("span");
        text.className = "chronicle-entry__text";
        text.textContent = event.text;
        item.append(turn, text);
        list.appendChild(item);
    });
}

function renderMoodBoard(board) {
    if (!board) return;
    board.replaceChildren();
    const human = match.players.find((player) => player.isHuman);
    const opponents = match.players.filter((player) => !player.isHuman);
    if (!opponents.length) {
        board.textContent = "Es gibt keine anderen Reiche auf dieser Karte.";
        return;
    }
    opponents.forEach((opponent) => {
        const nation = getNationById(opponent.nationId);
        const relation = getDiplomacyRelation(human?.id, opponent.id);
        const mood = relation?.mood ?? 50;
        const state = getMoodLabel(mood, relation?.status);
        const card = document.createElement("article");
        card.className = `relations-card relations-card--${relation?.status === "war" ? "war" : "peace"}`;

        const portrait = document.createElement("img");
        portrait.className = "relations-card__portrait";
        portrait.alt = "";
        if (nation?.image) portrait.src = nation.image;
        portrait.onerror = () => { portrait.onerror = null; portrait.src = "assets/start-background.svg"; };

        const identity = document.createElement("div");
        identity.className = "relations-card__identity";
        const name = document.createElement("strong");
        name.textContent = nation?.name || "Unbekanntes Reich";
        const leader = document.createElement("span");
        leader.textContent = nation?.leader || "";
        identity.append(name, leader);

        const attitude = document.createElement("div");
        attitude.className = "relations-card__attitude";
        const status = document.createElement("span");
        status.textContent = state;
        const score = document.createElement("span");
        score.textContent = relation?.status === "war" ? "−100" : `${mood > 0 ? "+" : ""}${mood}`;
        attitude.append(status, score);

        const track = document.createElement("div");
        track.className = "relations-card__track";
        const fill = document.createElement("span");
        fill.style.width = `${Math.max(0, Math.min(100, (mood + 100) / 2))}%`;
        track.appendChild(fill);
        card.append(portrait, identity, attitude, track);
        board.appendChild(card);
    });
}

function updateStructureMarkers(boardEl) {
    const markerLayer = boardEl.querySelector(".marker-layer");
    markerLayer.querySelectorAll(".structure-marker:not(.structure-marker--building)").forEach((marker) => {
        const capital = match.capitals.find((entry) => entry.owner === marker.dataset.owner);
        const port = match.ports.find((entry) => entry.owner === marker.dataset.owner);
        const structure = marker.dataset.kind === "capital" ? capital : port;
        marker.hidden = marker.dataset.owner !== "player" && !isVisibleToPlayer(structure?.x ?? -1, structure?.y ?? -1);
        marker.classList.toggle("structure-marker--destroyed", marker.dataset.kind === "capital" && capital?.destroyed);
        if (marker.dataset.kind === "capital" && capital) {
            const percent = Math.max(0, Math.min(100, ((capital.siegeProgress || 0) / 30_000) * 100));
            const fill = marker.querySelector(".capital-siege__fill");
            if (fill) fill.style.width = `${percent}%`;
            marker.classList.toggle("structure-marker--besieged", percent > 0);
            marker.title = percent > 0 ? `Belagerung: ${Math.round(percent)} %` : "Hauptstadt";
        }
        if (marker.dataset.kind === "port" && capital?.destroyed) marker.hidden = true;
    });
    match.buildings.forEach((building) => {
        let marker = [...markerLayer.querySelectorAll(".structure-marker--building")].find((entry) => entry.dataset.buildingId === building.id);
        if (!marker) {
            marker = buildBuildingMarker(building);
            markerLayer.appendChild(marker);
        }
        marker.classList.toggle("structure-marker--destroyed", building.destroyed);
        marker.hidden = (building.owner !== "player" && !isVisibleToPlayer(building.x, building.y)) ||
            (building.destroyed && match.buildings.some((other) => !other.destroyed && other.x === building.x && other.y === building.y));
        const type = buildingTypes.find((entry) => entry.id === building.typeId);
        marker.title = `${type?.name || "Gebäude"} · ${building.health}/${building.maxHealth} LP`;
        const fill = marker.querySelector(".building-marker__health span");
        if (fill) fill.style.width = `${Math.max(0, (building.health / building.maxHealth) * 100)}%`;
    });
}

// ============================================================
// Einheiten-Kaufmenü
// ============================================================

function buildUnitsPanelContent(unitsGrid, nationId) {
    const availableUnits = unitTypes
        .filter((unitType) => !unitType.nations || unitType.nations.includes(nationId))
        .sort((a, b) => Number(Boolean(b.nations)) - Number(Boolean(a.nations)));
    unitsGrid.innerHTML = availableUnits.map((unitType) => buildUnitCardHtml(unitType)).join("");
}

function buildUnitCardHtml(unitType) {
    const traits = [`Bewegung ${unitType.movement}`, `Sicht ${getUnitVision({ typeId: unitType.id })}`, `Leben ${unitType.health}`];
    if (unitType.category === "cavalry") traits.push("Beritten · hohe Bewegung");
    if (unitType.nations) traits.push("Nationale Eliteeinheit");
    if (unitType.canAttack) traits.push(`Schaden ${unitType.attackDamage}`, `Reichweite ${unitType.attackRange}`);
    if (unitType.canGather) traits.push("Erntet Rohstoffe auf Feldern");
    if (unitType.canBuild) traits.push("Errichtet Gebäude");
    if (unitType.transportCapacity) traits.push(`Transport ${unitType.transportCapacity}`);

    return `
        <button class="unit-card${unitType.nations ? " unit-card--elite" : ""}" type="button" data-unit-type-id="${unitType.id}">
            <span class="unit-card__symbol">${FALLBACK_SYMBOLS[unitType.id] || unitType.symbol || "?"}</span>
            <span class="unit-card__name">${unitType.name}</span>
            <ul class="unit-card__traits">
                ${traits.map((t) => `<li>${t}</li>`).join("")}
            </ul>
            <span class="unit-card__cost">${unitType.cost} Gold</span>
            <span class="unit-card__availability" data-unit-status></span>
        </button>
    `;
}

function buildBuildingsPanelContent(grid) {
    grid.innerHTML = buildingTypes.map((type) => `
        <button class="building-card" type="button" data-building-type="${type.id}">
            <span class="building-card__symbol">${type.symbol}</span>
            <span class="building-card__name">${type.name}</span>
            <span class="building-card__description">${type.description}</span>
            <span class="building-card__cost">${type.cost.gold} Gold · ${type.cost.wood} Holz · ${type.cost.stone} Stein</span>
        </button>
    `).join("");
}

function renderResearchPanel(grid) {
    const player = getPlayerById("player");
    const status = getResearchStatus("player");
    const hasAcademy = match.buildings.some((building) => building.owner === "player" && building.typeId === "academy" && !building.destroyed);
    grid.innerHTML = technologies.map((technology) => {
        const completed = status.completed.includes(technology.id);
        const active = status.active?.technologyId === technology.id;
        const blocked = completed || !!status.active || !hasAcademy || !canAffordResearch("player", technology.id);
        const progress = active ? Math.min(100, Math.round(status.active.progress / status.active.duration * 100)) : 0;
        const state = completed ? "Abgeschlossen" : active ? `Läuft · ${progress} %` : !hasAcademy ? "Akademie erforderlich" : status.active ? "Wartet" : "Forschung beginnen";
        return `<button class="research-card${completed ? " research-card--complete" : active ? " research-card--active" : ""}" type="button" data-research-id="${technology.id}" ${blocked ? "disabled" : ""}>
            <span class="research-card__symbol">${technology.symbol}</span><span class="research-card__name">${technology.name}</span>
            <span class="research-card__description">${technology.description}</span>
            <span class="research-card__cost">${technology.cost.gold} Gold · ${technology.cost.wood} Holz · ${technology.cost.stone} Stein</span>
            <span class="research-card__status">${state}</span><span class="research-card__progress"><i style="width:${progress}%"></i></span>
        </button>`;
    }).join("");
    grid.dataset.playerGold = String(player?.resources.gold || 0);
}

function renderAcademyPanel(grid) {
    const player = getPlayerById("player");
    const academies = match.buildings.filter((building) => building.owner === "player" && building.typeId === "academy" && !building.destroyed);
    if (!academies.length) {
        grid.innerHTML = '<p class="academy-panel__empty">Errichte zuerst eine Akademie über „Bauen“.</p>';
        return;
    }
    grid.innerHTML = academies.map((academy, index) => {
        const training = academy.training;
        const course = training && academyCourses[training.unitTypeId];
        const progress = course ? Math.min(100, Math.round(training.progress / training.duration * 100)) : 0;
        const choices = Object.entries(academyCourses).map(([unitTypeId, details]) => `<button class="academy-course" type="button" data-academy-id="${academy.id}" data-academy-train="${unitTypeId}" ${training || player.resources.gold < details.cost ? "disabled" : ""}>
            <span class="academy-course__icon">${unitTypeId === "worker" ? "✚" : "⚔"}</span>
            <span class="academy-course__name">${details.name} ausbilden</span>
            <span class="academy-course__detail">${details.cost} Gold · ${details.duration} Sekunden</span>
            <span class="academy-course__bonus">${unitTypeId === "worker" ? "+50 % Rohstoffertrag · automatische Feldsuche" : "+2 Schaden · zusätzliche Lebenspunkte"}</span>
        </button>`).join("");
        return `<article class="academy-course-group"><h3>Akademie ${index + 1}</h3>${training
            ? `<div class="academy-training-status"><strong>${course?.name || "Einheit"} wird ausgebildet · ${progress} %</strong><span class="academy-training-status__bar"><i style="width:${progress}%"></i></span></div>`
            : choices}</article>`;
    }).join("");
}

function refreshBuildingAffordability(grid) {
    const player = getPlayerById("player");
    if (!player) return;
    grid.querySelectorAll("[data-building-type]").forEach((card) => {
        const type = buildingTypes.find((entry) => entry.id === card.dataset.buildingType);
        const canPay = Object.entries(type.cost).every(([resource, amount]) => (player.resources[resource] || 0) >= amount);
        const hasBuilder = match.units.some((unit) => unit.owner === "player" && unit.typeId === "worker" && (match.mode === "realtime" || !unit.hasActed));
        const hasSite = getBuildableTiles("player", type.id).length > 0;
        card.disabled = !canPay || !hasBuilder || !hasSite;
        card.title = !hasBuilder ? "Du brauchst einen freien Arbeiter." : !hasSite ? "Kein freier Bauplatz oder Materialien fehlen." : "Gebäude wählen und anschließend den Bauplatz anklicken.";
    });
}

function refreshUnitsPanelAffordability(unitsGrid) {
    const gold = getPlayerById("player").resources.gold;
    unitsGrid.querySelectorAll(".unit-card").forEach((card) => {
        const unitType = getUnitTypeById(card.dataset.unitTypeId);
        if (!unitType) return;
        const missingGold = Math.max(0, unitType.cost - gold);
        const available = missingGold === 0;
        card.classList.toggle("unit-card--disabled", !available);
        card.disabled = !available;
        card.title = available ? "Einheit rekrutieren" : `Noch ${missingGold} Gold erforderlich`;
        const status = card.querySelector("[data-unit-status]");
        if (status) status.textContent = available ? "Rekrutieren" : `Fehlen ${missingGold} Gold`;
    });
}

// ============================================================
// HUD / Meldungen / Spielende
// ============================================================

function updateHud(turnEl, goldEl, opponentsEl, materialsEl) {
    const seconds = Math.floor(match.elapsedSeconds || 0);
    turnEl.textContent = `Spielzeit ${formatTime(seconds)}`;
    const goldWorkers = match.units.filter((unit) => unit.owner === "player" && getUnitTypeById(unit.typeId)?.canGather &&
        match.tiles[unit.y]?.[unit.x]?.resource === "gold" && match.tiles[unit.y][unit.x].resourceAmount > 0);
    const goldIncome = (getPlayerById("player").goldPerTurn || 25) + getResearchBonus("player", "goldPerTurn") + goldWorkers.reduce((total, worker) => total + (worker.academyTrained ? 12 : GOLD_PER_DEPOSIT_HARVEST), 0);
    goldEl.textContent = `Gold: ${getPlayerById("player").resources.gold} · +${goldIncome}/10 s`;
    goldEl.title = `Grundeinkommen plus Forschung${goldWorkers.length ? ` und ${goldWorkers.length} Arbeiter auf Goldadern` : ""}. Ausgebildete Arbeiter sammeln 12 Gold, andere 8 je Erntetakt.`;
    const remaining = match.capitals.filter((capital) => capital.owner !== "player" && !capital.destroyed).length;
    opponentsEl.textContent = remaining ? `Ziel: ${remaining} ${remaining === 1 ? "Hauptstadt" : "Hauptstädte"}` : "Alle Hauptstädte erobert";
    const resources = getPlayerById("player").resources;
    const capacity = getResourceCapacity("player");
    materialsEl.textContent = `Getreide ${resources.wheat}/${capacity} · Holz ${resources.wood}/${capacity} · Stein ${resources.stone}/${capacity}`;
    materialsEl.title = `Lagerraum pro Rohstoff: ${capacity}. Lagerhäuser erweitern den Vorrat.`;
}

function formatTime(seconds) {
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

const TRADE_RESOURCES = [
    ["gold", "Gold"],
    ["wheat", "Getreide"],
    ["wood", "Holz"],
    ["stone", "Stein"]
];

function populateResourceSelect(select, selectedValue) {
    TRADE_RESOURCES.forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        option.selected = value === selectedValue;
        select.appendChild(option);
    });
}

function refreshTradeOpponents(select) {
    const previous = select.value;
    select.replaceChildren();
    const available = match.players.filter((player) => {
        if (player.isHuman) return false;
        const capital = match.capitals.find((entry) => entry.owner === player.id);
        return capital && !capital.destroyed;
    });
    available.forEach((player) => {
        const nation = getNationById(player.nationId);
        const option = document.createElement("option");
        option.value = player.id;
        option.textContent = nation ? `${nation.name} · ${nation.leader}` : player.id;
        select.appendChild(option);
    });
    if (available.some((player) => player.id === previous)) select.value = previous;
    select.disabled = available.length === 0;
}

function resetTradeResponse(opponentSelect, portrait, portraitPanel, caption, status) {
    portraitPanel.classList.remove("trade-panel__portrait--approved", "trade-panel__portrait--denied");
    const opponent = getPlayerById(opponentSelect.value);
    const nation = opponent && getNationById(opponent.nationId);
    if (!nation) {
        portrait.removeAttribute("src");
        caption.textContent = "Kein Reich verfügbar";
        status.textContent = "Es gibt derzeit kein Reich, mit dem du handeln kannst.";
        return;
    }
    setTradePortrait(portrait, nation.image, nation.image);
    caption.textContent = `Gesandter aus ${nation.name}`;
    status.textContent = "Wähle dein Angebot und sende es an den Gesandten.";
}

function setTradePortrait(image, source, fallback) {
    image.onerror = () => {
        image.onerror = null;
        image.src = fallback;
    };
    image.src = source;
}

function getTradeArtId(nationId) {
    return nationId === "macedon" ? "macedona" : nationId;
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
    let economyElapsed = 0;
    let botElapsed = 0;
    let combatElapsed = 0;
    let visionElapsed = 0;
    let hudElapsed = 0;
    let saveElapsed = 0;
    let botErrorReported = false;
    const step = (time) => {
        const dt = Math.min(100, time - lastFrameTime);
        lastFrameTime = time;
        if (!match.gameOver) match.elapsedSeconds = (match.elapsedSeconds || 0) + dt / 1000;
        if (!match.gameOver && advanceResearch(dt)) saveCurrentMatch();
        if (!match.gameOver) advanceWorkerResourceOrders(time);
        if (!match.gameOver && advanceAcademyTraining(dt)) {
            renderUnits(boardEl);
            updateStructureMarkers(boardEl);
            saveCurrentMatch();
        }
        advanceMoveOrders(time);
        syncUnitPositions(boardEl);
        visionElapsed += dt;
        if (visionElapsed >= 240) {
            visionElapsed = 0;
            if (updateVision("player")) {
                renderUnits(boardEl);
                renderResourceMarkers(boardEl);
                updateStructureMarkers(boardEl);
                drawFogOfWar(boardEl.querySelector(".fog-layer"));
                const viewport = boardEl.closest(".game-screen").querySelector(".map-viewport");
                const minimap = boardEl.closest(".game-screen").querySelector(".map-minimap canvas");
                drawMinimap(minimap.getContext("2d"), viewport, minimap);
            }
        }
        combatElapsed += dt;
        if (combatElapsed >= 220) {
            const combatStep = combatElapsed;
            combatElapsed = 0;
            processRealtimeCombat(boardEl);
            advanceCapitalSieges(combatStep);
            updateStructureMarkers(boardEl);
        }
        if (match.gameOver) {
            saveCurrentMatch();
            showGameOver(boardEl.closest(".game-screen").querySelector(".game-over-screen"));
            return;
        }
        botElapsed += dt;
        if (botElapsed >= 2300 && !match.gameOver) {
            botElapsed = 0;
            match.players.filter((player) => !player.isHuman).forEach((player) => resetActionsForNewTurn(player.id));
            try {
                runBotTurn();
                botErrorReported = false;
            } catch (error) {
                console.error("Der Gegnerzug ist fehlgeschlagen; die Partie läuft weiter.", error);
                if (!botErrorReported) {
                    showMessage(boardEl.closest(".game-screen").querySelector(".game-message"), "Ein Gegnerzug ist fehlgeschlagen. Deine Partie läuft weiter.");
                    botErrorReported = true;
                }
            }
            const moodPanel = boardEl.closest(".game-screen").querySelector(".relations-panel");
            if (!moodPanel.hidden) renderMoodBoard(moodPanel.querySelector(".relations-board"));
            if (match.gameOver) {
                saveCurrentMatch();
                showGameOver(boardEl.closest(".game-screen").querySelector(".game-over-screen"));
                return;
            }
        }
        economyElapsed += dt;
        if (economyElapsed >= 10000 && !match.gameOver) {
            economyElapsed -= 10000;
            advanceRealtimeEconomy();
            updateStructureMarkers(boardEl);
            renderResourceMarkers(boardEl);
            refreshUnitsPanelAffordability(boardEl.closest(".game-screen")?.querySelector(".units-panel__grid"));
            refreshTradeOpponents(boardEl.closest(".game-screen")?.querySelector('[data-trade="opponent"]'));
            renderChronicle(boardEl.closest(".game-screen")?.querySelector(".chronicle-list"));
            updateHud(
                boardEl.closest(".game-screen")?.querySelector('[data-stat="turn"]'),
                boardEl.closest(".game-screen")?.querySelector('[data-stat="gold"]'),
                boardEl.closest(".game-screen")?.querySelector('[data-stat="opponents"]'),
                boardEl.closest(".game-screen")?.querySelector('[data-stat="materials"]')
            );
            saveCurrentMatch();
        }
        hudElapsed += dt;
        if (hudElapsed >= 500) {
            hudElapsed = 0;
            const screen = boardEl.closest(".game-screen");
            updateHud(screen.querySelector('[data-stat="turn"]'), screen.querySelector('[data-stat="gold"]'), screen.querySelector('[data-stat="opponents"]'), screen.querySelector('[data-stat="materials"]'));
            const researchPanel = screen.querySelector(".research-panel");
            if (!researchPanel.hidden) renderResearchPanel(researchPanel.querySelector(".research-panel__grid"));
            const academyPanel = screen.querySelector(".academy-panel");
            if (!academyPanel.hidden) renderAcademyPanel(academyPanel.querySelector(".academy-panel__grid"));
            const mapViewport = screen.querySelector(".map-viewport");
            const mapCanvas = screen.querySelector(".map-minimap canvas");
            drawMinimap(mapCanvas.getContext("2d"), mapViewport, mapCanvas);
        }
        saveElapsed += dt;
        if (saveElapsed >= 5000) {
            saveElapsed = 0;
            saveCurrentMatch();
        }
        match.units.forEach((unit) => tickAnimation(unit, dt));
        updateUnitSprites(boardEl);
        animationLoopHandle = window.requestAnimationFrame(step);
    };
    animationLoopHandle = window.requestAnimationFrame(step);
}

function syncUnitPositions(boardEl) {
    boardEl.querySelectorAll(".unit[data-unit-id]").forEach((element) => {
        const unit = match.units.find((entry) => entry.id === element.dataset.unitId);
        if (!unit) { element.remove(); return; }
        element.style.left = `${unit.x * TILE_SIZE}px`;
        element.style.top = `${unit.y * TILE_SIZE}px`;
        const type = getUnitTypeById(unit.typeId);
        const health = element.querySelector(".unit__health span");
        if (health && type) health.style.width = `${Math.max(0, Math.min(100, unit.health / (unit.maxHealth || type.health) * 100))}%`;
        element.classList.toggle("unit--selected", (match.selectedUnitIds || []).includes(unit.id));
    });
    const visibleCount = match.units.filter((unit) => unit.owner === "player" || isVisibleToPlayer(unit.x, unit.y)).length;
    if (boardEl.querySelectorAll(".unit[data-unit-id]").length !== visibleCount) renderUnits(boardEl);
}

function processRealtimeCombat(boardEl) {
    const towers = match.buildings.filter((building) => !building.destroyed && building.typeId === "watchtower");
    for (const tower of towers) {
        const type = buildingTypes.find((entry) => entry.id === tower.typeId);
        const target = match.units.filter((unit) => areAtWar(tower.owner, unit.owner) &&
            Math.max(Math.abs(unit.x - tower.x), Math.abs(unit.y - tower.y)) <= (type?.attackRange || 0))
            .sort((a, b) => Math.max(Math.abs(a.x - tower.x), Math.abs(a.y - tower.y)) - Math.max(Math.abs(b.x - tower.x), Math.abs(b.y - tower.y)))[0];
        if (target) {
            const shot = attackWithTower(tower, target);
            if (shot.ok) showTowerShot(boardEl, tower, target);
        }
    }
    for (const attacker of match.units) {
        if (!getUnitTypeById(attacker.typeId)?.canAttack) continue;
        const enemy = match.units.find((unit) => areAtWar(attacker.owner, unit.owner) && canAttack(attacker, unit));
        if (enemy) {
            attacker.moveOrder = null;
            attack(attacker, enemy);
            continue;
        }
        const building = match.buildings.find((entry) => areAtWar(attacker.owner, entry.owner) && canAttackBuilding(attacker, entry));
        if (building) {
            attacker.moveOrder = null;
            attackBuilding(attacker, building);
        }
    }
}

function showTowerShot(boardEl, tower, target) {
    const shot = document.createElement("span");
    shot.className = "tower-shot";
    const startX = (tower.x + 0.5) * TILE_SIZE;
    const startY = (tower.y + 0.5) * TILE_SIZE;
    const endX = (target.x + 0.5) * TILE_SIZE;
    const endY = (target.y + 0.5) * TILE_SIZE;
    const dx = endX - startX;
    const dy = endY - startY;
    shot.style.left = `${startX}px`;
    shot.style.top = `${startY}px`;
    shot.style.width = `${Math.hypot(dx, dy)}px`;
    shot.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    boardEl.appendChild(shot);
    window.setTimeout(() => shot.remove(), 400);
}

function stopAnimationLoop() {
    if (animationLoopHandle) {
        window.cancelAnimationFrame(animationLoopHandle);
        animationLoopHandle = null;
    }
}

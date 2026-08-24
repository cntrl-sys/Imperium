// js/game.js
//
// Zentraler Spielzustand und Screen-Manager.
// Screens kennen nur den State und rufen changeScreen() auf, um zu wechseln.
// Der State wird bewusst simpel gehalten und ist die einzige Quelle der
// Wahrheit für den aktuellen Fortschritt des Spielers.

export const gameState = {
    currentScreen: "start",
    selectedNationId: null,
    selectedMapId: null
};

const screenRegistry = {};
let rootElement = null;

/**
 * Registriert einen Screen unter einem eindeutigen Namen.
 * @param {string} name
 * @param {(root: HTMLElement, state: typeof gameState) => void} renderFn
 */
export function registerScreen(name, renderFn) {
    screenRegistry[name] = renderFn;
}

/**
 * Initialisiert den Screen-Manager mit dem Root-Element der App.
 */
export function initGame(root) {
    rootElement = root;
    changeScreen(gameState.currentScreen);
}

/**
 * Wechselt den aktuell sichtbaren Screen mit sanftem Fade-Übergang
 * und rendert ihn neu basierend auf dem aktuellen State.
 */
export function changeScreen(screenName) {
    const renderFn = screenRegistry[screenName];
    if (!renderFn) {
        console.error(`Unbekannter Screen: "${screenName}"`);
        return;
    }

    gameState.currentScreen = screenName;

    if (!rootElement) return;

    rootElement.classList.add("screen-fade-out");

    window.setTimeout(() => {
        rootElement.innerHTML = "";
        renderFn(rootElement, gameState);
        rootElement.classList.remove("screen-fade-out");
        rootElement.classList.add("screen-fade-in");
        window.setTimeout(() => rootElement.classList.remove("screen-fade-in"), 400);
    }, 200);
}

export function selectNation(nationId) {
    gameState.selectedNationId = nationId;
}

export function selectMap(mapId) {
    gameState.selectedMapId = mapId;
}

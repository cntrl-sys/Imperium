// js/render/spriteRenderer.js
//
// Verbindet Sprite-Konfiguration (spriteConfig.js), das Laden der Bilder
// (spriteLoader.js) und den Animationszustand einer Einheit
// (spriteAnimation.js) zu einem fertigen Render-Ergebnis.
//
// Ablauf: Nation -> Einheit -> Animation -> passendes Sheet für GENAU
// diese Animation -> Richtung/Frame -> Ausschnitt (+ ggf. Spiegelung).
//
// Wenn das passende Sprite Sheet (noch) nicht existiert, liefert diese
// Funktion "ready: false" zurück — der Aufrufer (gameScreen.js) zeigt dann
// die vorhandene Fallback-Darstellung (farbiger Marker mit Symbol).

import { getSpriteSheetPath, getFrameRect, SPRITE_CONFIG, SHEET_WIDTH, SHEET_HEIGHT } from "./spriteConfig.js";
import { loadSpriteSheet, getCachedSpriteSheet } from "./spriteLoader.js";
import { ensureAnimationState } from "./spriteAnimation.js";
import { getNationById } from "../data/nations.js";

const tintedSheets = new Map();

function tintSheet(image, path, nationId) {
    const key = `${path}|${nationId}`;
    if (tintedSheets.has(key)) return tintedSheets.get(key);
    const canvas = document.createElement("canvas");
    canvas.width = SHEET_WIDTH;
    canvas.height = SHEET_HEIGHT;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, SHEET_WIDTH, SHEET_HEIGHT);
    const pixels = ctx.getImageData(0, 0, SHEET_WIDTH, SHEET_HEIGHT);
    const color = getNationColor(nationId);
    const base = color.match(/[\da-f]{2}/gi).map((v) => parseInt(v, 16));
    const shades = [
        [Math.round(base[0] * 0.58), Math.round(base[1] * 0.58), Math.round(base[2] * 0.58)],
        base,
        base.map((v) => Math.round(v + (255 - v) * 0.38))
    ];
    const markers = [[40, 0, 40], [255, 0, 255], [255, 110, 255]];
    for (let i = 0; i < pixels.data.length; i += 4) {
        for (let shade = 0; shade < markers.length; shade++) {
            const [r, g, b] = markers[shade];
            const isNationCloth = shade === 1 && pixels.data[i] > 170 && pixels.data[i + 2] > 170 && pixels.data[i + 1] < 55;
            const isClothHighlight = shade === 2 && pixels.data[i] > 170 && pixels.data[i + 2] > 170 && pixels.data[i + 1] >= 55 && pixels.data[i + 1] < 160;
            if ((pixels.data[i] === r && pixels.data[i + 1] === g && pixels.data[i + 2] === b) || isNationCloth || isClothHighlight) {
                const actualShade = isClothHighlight ? 2 : (isNationCloth ? 1 : shade);
                pixels.data[i] = shades[actualShade][0];
                pixels.data[i + 1] = shades[actualShade][1];
                pixels.data[i + 2] = shades[actualShade][2];
                break;
            }
        }
    }
    ctx.putImageData(pixels, 0, 0);
    const tinted = canvas.toDataURL("image/png");
    tintedSheets.set(key, tinted);
    return tinted;
}

/**
 * Liefert alles, was gebraucht wird, um eine Einheit an ihrer aktuellen
 * Animation/Richtung/Frame-Position zu rendern.
 *
 * @param {object} unit - Einheit aus dem Match-State
 * @param {string} nationId - Nation, deren Sprite-Stil verwendet werden soll
 */
export function getUnitRenderInfo(unit, nationId) {
    const anim = ensureAnimationState(unit);
    // WICHTIG: Der Pfad hängt jetzt zusätzlich von der Animation ab, da
    // jede Animation ihr eigenes Sheet besitzt.
    const path = getSpriteSheetPath(nationId, unit.typeId, anim.state);

    // Laden anstoßen (asynchron, gecacht) — beeinflusst diesen Aufruf nicht,
    // stellt aber sicher, dass das Bild verfügbar ist, sobald es existiert.
    loadSpriteSheet(path);
    const image = getCachedSpriteSheet(path);

    if (!image) {
        // Entweder noch nicht geladen oder nicht vorhanden -> Fallback.
        return { ready: false, path };
    }

    const rect = getFrameRect(anim.state, anim.direction, anim.frame);
    const scale = SPRITE_CONFIG.displayScale;

    return {
        ready: true,
        path,
        image,
        mirrored: rect.mirrored,
        scale,
        sourceX: rect.sx,
        sourceY: rect.sy,
        sourceWidth: rect.width,
        sourceHeight: rect.height,
        displayWidth: rect.width * scale,
        displayHeight: rect.height * scale,
        sheetDisplayWidth: SHEET_WIDTH * scale,
        sheetDisplayHeight: SHEET_HEIGHT * scale
    };
}

/**
 * Wendet das Ergebnis von getUnitRenderInfo() als CSS-Hintergrund auf ein
 * DOM-Element an (Sprite-Sheet-Technik über background-position).
 * Gibt zurück, ob ein echtes Sprite verwendet wurde (sonst muss der
 * Aufrufer den Fallback darstellen).
 */
export function applySpriteToElement(el, unit, nationId) {
    const info = getUnitRenderInfo(unit, nationId);

    if (!info.ready) {
        el.style.backgroundImage = "none";
        el.style.transform = "";
        return false;
    }

    const renderKey = `${info.path}|${nationId}`;
    if (el.dataset.spriteKey !== renderKey) {
        el.style.width = `${info.displayWidth}px`;
        el.style.height = `${info.displayHeight}px`;
        el.style.backgroundImage = `url("${tintSheet(info.image, info.path, nationId)}")`;
        // Ganzes Sheet wird auf die Zielgröße herunterskaliert dargestellt,
        // die Position wird im selben Maßstab verschoben.
        el.style.backgroundSize = `${info.sheetDisplayWidth}px ${info.sheetDisplayHeight}px`;
        el.style.backgroundRepeat = "no-repeat";
        el.dataset.spriteKey = renderKey;
    }
    el.style.backgroundPosition = `-${info.sourceX * info.scale}px -${info.sourceY * info.scale}px`;
    // Gespiegelte Richtungen (NW/W/SW) nutzen dieselbe Bilddatei wie ihr
    // "rechtes" Gegenstück, werden aber horizontal gespiegelt dargestellt.
    el.style.transform = info.mirrored ? "scaleX(-1)" : "";
    return true;
}

/**
 * Kleine Komfortfunktion: liefert den Nation-Farbcode für Fallback-Marker.
 */
export function getNationColor(nationId) {
    const nation = getNationById(nationId);
    return nation ? nation.color : "#b8935a";
}

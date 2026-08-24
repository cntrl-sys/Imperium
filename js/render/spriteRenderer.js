// js/render/spriteRenderer.js
//
// Verbindet Sprite-Konfiguration (spriteConfig.js), das Laden der Bilder
// (spriteLoader.js) und den Animationszustand einer Einheit
// (spriteAnimation.js) zu einem fertigen Render-Ergebnis.
//
// Ablauf: Nation -> Einheit -> Sprite Sheet -> Animation -> Richtung -> Frame
//
// Wenn das passende Sprite Sheet (noch) nicht existiert, liefert diese
// Funktion "sprite: null" zurück — der Aufrufer (gameScreen.js) zeigt dann
// die vorhandene Fallback-Darstellung (farbiger Marker mit Symbol).

import { getSpriteSheetPath, getFrameRect, SPRITE_CONFIG } from "./spriteConfig.js";
import { loadSpriteSheet, getCachedSpriteSheet } from "./spriteLoader.js";
import { ensureAnimationState } from "./spriteAnimation.js";
import { getNationById } from "../data/nations.js";

/**
 * Liefert alles, was gebraucht wird, um eine Einheit an ihrer aktuellen
 * Animation/Richtung/Frame-Position zu rendern.
 *
 * @param {object} unit - Einheit aus dem Match-State
 * @param {string} nationId - Nation, deren Sprite-Stil verwendet werden soll
 * @returns {{ready:boolean, path:string, frameWidth:number, frameHeight:number, sx:number, sy:number}}
 */
export function getUnitRenderInfo(unit, nationId) {
    const anim = ensureAnimationState(unit);
    const path = getSpriteSheetPath(nationId, unit.typeId);

    // Laden anstoßen (asynchron, gecacht) — beeinflusst diesen Aufruf nicht,
    // stellt aber sicher, dass das Bild verfügbar ist, sobald es existiert.
    loadSpriteSheet(path);
    const image = getCachedSpriteSheet(path);

    if (!image) {
        // Entweder noch nicht geladen oder nicht vorhanden -> Fallback.
        return { ready: false, path };
    }

    const rect = getFrameRect(anim.state, anim.direction, anim.frame);
    return {
        ready: true,
        path,
        image,
        frameWidth: SPRITE_CONFIG.frameWidth,
        frameHeight: SPRITE_CONFIG.frameHeight,
        sx: rect.sx,
        sy: rect.sy
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
        return false;
    }

    el.style.width = `${info.frameWidth}px`;
    el.style.height = `${info.frameHeight}px`;
    el.style.backgroundImage = `url("${info.path}")`;
    el.style.backgroundPosition = `-${info.sx}px -${info.sy}px`;
    el.style.backgroundRepeat = "no-repeat";
    return true;
}

/**
 * Kleine Komfortfunktion: liefert den Nation-Farbcode für Fallback-Marker.
 */
export function getNationColor(nationId) {
    const nation = getNationById(nationId);
    return nation ? nation.color : "#b8935a";
}

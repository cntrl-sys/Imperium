// js/render/spriteConfig.js
//
// Zentrale, technische Spezifikation des Sprite-Sheet-Formats, das ALLE
// Einheiten (jede Nation, jeder Einheitentyp) einheitlich verwenden.
//
// Layout eines Sprite Sheets (32 Reihen × 4 Spalten = 128 Frames):
//
//   IDLE   N, NE, E, SE, S, SW, W, NW   (Reihen 0–7)
//   WALK   N, NE, E, SE, S, SW, W, NW   (Reihen 8–15)
//   ATTACK N, NE, E, SE, S, SW, W, NW   (Reihen 16–23)
//   DAMAGE N, NE, E, SE, S, SW, W, NW   (Reihen 24–31)
//
// Jede Reihe hat 4 Frames derselben Größe, transparenter Hintergrund,
// der Charakter ragt nie in ein Nachbar-Frame hinein.
//
// WICHTIG: Die tatsächlichen PNG-Dateien existieren evtl. noch nicht.
// Diese Konfiguration beschreibt nur das Format, mit dem sie später
// erzeugt werden. Nichts hier setzt voraus, dass eine bestimmte Datei
// bereits vorhanden ist.

// Reihenfolge der Richtungen innerhalb jedes Animationsblocks.
export const SPRITE_DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

// Reihenfolge der Animationsblöcke im Sprite Sheet (je 8 Reihen = 8 Richtungen).
export const SPRITE_ANIMATIONS = ["idle", "walk", "attack", "damage"];

export const SPRITE_CONFIG = {
    // Vorläufige Standardgröße eines einzelnen Frames. Wird angepasst,
    // sobald die tatsächlichen Sprite Sheets vorliegen — zentral an
    // dieser einen Stelle, nicht verstreut im Code.
    frameWidth: 64,
    frameHeight: 64,

    columns: 4,
    rowsPerAnimation: SPRITE_DIRECTIONS.length, // 8
    totalRows: SPRITE_ANIMATIONS.length * SPRITE_DIRECTIONS.length, // 32

    // Wie viele Frames jede Animation besitzt, bevor sie wieder von vorne
    // beginnt (idle/walk) bzw. einmalig durchläuft und zu idle zurückkehrt
    // (attack/damage).
    frameCounts: {
        idle: 4,
        walk: 4,
        attack: 4,
        damage: 4
    },

    // Wie schnell (ms pro Frame) eine Animation abgespielt wird.
    frameDurations: {
        idle: 450,
        walk: 180,
        attack: 120,
        damage: 150
    },

    // Animationen, die einmal durchlaufen und danach automatisch zu
    // "idle" zurückkehren, statt in einer Schleife zu laufen.
    oneShotAnimations: ["attack", "damage"]
};

/**
 * Liefert den Zeilen-Index (0-basiert) für eine gegebene Kombination aus
 * Animation und Richtung innerhalb des Sprite Sheets.
 */
export function getSpriteRowIndex(animationState, direction) {
    const animIndex = SPRITE_ANIMATIONS.indexOf(animationState);
    const dirIndex = SPRITE_DIRECTIONS.indexOf(direction);
    const safeAnim = animIndex === -1 ? 0 : animIndex;
    const safeDir = dirIndex === -1 ? 0 : dirIndex;
    return safeAnim * SPRITE_DIRECTIONS.length + safeDir;
}

/**
 * Berechnet den Pixel-Ausschnitt (sx, sy, width, height) eines einzelnen
 * Frames innerhalb des Sprite Sheets.
 */
export function getFrameRect(animationState, direction, frameIndex) {
    const row = getSpriteRowIndex(animationState, direction);
    const frameCount = SPRITE_CONFIG.frameCounts[animationState] || SPRITE_CONFIG.columns;
    const col = ((frameIndex % frameCount) + frameCount) % frameCount;

    return {
        sx: col * SPRITE_CONFIG.frameWidth,
        sy: row * SPRITE_CONFIG.frameHeight,
        width: SPRITE_CONFIG.frameWidth,
        height: SPRITE_CONFIG.frameHeight
    };
}

/**
 * Baut den erwarteten Pfad zum Sprite Sheet einer Nation+Einheit-Kombination.
 * Beispiel: nationId="rome", unitTypeId="soldier" -> "assets/units/rome/soldier.png"
 * Die Datei muss nicht existieren — das Laden wird an anderer Stelle
 * (spriteLoader.js) mit Fallback abgesichert.
 */
export function getSpriteSheetPath(nationId, unitTypeId) {
    const fileName = SPRITE_FILE_NAMES[unitTypeId] || `${unitTypeId}.png`;
    return `assets/units/${nationId}/${fileName}`;
}

// Zuordnung Einheiten-ID -> Dateiname, für den Fall, dass sich Schreibweisen
// unterscheiden (z.B. camelCase-ID vs. snake_case-Dateiname).
const SPRITE_FILE_NAMES = {
    soldier: "soldier.png",
    archer: "archer.png",
    warship: "warship.png",
    merchantShip: "merchant_ship.png"
};

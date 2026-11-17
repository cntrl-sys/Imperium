// js/render/spriteConfig.js
//
// Zentrale, technische Spezifikation des Sprite-Sheet-Formats.
//
// Ein Sprite-Sheet pro Einheit und Animation. Alle Nationen teilen sich
// dieselben Figuren; ihre Gewandfarben werden im Renderer eingefärbt.
//
// Zusätzlich wird nur noch die "rechte" Hälfte der 8 Blickrichtungen
// tatsächlich als Bild erzeugt (N, NE, E, SE, S). Die gespiegelten
// Richtungen (NW, W, SW) werden zur Laufzeit per CSS transform: scaleX(-1)
// aus der jeweils passenden gezeichneten Richtung erzeugt. Das halbiert
// nicht ganz, aber deutlich weniger Richtungs- und Animationsframes müssen
// pro Einheit gezeichnet werden.
//
// Datei-Layout pro Einheit (Beispiel Soldat):
//   assets/units/shared/soldier_idle.svg
//   assets/units/shared/soldier_walk.svg
//   assets/units/shared/soldier_attack.svg
//   assets/units/shared/soldier_damage.svg
//
// Jedes SVG ist ein festes Raster:
//   - Sheet-Größe: 1024 x 1536 px
//   - 5 Zeilen (Reihen) = 5 gezeichnete Blickrichtungen, von oben nach
//     unten: N, NE, E, SE, S
//   - Spaltenzahl = Anzahl Frames dieser Animation (siehe FRAME_COUNTS)
//   - Jede Zelle exakt gleich groß, transparenter Hintergrund, Figur
//     bleibt vollständig innerhalb ihrer Zelle (inkl. Waffen/Schilde).

// Blickrichtungen, die tatsächlich als Bild existieren (= Zeilen im Sheet,
// oben nach unten in dieser Reihenfolge).
export const CANONICAL_DIRECTIONS = ["N", "NE", "E", "SE", "S"];

// Alle 8 Blickrichtungen, die das Spiel (movement.js/tiles.js) kennt,
// gemappt auf: welche gezeichnete Richtung wird verwendet, und muss sie
// horizontal gespiegelt werden?
const DIRECTION_MAP = {
    N: { canonical: "N", mirrored: false },
    NE: { canonical: "NE", mirrored: false },
    E: { canonical: "E", mirrored: false },
    SE: { canonical: "SE", mirrored: false },
    S: { canonical: "S", mirrored: false },
    SW: { canonical: "SE", mirrored: true },
    W: { canonical: "E", mirrored: true },
    NW: { canonical: "NE", mirrored: true }
};

export const SPRITE_ANIMATIONS = ["idle", "walk", "attack", "damage"];

// Feste Canvas-Größe JEDES Animations-Sheets (unabhängig von Spaltenzahl).
export const SHEET_WIDTH = 1024;
export const SHEET_HEIGHT = 1536;

export const SPRITE_CONFIG = {
    // Wie viele Frames (= Spalten) jede Animation besitzt.
    frameCounts: {
        idle: 4,
        walk: 6,
        attack: 5,
        damage: 3
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
    oneShotAnimations: ["attack", "damage"],

    // Faktor, um von der (großen, hochauflösenden) Quellzelle auf die
    // tatsächliche Bildschirmgröße der Einheit herunterzuskalieren.
    // Zentral hier anpassen, um alle Einheiten gleichzeitig größer/
    // kleiner darzustellen.
    displayScale: 0.31
};

/**
 * Berechnet den Pixel-Ausschnitt (sx, sy, width, height) eines einzelnen
 * Frames innerhalb des (animationsspezifischen) Sprite Sheets, plus ob
 * die Richtung gespiegelt dargestellt werden muss.
 */
export function getFrameRect(animationState, direction, frameIndex) {
    const dirInfo = DIRECTION_MAP[direction] || DIRECTION_MAP.S;
    const rowIndex = CANONICAL_DIRECTIONS.indexOf(dirInfo.canonical);
    const safeRow = rowIndex === -1 ? 0 : rowIndex;

    const columns = SPRITE_CONFIG.frameCounts[animationState] || 1;
    const col = ((frameIndex % columns) + columns) % columns;

    const frameWidth = SHEET_WIDTH / columns;
    const frameHeight = SHEET_HEIGHT / CANONICAL_DIRECTIONS.length;

    return {
        sx: col * frameWidth,
        sy: safeRow * frameHeight,
        width: frameWidth,
        height: frameHeight,
        mirrored: dirInfo.mirrored
    };
}

/**
 * Baut den gemeinsamen Pfad zum Sprite-Sheet einer Einheit+Animation
 * Kombination.
 * Beispiel: nationId="rome", unitTypeId="soldier", animationState="walk"
 *   -> "assets/units/shared/soldier_walk.svg"
 * Die Datei muss nicht existieren — das Laden wird an anderer Stelle
 * (spriteLoader.js) mit Fallback abgesichert.
 */
export function getSpriteSheetPath(nationId, unitTypeId, animationState) {
    const base = SPRITE_FILE_BASENAMES[unitTypeId] || unitTypeId;
    return `assets/units/shared/${base}_${animationState}.svg`;
}

// Zuordnung Einheiten-ID -> Datei-Basisname, für den Fall, dass sich
// Schreibweisen unterscheiden (z.B. camelCase-ID vs. snake_case-Dateiname).
const SPRITE_FILE_BASENAMES = {
    soldier: "soldier",
    archer: "archer",
    warship: "warship",
    merchantShip: "merchant_ship",
    legionary: "soldier",
    "egyptian-chariot": "hunter",
    hoplite: "soldier",
    "desert-rider": "hunter",
    longbowman: "archer",
    "war-elephant": "minotaur",
    "companion-cavalry": "soldier",
    cuirassier: "soldier",
    "horse-archer": "archer",
    cossack: "hunter",
    samurai: "hunter",
    "persian-immortal": "soldier",
    spartan: "soldier",
    "numidian-rider": "hunter",
    "palmyrene-cat": "minotaur",
    "carian-crossbow": "archer"
};

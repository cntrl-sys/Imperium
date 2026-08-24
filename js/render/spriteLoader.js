// js/render/spriteLoader.js
//
// Lädt Sprite-Sheet-Bilder und cached das Ergebnis (auch Fehlschläge).
// Wenn eine Datei noch nicht existiert, wird das genau einmal in der
// Konsole vermerkt und dauerhaft ein Fallback verwendet — das Spiel bleibt
// dadurch immer spielbar, unabhängig davon, welche Sprites bereits
// existieren.

const cache = new Map(); // path -> HTMLImageElement | null (null = fehlgeschlagen)
const pending = new Map(); // path -> Promise
const warnedMissing = new Set();

/**
 * Lädt (oder liefert aus dem Cache) das Sprite Sheet für den angegebenen
 * Pfad. Gibt null zurück, wenn die Datei nicht geladen werden konnte.
 * @returns {Promise<HTMLImageElement|null>}
 */
export function loadSpriteSheet(path) {
    if (cache.has(path)) return Promise.resolve(cache.get(path));
    if (pending.has(path)) return pending.get(path);

    const promise = new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            cache.set(path, img);
            pending.delete(path);
            resolve(img);
        };
        img.onerror = () => {
            cache.set(path, null);
            pending.delete(path);
            if (!warnedMissing.has(path)) {
                warnedMissing.add(path);
                console.warn(
                    `[Sprite] Sprite-Sheet noch nicht gefunden: "${path}". ` +
                        `Verwende vorübergehend die Fallback-Darstellung.`
                );
            }
            resolve(null);
        };
        img.src = path;
    });

    pending.set(path, promise);
    return promise;
}

/**
 * Synchroner Zugriff auf ein bereits geladenes (oder als fehlend
 * markiertes) Sprite Sheet. Liefert undefined, solange noch nicht
 * versucht wurde, es zu laden.
 */
export function getCachedSpriteSheet(path) {
    return cache.get(path);
}

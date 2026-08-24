// js/data/maps.js
//
// Zentrale, datengetriebene Definition aller verfügbaren Karten.
// Neue Karte hinzufügen = neuer Eintrag hier + passendes Bild in assets/maps/.

export const maps = [
    {
        id: "goldene-ebene",
        name: "Goldene Ebene",
        image: "assets/maps/map-goldene-ebene.svg",
        description: "Weite, fruchtbare Ebenen – ideal für schnelle Expansion und offene Feldschlachten."
    },
    {
        id: "nordmark",
        name: "Nordmark",
        image: "assets/maps/map-nordmark.svg",
        description: "Kühles, hügeliges Grenzland mit dichten Wäldern und wenigen sicheren Pfaden."
    },
    {
        id: "wuestenpfad",
        name: "Wüstenpfad",
        image: "assets/maps/map-wuestenpfad.svg",
        description: "Trockenes, unwirtliches Terrain, das Vorräte und Wasserzugang zur Herausforderung macht."
    },
    {
        id: "inselarchipel",
        name: "Inselarchipel",
        image: "assets/maps/map-inselarchipel.svg",
        description: "Verstreute Inseln, auf denen Seemacht und Handelsrouten über den Sieg entscheiden."
    },
    {
        id: "bergpass",
        name: "Bergpass",
        image: "assets/maps/map-bergpass.svg",
        description: "Enge Pässe und steile Höhen begünstigen Verteidiger und erschweren jeden Vormarsch."
    },
    {
        id: "flussdelta",
        name: "Flussdelta",
        image: "assets/maps/map-flussdelta.svg",
        description: "Ein reiches Flussdelta mit fruchtbarem Boden – umkämpft von allen Seiten."
    }
];

export function getMapById(id) {
    return maps.find((map) => map.id === id) || null;
}

// ============================================================
// Spielbare Tile-Struktur (datengetrieben, unabhängig vom Kartenbild)
// ============================================================
//
// Das Kartenbild in assets/maps/ dient weiterhin als visuelle Grundlage /
// Referenz. Die eigentliche spielbare Karte ist aber eine Tile-Struktur aus
// "land"- und "water"-Feldern. Jede Map bekommt hier ein Terrain-Muster,
// das ungefähr zu ihrer Beschreibung passt, plus feste Startpositionen für
// Hauptstadt und Hafen von Spieler und Bot.
//
// Alle Karten nutzen dieselbe Größe, damit die Spawn-Formeln (Rand = Wasser
// als Küste, Hauptstadt/Hafen an festen Offsets) für jede Karte gültig
// bleiben, ohne dass jede Karte manuell austariert werden muss.

export const MAP_WIDTH = 18;
export const MAP_HEIGHT = 12;

// Feste Spawn-Offsets, gültig für alle Karten (siehe oben).
const SPAWNS = {
    player: {
        capital: { x: 2, y: 5 },
        port: { x: 1, y: 7 }
    },
    bot: {
        capital: { x: MAP_WIDTH - 3, y: 5 }, // 15
        port: { x: MAP_WIDTH - 2, y: 7 } // 16
    }
};

/**
 * Terrain-Muster pro Karte. Jede Funktion bekommt Innenkoordinaten
 * (also ohne den äußeren Wasserrand, der die Küste für alle Karten bildet)
 * und liefert "land" oder "water" zurück.
 */
const terrainPatterns = {
    // Weite, offene Ebene mit einem kleinen See in der Mitte.
    "goldene-ebene": (x, y) => {
        const cx = MAP_WIDTH / 2;
        const cy = MAP_HEIGHT / 2;
        const dist = Math.hypot(x - cx, y - cy);
        return dist < 1.6 ? "water" : "land";
    },

    // Hügeliges Grenzland mit einem schmalen Fluss, der diagonal verläuft.
    nordmark: (x, y) => {
        const diag = Math.abs(x - y - 2);
        return diag < 1 ? "water" : "land";
    },

    // Trockenes Terrain mit einem schmalen, geschwungenen Wasserpfad (Oase).
    wuestenpfad: (x, y) => {
        const wave = MAP_HEIGHT / 2 + Math.sin(x / 2.2) * 1.6;
        return Math.abs(y - wave) < 0.8 ? "water" : "land";
    },

    // Zwei gegenüberliegende Inseln, getrennt durch einen Wasserkanal.
    inselarchipel: (x, y) => {
        const third = (MAP_WIDTH - 2) / 3;
        const relX = x - 1;
        if (relX >= third && relX < third * 2) return "water";
        return "land";
    },

    // Enge Pässe: ein zentraler Bergsee mit schmalem Landdurchgang.
    bergpass: (x, y) => {
        const cx = MAP_WIDTH / 2;
        const nearCenterColumn = Math.abs(x - cx) < 2;
        const isPassRow = y === Math.floor(MAP_HEIGHT / 2);
        if (nearCenterColumn && !isPassRow) return "water";
        return "land";
    },

    // Fruchtbares Flussdelta: ein verzweigter Fluss, der sich auffächert.
    flussdelta: (x, y) => {
        const cy = MAP_HEIGHT / 2;
        const branch1 = Math.abs(y - cy - (x - MAP_WIDTH / 2) * 0.35);
        const branch2 = Math.abs(y - cy + (x - MAP_WIDTH / 2) * 0.35);
        if (x > MAP_WIDTH / 2 - 2 && (branch1 < 0.8 || branch2 < 0.8)) return "water";
        return "land";
    }
};

/**
 * Erzeugt die vollständige, spielbare Tile-Struktur für eine Karte.
 * @param {string} mapId
 * @returns {{width:number, height:number, tiles: Array<Array<{x:number,y:number,terrain:string}>>}}
 */
export function generateMapTiles(mapId) {
    const pattern = terrainPatterns[mapId] || terrainPatterns["goldene-ebene"];
    const tiles = [];

    for (let y = 0; y < MAP_HEIGHT; y++) {
        const row = [];
        for (let x = 0; x < MAP_WIDTH; x++) {
            const isBorder = x === 0 || y === 0 || x === MAP_WIDTH - 1 || y === MAP_HEIGHT - 1;
            const terrain = isBorder ? "water" : pattern(x, y);
            row.push({ x, y, terrain });
        }
        tiles.push(row);
    }

    // Hauptstädte und Häfen müssen immer auf gültigem Terrain liegen —
    // unabhängig vom generierten Muster überschreiben wir diese Felder
    // gezielt, damit jede Karte garantiert spielbar ist.
    forceTerrain(tiles, SPAWNS.player.capital, "land");
    forceTerrain(tiles, SPAWNS.bot.capital, "land");
    forceTerrain(tiles, SPAWNS.player.port, "land");
    forceTerrain(tiles, SPAWNS.bot.port, "land");
    // Der Hafen braucht ein direkt angrenzendes Wasserfeld (zur Küste hin).
    forceTerrain(tiles, { x: SPAWNS.player.port.x - 1, y: SPAWNS.player.port.y }, "water");
    forceTerrain(tiles, { x: SPAWNS.bot.port.x + 1, y: SPAWNS.bot.port.y }, "water");

    return { width: MAP_WIDTH, height: MAP_HEIGHT, tiles };
}

function forceTerrain(tiles, { x, y }, terrain) {
    if (tiles[y] && tiles[y][x]) {
        tiles[y][x].terrain = terrain;
    }
}

/**
 * Liefert die Spawn-Positionen (Hauptstadt + Hafen) für Spieler und Bot.
 * Diese Positionen sind für alle Karten identisch (siehe SPAWNS oben),
 * damit die Architektur beliebig viele Karten unterstützen kann, ohne
 * jede Karte manuell konfigurieren zu müssen.
 */
export function getMapSpawns() {
    return {
        player: {
            capital: { ...SPAWNS.player.capital },
            port: { ...SPAWNS.player.port }
        },
        bot: {
            capital: { ...SPAWNS.bot.capital },
            port: { ...SPAWNS.bot.port }
        }
    };
}

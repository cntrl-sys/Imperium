// Gebäudekatalog: Kosten, Verteidigung, Sicht und Spezialfunktionen.

export const buildingTypes = [
    {
        id: "academy",
        name: "Akademie",
        symbol: "⌂",
        description: "Ermöglicht Forschung und dauerhafte Verbesserungen für dein Reich.",
        health: 55,
        cost: { gold: 150, wood: 6, stone: 5 }
    },
    {
        id: "barracks",
        name: "Kaserne",
        symbol: "♜",
        description: "Rekrutiert Landtruppen direkt an der Kaserne.",
        health: 40,
        cost: { gold: 120, wood: 4, stone: 2 }
    },
    {
        id: "warehouse",
        name: "Lagerhaus",
        symbol: "▤",
        description: "Erhöht den Lagerraum für Getreide, Holz und Stein um 50.",
        health: 50,
        cost: { gold: 90, wood: 3, stone: 3 },
        storageBonus: 50
    },
    {
        id: "wall",
        name: "Mauer",
        symbol: "▰",
        description: "Blockiert feindliche und eigene Wege. Baue Tore in die Mauerlinie.",
        health: 90,
        cost: { gold: 45, wood: 1, stone: 3 }
    },
    {
        id: "gate",
        name: "Tor",
        symbol: "▥",
        description: "Eigene Truppen können passieren. Für Gegner bleibt das Tor geschlossen.",
        health: 110,
        cost: { gold: 70, wood: 3, stone: 2 }
    },
    {
        id: "watchtower",
        name: "Wachturm",
        symbol: "♜",
        description: "Bogenschützen im Turm beschießen automatisch feindliche Truppen in Reichweite.",
        health: 80,
        cost: { gold: 130, wood: 5, stone: 5 },
        attackDamage: 4,
        attackRange: 5,
        attackCooldown: 1600,
        vision: 6
    }
];

export function getBuildingTypeById(id) {
    return buildingTypes.find((building) => building.id === id) || null;
}

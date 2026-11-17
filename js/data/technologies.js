export const technologies = [
    { id: "iron-forging", name: "Eisenverarbeitung", symbol: "⚔", description: "Alle Truppen verursachen 2 zusätzlichen Schaden.", cost: { gold: 180, wood: 2, stone: 5 }, duration: 45, effects: { attackDamage: 2 } },
    { id: "imperial-ledger", name: "Reichsverwaltung", symbol: "▤", description: "Das regelmäßige Einkommen steigt um 15 Gold.", cost: { gold: 160, wood: 5, stone: 2 }, duration: 40, effects: { goldPerTurn: 15 } },
    { id: "stonework", name: "Meisterhafte Befestigung", symbol: "▰", description: "Eigene Gebäude erleiden 30 % weniger Schaden.", cost: { gold: 200, wood: 3, stone: 8 }, duration: 50, effects: { buildingDefense: 0.3 } },
    { id: "naval-charts", name: "Seekarten", symbol: "⚓", description: "Schiffe erhalten einen zusätzlichen Bewegungspunkt.", cost: { gold: 170, wood: 8, stone: 2 }, duration: 42, effects: { shipMovement: 1 } }
];

export function getTechnologyById(id) {
    return technologies.find((technology) => technology.id === id) || null;
}

// js/data/units.js
//
// Zentrale, datengetriebene Definition aller Einheitentypen.
// Neue Einheit hinzufügen = neuer Eintrag hier. Keine einheitenspezifische
// Logik an anderer Stelle im Code.
//
// Kampfwerte orientieren sich an den Imperivm-Spielnotizen.

export const unitTypes = [
    {
        id: "soldier",
        name: "Soldat",
        category: "land", // "land" | "ship" | "air"
        movement: 1,
        attackDamage: 5,
        health: 15,
        attackRange: 1,
        transportSize: 1, // Größe für spätere Transportkapazität
        cargoCapacity: 0, // Traglast (nur Schiffe)
        canAttack: true,
        cost: 100
    },
    {
        id: "archer",
        name: "Bogenschütze",
        category: "land",
        movement: 2,
        attackDamage: 3,
        health: 12,
        attackRange: 2,
        transportSize: 1,
        cargoCapacity: 0,
        canAttack: true,
        cost: 100
    },
    {
        id: "worker",
        name: "Arbeiter",
        category: "land",
        movement: 1,
        attackDamage: 0,
        health: 10,
        attackRange: 0,
        transportSize: 1,
        cargoCapacity: 0,
        canAttack: false,
        canGather: true,
        canBuild: true,
        cost: 50
    },
    {
        id: "minotaur",
        name: "Minotaurus",
        category: "land",
        movement: 1,
        attackDamage: 3,
        health: 20,
        attackRange: 1,
        transportSize: 1,
        cargoCapacity: 0,
        canAttack: true,
        cost: 150
    },
    {
        id: "hunter",
        name: "Jäger",
        category: "land",
        movement: 1,
        attackDamage: 6,
        health: 12,
        attackRange: 1,
        transportSize: 1,
        cargoCapacity: 0,
        canAttack: true,
        cost: 120
    },
    {
        id: "dragon-war",
        name: "Lung Hen · Kriegsdrache",
        category: "air",
        movement: 1,
        attackDamage: 4,
        health: 25,
        attackRange: 1,
        transportSize: 1,
        cargoCapacity: 0,
        canAttack: true,
        nations: ["china"],
        cost: 450
    },
    {
        id: "dragon-express",
        name: "Lung Yu · Expressdrache",
        category: "air",
        movement: 3,
        attackDamage: 4,
        health: 20,
        attackRange: 1,
        transportSize: 1,
        cargoCapacity: 0,
        canAttack: true,
        nations: ["china"],
        cost: 500
    },
    {
        id: "dragon-trade",
        name: "Lung Wei · Handelsdrache",
        category: "air",
        movement: 1,
        attackDamage: 0,
        health: 25,
        attackRange: 0,
        transportSize: null,
        cargoCapacity: 5,
        canAttack: false,
        nations: ["china"],
        transportCapacity: 5,
        cost: 400
    },
    {
        id: "warship",
        name: "Kriegsschiff",
        category: "ship",
        movement: 2,
        attackDamage: 5,
        health: 15,
        attackRange: 2,
        transportSize: null, // nicht transportierbar
        cargoCapacity: 1,
        transportCapacity: 1,
        canAttack: true,
        cost: 100
    },
    {
        id: "merchantShip",
        name: "Handelsschiff",
        category: "ship",
        movement: 1,
        attackDamage: 0,
        health: 20,
        attackRange: 0,
        transportSize: null, // nicht transportierbar
        cargoCapacity: 3,
        transportCapacity: 3,
        canAttack: false,
        cost: 300
    },
    ...[
        ["legionary", "Legionär", "rome", "land", 1, 7, 24, 1, 175, "♜"],
        ["egyptian-chariot", "Streitwagen", "egypt", "cavalry", 3, 7, 20, 1, 225, "🐎"],
        ["hoplite", "Hoplite", "greece", "land", 1, 6, 30, 1, 185, "🛡"],
        ["desert-rider", "Wüstenreiter", "namibia", "cavalry", 3, 6, 18, 1, 195, "🏇"],
        ["longbowman", "Langbogenschütze", "england", "land", 1, 4, 14, 4, 190, "🏹"],
        ["war-elephant", "Kriegselefant", "carthage", "land", 1, 10, 42, 1, 300, "🐘"],
        ["companion-cavalry", "Gefährtenreiterei", "macedon", "cavalry", 3, 8, 23, 1, 260, "🐎"],
        ["cuirassier", "Kürassier", "france", "cavalry", 3, 7, 25, 1, 250, "🏇"],
        ["horse-archer", "Berittener Bogenschütze", "mongols", "cavalry", 4, 5, 17, 3, 245, "🏇"],
        ["cossack", "Kosak", "russia", "cavalry", 3, 7, 24, 1, 235, "🏇"],
        ["samurai", "Samurai", "japan", "land", 2, 8, 23, 1, 230, "⚔"],
        ["persian-immortal", "Unsterblicher", "persia", "land", 1, 6, 27, 1, 210, "⚔"],
        ["spartan", "Spartaner", "sparta", "land", 1, 8, 32, 1, 220, "🛡"],
        ["numidian-rider", "Numidischer Reiter", "numidia", "cavalry", 4, 5, 16, 1, 205, "🏇"],
        ["palmyrene-cat", "Palmyrenischer Kataphrakt", "palmyra", "cavalry", 2, 9, 30, 1, 285, "🐎"],
        ["carian-crossbow", "Karischer Armbrustschütze", "caria", "land", 1, 6, 17, 3, 215, "🏹"]
    ].map(([id, name, nation, category, movement, attackDamage, health, attackRange, cost, symbol]) => ({
        id, name, category, movement, attackDamage, health, attackRange, cost, symbol,
        nations: [nation], transportSize: 1, cargoCapacity: 0, canAttack: true
    }))
];

export function getUnitTypeById(id) {
    return unitTypes.find((unitType) => unitType.id === id) || null;
}

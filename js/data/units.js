// js/data/units.js
//
// Zentrale, datengetriebene Definition aller Einheitentypen.
// Neue Einheit hinzufügen = neuer Eintrag hier. Keine einheitenspezifische
// Logik an anderer Stelle im Code.
//
// HINWEIS: Die "cost"-Werte sind vorläufige Platzhalter (PROVISIONAL /
// TEMPORARY). Die endgültige Balance wird später festgelegt.

export const unitTypes = [
    {
        id: "soldier",
        name: "Soldat",
        category: "land", // "land" | "ship" — bestimmt gültiges Terrain
        movement: 1,
        attackDamage: 5,
        health: 15,
        attackRange: 1,
        transportSize: 1, // Größe für spätere Transportkapazität
        cargoCapacity: 0, // Traglast (nur Schiffe)
        canAttack: true,
        cost: 20 // PROVISIONAL
    },
    {
        id: "archer",
        name: "Bogenschütze",
        category: "land",
        movement: 1,
        attackDamage: 3,
        health: 20,
        attackRange: 2,
        transportSize: 1,
        cargoCapacity: 0,
        canAttack: true,
        cost: 30 // PROVISIONAL
    },
    {
        id: "warship",
        name: "Kriegsschiff",
        category: "ship",
        movement: 1,
        attackDamage: 5,
        health: 15,
        attackRange: 2,
        transportSize: null, // nicht transportierbar
        cargoCapacity: 1,
        canAttack: true,
        cost: 50 // PROVISIONAL
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
        canAttack: false,
        cost: 40 // PROVISIONAL
    }
];

export function getUnitTypeById(id) {
    return unitTypes.find((unitType) => unitType.id === id) || null;
}

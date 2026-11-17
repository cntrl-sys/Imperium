// Bewegungsregeln für blockierende Gebäude und eigene Tore.

export function blocksMovement(unit, building) {
    if (!building || building.destroyed) return false;
    return !(building.typeId === "gate" && unit?.owner === building.owner);
}

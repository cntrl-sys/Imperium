// js/render/spriteAnimation.js
//
// Zentrale, wiederverwendbare Animations-Engine für Einheiten-Sprites.
// Verwaltet pro Einheit: animation.state, direction, frame, elapsed-Timer.
//
// Game-Logik (movement.js, combat.js) ruft nur setAnimation()/setDirection()
// auf. Der Rest (Frame-Fortschritt, automatische Rückkehr zu "idle" nach
// attack/damage) übernimmt diese Engine.

import { SPRITE_CONFIG } from "./spriteConfig.js";

/**
 * Stellt sicher, dass eine Einheit ein vollständiges animation-Objekt
 * besitzt (idempotent, kann beliebig oft aufgerufen werden).
 */
export function ensureAnimationState(unit) {
    if (!unit.animation) {
        unit.animation = { state: "idle", direction: unit.direction || "S", frame: 0, elapsed: 0 };
    }
    if (unit.animation.elapsed === undefined) unit.animation.elapsed = 0;
    return unit.animation;
}

/**
 * Setzt die aktuelle Animation einer Einheit (z.B. "walk", "attack").
 * Startet immer bei Frame 0.
 */
export function setAnimation(unit, animationState) {
    const anim = ensureAnimationState(unit);
    anim.state = animationState;
    anim.frame = 0;
    anim.elapsed = 0;
}

/**
 * Setzt die Blickrichtung einer Einheit (eine von 8 Richtungen).
 */
export function setDirection(unit, direction) {
    const anim = ensureAnimationState(unit);
    anim.direction = direction;
    unit.direction = direction;
}

/**
 * Bewegt alle Animationen einen Zeitschritt (dtMs) weiter. Animationen wie
 * "attack"/"damage" laufen einmal durch und kehren danach automatisch zu
 * "idle" zurück; "idle"/"walk" laufen in einer Schleife.
 */
export function tickAnimation(unit, dtMs) {
    const anim = ensureAnimationState(unit);
    const duration = SPRITE_CONFIG.frameDurations[anim.state] || SPRITE_CONFIG.frameDurations.idle;
    const frameCount = SPRITE_CONFIG.frameCounts[anim.state] || SPRITE_CONFIG.columns;

    anim.elapsed += dtMs;
    if (anim.elapsed < duration) return;

    const framesToAdvance = Math.floor(anim.elapsed / duration);
    anim.elapsed = anim.elapsed % duration;

    const isOneShot = SPRITE_CONFIG.oneShotAnimations.includes(anim.state);
    const nextFrame = anim.frame + framesToAdvance;

    if (isOneShot && nextFrame >= frameCount) {
        // Einmalige Animation abgeschlossen -> zurück zu idle.
        setAnimation(unit, "idle");
        return;
    }

    anim.frame = nextFrame % frameCount;
}

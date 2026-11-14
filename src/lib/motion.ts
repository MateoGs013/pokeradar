// La intensidad visual en un solo lugar: `data-motion` en <html>, "completa" o "reducida". La pone
// el script del layout antes del primer cuadro (lo guardado o, si no hay nada, lo que pide el
// sistema con `prefers-reduced-motion`) y la actualiza la sala cuando cambian los ajustes. La leen
// el CSS (las variantes motion-safe y motion-reduce de globals.css) y el código de abajo.
import type { MotionLevel } from "./shift";

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** La intensidad que pide el sistema. */
export function systemMotion(): MotionLevel {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
    ? "reducida"
    : "completa";
}

/** Si ahora va con movimiento reducido. */
export function reducedMotion(): boolean {
  return document.documentElement.dataset.motion === "reducida";
}

/** Avisa cuando cambia `data-motion`. Devuelve cómo dejar de escuchar. */
export function subscribeToMotion(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-motion"],
  });
  return () => observer.disconnect();
}

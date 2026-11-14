// Si la pantalla cumple una media query, y avisa cuando cambia (al rotar el teléfono o cambiar el
// tamaño de la ventana). useSyncExternalStore es la forma de React de leer un valor de afuera.
import { useCallback, useSyncExternalStore } from "react";

import { reducedMotion, subscribeToMotion } from "@/lib/motion";

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    // En el servidor no hay pantalla: se arma como celular (mobile-first).
    () => false,
  );
}

/**
 * Si va con movimiento reducido (la intensidad visual de lib/motion.ts: la elegida en los ajustes o
 * la del sistema), y avisa cuando cambia. Se usa en lugar de `useReducedMotion` de motion, que lee
 * el sistema una sola vez al montar (framer-motion, utils/reduced-motion/use-reduced-motion.mjs,
 * con un TODO al respecto) y no sabe de los ajustes.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeToMotion, reducedMotion, () => false);
}

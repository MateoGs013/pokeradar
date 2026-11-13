// Si la pantalla cumple una media query, y avisa cuando cambia (al rotar el teléfono o cambiar el
// tamaño de la ventana). useSyncExternalStore es la forma de React de leer un valor de afuera.
import { useCallback, useSyncExternalStore } from "react";

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

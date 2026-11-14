// Un parámetro de la URL, para los que fuerzan algo en una demo (`?shiny=4`, `?noche=1`). La URL
// no cambia mientras la sala está abierta: no hay a qué suscribirse. En el servidor no hay URL: es
// `null`, y el cliente la lee al hidratar.
import { useSyncExternalStore } from "react";

const subscribeToNothing = () => () => {};

export function useSearchParam(name: string): string | null {
  const search = useSyncExternalStore(
    subscribeToNothing,
    () => window.location.search,
    () => "",
  );
  return new URLSearchParams(search).get(name);
}

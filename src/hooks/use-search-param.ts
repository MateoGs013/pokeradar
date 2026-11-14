// Un parámetro de la URL con la que se abrió la página: `?p=25` (la señal compartida), y los que
// fuerzan algo en una demo (`?shiny=4`, `?noche=1`). Se lee una vez: la ficha cambia `p` con
// `history.replaceState` mientras la sala está abierta, y eso no tiene que volver a abrir la señal
// compartida. En el servidor no hay URL: es `null`, y el cliente la lee al hidratar.
import { useSyncExternalStore } from "react";

const subscribeToNothing = () => () => {};

let initialSearch: string | null = null;
const readInitialSearch = () => (initialSearch ??= window.location.search);

export function useSearchParam(name: string): string | null {
  const search = useSyncExternalStore(
    subscribeToNothing,
    readInitialSearch,
    () => "",
  );
  return new URLSearchParams(search).get(name);
}

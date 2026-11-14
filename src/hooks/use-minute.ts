// El minuto actual del reloj del operador, que cambia al empezar cada minuto. La página es
// estática: en el servidor, y al hidratar, es `null`.
import { useSyncExternalStore } from "react";

export const MINUTE = 60_000;

function subscribe(onChange: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const next = () => {
    onChange();
    timer = setTimeout(next, MINUTE - (Date.now() % MINUTE));
  };
  timer = setTimeout(next, MINUTE - (Date.now() % MINUTE));
  return () => clearTimeout(timer);
}

// El minuto actual como número: dos lecturas en el mismo minuto dan lo mismo.
const currentMinute = () => Math.floor(Date.now() / MINUTE);

/** Minutos desde 1970 (`new Date(minuto * MINUTE)` da la fecha), o `null` sin navegador. */
export function useMinute(): number | null {
  return useSyncExternalStore(subscribe, currentMinute, () => null);
}

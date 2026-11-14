// Si es de noche: `?noche=1` o `?noche=0` lo fuerzan, para mostrarlo a cualquier hora; si no, la hora
// del reloj del operador, que se vuelve a mirar cada minuto. `null` en el servidor y al hidratar.
import { isNight } from "@/lib/night";

import { MINUTE, useMinute } from "./use-minute";
import { useSearchParam } from "./use-search-param";

export function useNight(): boolean | null {
  const forced = useSearchParam("noche");
  const minute = useMinute();
  if (forced === "1") return true;
  if (forced === "0") return false;
  return minute === null ? null : isNight(new Date(minute * MINUTE).getHours());
}

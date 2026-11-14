// La identificación de una señal: pide la ficha de la especie y la guarda, para que abrir otra vez
// la misma señal no repita los pedidos.
import { useEffect, useEffectEvent, useState } from "react";

import { fetchPokemonDetail, type PokemonDetail } from "@/lib/pokeapi/detail";

export type Identification =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; detail: PokemonDetail };

/**
 * Identifica la especie `speciesId`, o nada si es `null` (la ficha está cerrada). Solo se guardan
 * las fichas que llegaron bien: una falla no queda guardada, y abrir de nuevo la señal o tocar
 * Reintentar vuelve a pedir. `identified` trae todas las guardadas: el mapa muestra el sprite en
 * esas señales. `onIdentify` avisa cada especie que se identificó por primera vez, con su ficha.
 */
export function usePokemonDetail(
  speciesId: number | null,
  onIdentify: (speciesId: number, detail: PokemonDetail) => void,
) {
  const identify = useEffectEvent(onIdentify);
  const [identified, setIdentified] = useState<
    ReadonlyMap<number, PokemonDetail>
  >(() => new Map());
  const [failed, setFailed] = useState(false);

  // Otra señal, o la ficha cerrada: la falla anterior ya no corre. Se ajusta durante el render,
  // con el valor anterior guardado: react.dev lo prefiere a hacerlo en un efecto ("You Might Not
  // Need an Effect", sección "Adjusting some state when a prop changes").
  const [previousId, setPreviousId] = useState(speciesId);
  if (speciesId !== previousId) {
    setPreviousId(speciesId);
    setFailed(false);
  }

  const detail = speciesId === null ? undefined : identified.get(speciesId);

  useEffect(() => {
    if (speciesId === null || detail || failed) return;
    const controller = new AbortController();
    fetchPokemonDetail(speciesId, controller.signal).then(
      (result) => {
        setIdentified((current) => new Map(current).set(speciesId, result));
        identify(speciesId, result);
      },
      () => {
        // Cortado a propósito (se cerró la ficha o cambió la señal, o Strict Mode desmontó el
        // efecto en desarrollo): no es una falla. El corte por tiempo de detail.ts sí lo es, y
        // no aborta este controller.
        if (!controller.signal.aborted) setFailed(true);
      },
    );
    return () => controller.abort();
  }, [speciesId, detail, failed]);

  const identification: Identification | null =
    speciesId === null
      ? null
      : detail
        ? { status: "ready", detail }
        : failed
          ? { status: "error" }
          : { status: "loading" };

  return { identification, identified, retry: () => setFailed(false) };
}

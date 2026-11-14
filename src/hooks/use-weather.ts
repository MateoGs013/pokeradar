// El clima de la sala: se pide una vez, al montarla.
import { useEffect, useState } from "react";

import type { Weather } from "@/lib/weather/conditions";
import { fetchWeather } from "@/lib/weather/open-meteo";

export type WeatherState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; weather: Weather };

export function useWeather(): WeatherState {
  const [state, setState] = useState<WeatherState>({ status: "loading" });
  useEffect(() => {
    const controller = new AbortController();
    fetchWeather(controller.signal).then(
      (weather) => setState({ status: "ready", weather }),
      () => {
        // Cortado a propósito (Strict Mode desmonta el efecto en desarrollo): no es una falla.
        if (!controller.signal.aborted) setState({ status: "error" });
      },
    );
    return () => controller.abort();
  }, []);
  return state;
}

// El clima actual, pedido en el navegador a Open-Meteo. No lleva clave y responde con
// `access-control-allow-origin: *` (medido). Es gratis para uso no comercial, hasta 600 pedidos por
// minuto (open-meteo.com/en/terms), y la sala hace uno por carga. Los datos son CC BY 4.0: van con
// un enlace a Open-Meteo junto al dato (open-meteo.com/en/licence), que pone el HUD.
import { isRecord } from "@/lib/pokeapi/guards";

import { conditionOf, type Weather } from "./conditions";

/**
 * Viedma, la capital de Río Negro: la zona que el concepto usa cuando no hay ubicación del usuario
 * (docs/concepto.md). Pedir la ubicación llega con el modo híbrido (bloque 6).
 */
const LATITUDE = -40.81;
const LONGITUDE = -62.99;

const URL = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=weather_code,temperature_2m`;

/** Si tarda más que esto, se corta y el HUD dice que no hay datos. */
const TIMEOUT_MS = 10_000;

/**
 * El clima de ahora. Lanza si la red falla, si se corta (con `signal` o a los 10 s), si el status no
 * es 2xx o si la respuesta no trae `current.weather_code` y `current.temperature_2m` como números.
 */
export async function fetchWeather(signal: AbortSignal): Promise<Weather> {
  // Como en pokeapi/detail.ts: la señal de afuera y el tiempo, a mano y no con AbortSignal.any.
  const controller = new AbortController();
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const abort = () => controller.abort();
  if (signal.aborted) abort();
  signal.addEventListener("abort", abort);
  timeout.addEventListener("abort", abort);
  try {
    const response = await fetch(URL, { signal: controller.signal });
    if (!response.ok)
      throw new Error(`Open-Meteo respondió ${response.status} en ${URL}`);
    const data: unknown = await response.json();
    const current = isRecord(data) ? data.current : null;
    if (
      !isRecord(current) ||
      typeof current.weather_code !== "number" ||
      typeof current.temperature_2m !== "number"
    ) {
      throw new Error(`La respuesta de ${URL} no tiene la forma esperada`);
    }
    const condition = conditionOf(current.weather_code);
    if (!condition) {
      throw new Error(`Código de clima desconocido: ${current.weather_code}`);
    }
    return { condition, temperature: current.temperature_2m };
  } finally {
    signal.removeEventListener("abort", abort);
    timeout.removeEventListener("abort", abort);
  }
}

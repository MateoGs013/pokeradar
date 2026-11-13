// Cliente tipado de PokéAPI para el servidor: el pedido de request.ts con la caché de Next.
import "server-only";

import { requestJson } from "./request";

// Las especies de las generaciones 1 a 3 no cambian: se cachean sin vencimiento
// (`revalidate: false`), así la página se arma una vez por deploy y no vuelve a depender de
// PokéAPI. En Next 16 `fetch` no cachea por defecto (node_modules/next/dist/docs/.../fetch.md).
const SIN_VENCIMIENTO = false;

// Un pedido colgado se corta acá, con la URL en el error, en lugar de esperar el límite de 60 s
// del build. El `signal` no afecta la caché de datos: solo desactiva la memoización por render.
const TIMEOUT_MS = 10_000;

/**
 * Pide `path` a PokéAPI y valida la forma de la respuesta con `guard`. Si algo falla, lanza un
 * PokeApiError (request.ts).
 */
export function getJson<T>(
  path: string,
  guard: (value: unknown) => value is T,
): Promise<T> {
  return requestJson(path, guard, {
    next: { revalidate: SIN_VENCIMIENTO },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

// Cliente tipado de PokéAPI. Corre solo en el servidor.
import "server-only";

const BASE_URL = "https://pokeapi.co/api/v2";

// Los datos de PokéAPI casi no cambian: se cachean un día.
// En Next 16 `fetch` no cachea por defecto (node_modules/next/dist/docs/.../fetch.md).
const UN_DIA_EN_SEGUNDOS = 60 * 60 * 24;

// Un pedido colgado se corta acá, con la URL en el error, en lugar de esperar el límite de 60 s
// del build. El `signal` no afecta la caché de datos: solo desactiva la memoización por render.
const TIMEOUT_MS = 10_000;

export class PokeApiError extends Error {
  readonly url: string;
  /** Status HTTP de la respuesta, o `null` si el error no vino de un status (red, JSON, forma). */
  readonly status: number | null;

  constructor(
    url: string,
    status: number | null,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "PokeApiError";
    this.url = url;
    this.status = status;
  }
}

/**
 * Pide `path` a PokéAPI y valida la forma de la respuesta con `guard`.
 * Cualquier falla (red, timeout, status no 2xx, JSON inválido o forma inesperada) lanza un
 * PokeApiError con la URL; el error original queda en `cause`.
 */
export async function getJson<T>(
  path: string,
  guard: (value: unknown) => value is T,
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      next: { revalidate: UN_DIA_EN_SEGUNDOS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new PokeApiError(
      url,
      null,
      `No se pudo conectar con ${url} o tardó más de ${TIMEOUT_MS / 1000} s`,
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new PokeApiError(
      url,
      response.status,
      `PokéAPI respondió ${response.status} en ${url}`,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    throw new PokeApiError(url, null, `La respuesta de ${url} no es JSON`, {
      cause: error,
    });
  }

  if (!guard(data)) {
    throw new PokeApiError(
      url,
      null,
      `La respuesta de ${url} no tiene la forma esperada`,
    );
  }
  return data;
}

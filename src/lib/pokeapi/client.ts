// Cliente tipado de PokéAPI. Corre solo en el servidor.
import "server-only";

const BASE_URL = "https://pokeapi.co/api/v2";

// Los datos de PokéAPI casi no cambian: se cachean un día.
// En Next 16 `fetch` no cachea por defecto (node_modules/next/dist/docs/.../fetch.md).
const UN_DIA_EN_SEGUNDOS = 60 * 60 * 24;

export class PokeApiError extends Error {
  readonly url: string;
  readonly status: number;

  constructor(url: string, status: number, message: string) {
    super(message);
    this.name = "PokeApiError";
    this.url = url;
    this.status = status;
  }
}

/**
 * Pide `path` a PokéAPI y valida la forma de la respuesta con `guard`.
 * Si la respuesta no es 2xx o no tiene la forma esperada, lanza un PokeApiError.
 */
export async function getJson<T>(
  path: string,
  guard: (value: unknown) => value is T,
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    next: { revalidate: UN_DIA_EN_SEGUNDOS },
  });

  if (!response.ok) {
    throw new PokeApiError(
      url,
      response.status,
      `PokéAPI respondió ${response.status} en ${url}`,
    );
  }

  const data: unknown = await response.json();
  if (!guard(data)) {
    throw new PokeApiError(
      url,
      response.status,
      `La respuesta de ${url} no tiene la forma esperada`,
    );
  }
  return data;
}

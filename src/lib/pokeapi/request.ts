// Un pedido a PokéAPI con la forma de la respuesta validada. Lo comparten el servidor (client.ts,
// para el dataset) y el navegador (detail.ts, para la ficha): cambian la caché y cuándo se corta,
// que llegan en `init`. Por eso no lleva `import "server-only"`.

const BASE_URL = "https://pokeapi.co/api/v2";

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
 * Cualquier falla (red, pedido cortado por `init.signal`, status no 2xx, JSON inválido o forma
 * inesperada) lanza un PokeApiError con la URL; el error original queda en `cause`.
 */
export async function requestJson<T>(
  path: string,
  guard: (value: unknown) => value is T,
  init: RequestInit,
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    throw new PokeApiError(
      url,
      null,
      `No se pudo conectar con ${url}, o se cortó el pedido`,
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

/**
 * Saca el id numérico del final de una URL de PokéAPI. Sirve para especies
 * (`.../pokemon-species/25/` → 25) y para Pokémon (`.../pokemon/25/` → 25).
 * Lanza si la URL no termina en un id.
 */
export function idFromUrl(url: string): number {
  const match = /\/(\d+)\/?$/.exec(url);
  if (!match?.[1]) {
    throw new Error(`La URL de PokéAPI no termina en un id: ${url}`);
  }
  return Number(match[1]);
}

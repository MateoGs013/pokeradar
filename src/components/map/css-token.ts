// Los tokens de globals.css leídos desde JavaScript, para lo que no entiende CSS: las capas de
// MapLibre y el canvas de la niebla. Se leen del elemento <html>, donde están definidos.

/** Lee un token de globals.css (los colores y las medidas viven en un solo lugar). */
export function cssToken(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

/** Un token numérico. Si falta o no es un número, falla acá y no con un valor raro en el mapa. */
export function cssNumber(name: string): number {
  const value = Number.parseFloat(cssToken(name));
  if (Number.isNaN(value)) throw new Error(`El token ${name} no es un número`);
  return value;
}

/**
 * Las familias de una variable de fuente de next/font (`"Martian Mono", "Martian Mono Fallback"`),
 * sin comillas: MapLibre arma su propia lista de CSS con los nombres. Así el nombre sale del mismo
 * token que usa la página, no de una copia escrita a mano.
 */
export function cssFontFamilies(name: string): string[] {
  const families = cssToken(name)
    .split(",")
    .map((family) => family.trim().replace(/^["']|["']$/g, ""))
    .filter((family) => family !== "");
  if (families.length === 0) throw new Error(`El token ${name} está vacío`);
  return families;
}

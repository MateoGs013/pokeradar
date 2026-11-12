// Aleatoriedad con semilla: misma semilla, misma secuencia. Es lo que hace que el mundo sea
// siempre el mismo. Nunca se usa Math.random() para generar el mundo.
// Sin `import "server-only"`: no genera nada por sí solo y también lo puede usar el cliente
// (por ejemplo, para repartir señales con semilla en el modo de mapa real).

/**
 * Generador pseudoaleatorio mulberry32: original en C de Tommy Ettinger (2017); versión en JS de
 * bryc (github.com/bryc/code, jshash/PRNGs.md, en dominio público), comprobada valor por valor
 * contra esta. Guarda un solo entero de 32 bits como estado: cada
 * llamada lo avanza con una constante y lo mezcla con multiplicaciones y desplazamientos.
 * Devuelve números en [0, 1).
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deriva una semilla para un uso concreto ("altura", "humedad", "ciudades"), con el hash
 * FNV-1a de 32 bits. Cada uso tiene su propia secuencia: ajustar las ciudades no mueve el terreno.
 */
export function deriveSeed(seed: number, purpose: string): number {
  let hash = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < purpose.length; i++) {
    hash = Math.imul(hash ^ purpose.charCodeAt(i), 16777619) >>> 0;
  }
  return hash;
}

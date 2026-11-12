// Aleatoriedad con semilla: misma semilla, misma secuencia. Es lo que hace que el mundo sea
// siempre el mismo. Nunca se usa Math.random() para generar el mundo.

/**
 * Generador pseudoaleatorio mulberry32 (Tommy Ettinger, dominio público; versión en JS de
 * github.com/bryc/code, jshash/PRNGs.md). Guarda un solo entero de 32 bits como estado: cada
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

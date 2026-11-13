// El nivel de amenaza de la ficha: sale de la suma de las estadísticas base, con los cortes de
// docs/concepto.md ("Ficha de inteligencia"). En las 386 especies la suma va de 180 a 680
// (docs/hallazgos-pokeapi.md).
export const THREAT_LEVELS = ["Bajo", "Medio", "Alto", "Crítico"] as const;

export type ThreatLevel = (typeof THREAT_LEVELS)[number];

export function threatLevel(total: number): ThreatLevel {
  if (total < 300) return "Bajo";
  if (total < 450) return "Medio";
  if (total < 580) return "Alto";
  return "Crítico";
}

// Página provisoria: comprueba el dataset de especies armado en el servidor.
// Se reemplaza por el mapa en el bloque 2.
import { getSpeciesDataset } from "@/lib/pokeapi/dataset";
import { HABITATS } from "@/lib/pokeapi/types";

export default async function Home() {
  const species = await getSpeciesDataset();
  const byHabitat = HABITATS.map((habitat) => ({
    habitat,
    total: species.filter((s) => s.habitat === habitat).length,
  }));
  const dualType = species.filter((s) => s.types.length === 2).length;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 font-mono">
      <h1 className="text-lg tracking-widest text-hud uppercase">PokéRadar</h1>
      <p className="text-sm text-muted-foreground">
        {species.length} especies cargadas · {dualType} con dos tipos
      </p>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {byHabitat.map(({ habitat, total }) => (
          <li key={habitat} className="flex justify-between gap-4">
            <span className="text-muted-foreground">{habitat}</span>
            <span>{total}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}

// La sala de monitoreo. El servidor genera el mundo y ubica las señales al compilar, y se los
// pasa al mapa, que es cliente, una sola vez. El rótulo de la esquina muestra la huella del
// mundo: si coincide entre local y producción, el mundo es el mismo.
import { PANEL_WIDTH } from "@/components/dossier/panel-size";
import { MapLoader } from "@/components/map/map-loader";
import { placeSpawns } from "@/lib/geo/spawns";
import { getSpeciesDataset } from "@/lib/pokeapi/dataset";
import { generateWorld, worldHash } from "@/lib/world/generate";
import { WORLD_BOUNDS } from "@/lib/world/grid";

export default async function Home() {
  const world = generateWorld();
  const spawns = placeSpawns(
    world.cells,
    await getSpeciesDataset(),
    world.seed,
  );
  const { west, south, east, north } = WORLD_BOUNDS;

  // El rótulo va antes que el mapa para que el encabezado sea lo primero que lee un lector de
  // pantalla; z-10 lo deja dibujado encima del mapa, que viene después. Lleva fondo porque al
  // mover el mapa puede quedar cualquier bioma debajo, y sin él el texto apagado no se lee bien
  // sobre los más claros. Desde md, cuando la ficha va al costado, el rótulo corta la línea antes
  // del panel (más un margen igual al de la izquierda) en vez de quedar tapado.
  return (
    <main
      className="relative flex-1 overflow-hidden"
      style={{ "--panel-width": `${PANEL_WIDTH}px` }}
    >
      <div className="pointer-events-none absolute top-3 left-3 z-10 bg-background/80 px-1.5 py-0.5 font-mono text-xs text-muted-foreground md:max-w-[calc(100%-var(--panel-width)-(--spacing(6)))]">
        <h1 className="inline tracking-widest text-hud uppercase">PokéRadar</h1>{" "}
        · semilla {world.seed} · huella {worldHash(world)} · {spawns.length}{" "}
        señales
      </div>
      <MapLoader
        biomes={world.biomes}
        bounds={[
          [west, south],
          [east, north],
        ]}
        spawns={spawns}
      />
    </main>
  );
}

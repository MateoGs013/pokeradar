// La sala de monitoreo. El servidor genera el mundo y ubica las señales al compilar (las del mundo
// y las del mapa real), y se los pasa a la sala, que es cliente, una sola vez. Los ajustes del
// turno muestran la huella del mundo: si coincide entre local y producción, el mundo es el mismo.
import { PANEL_WIDTH } from "@/components/dossier/panel-size";
import { MonitoringRoom } from "@/components/hud/monitoring-room";
import { placeArgentinaSpawns } from "@/lib/geo/argentina-spawns";
import { placeSpawns } from "@/lib/geo/spawns";
import { getSpeciesDataset } from "@/lib/pokeapi/dataset";
import { generateWorld, worldHash } from "@/lib/world/generate";
import { GRID_HEIGHT, GRID_WIDTH, WORLD_BOUNDS } from "@/lib/world/grid";

export default async function Home() {
  const world = generateWorld();
  const spawns = placeSpawns(
    world.cells,
    await getSpeciesDataset(),
    world.seed,
  );
  const { west, south, east, north } = WORLD_BOUNDS;

  return (
    <main
      className="relative flex-1 overflow-hidden"
      style={{ "--panel-width": `${PANEL_WIDTH}px` }}
    >
      <MonitoringRoom
        seed={world.seed}
        hash={worldHash(world)}
        biomes={world.biomes}
        chart={world.chart}
        bounds={[
          [west, south],
          [east, north],
        ]}
        spawns={spawns}
        realSpawns={placeArgentinaSpawns(spawns, world.seed)}
        places={world.places}
        grid={{ width: GRID_WIDTH, height: GRID_HEIGHT }}
        radarBase={world.radarBase}
      />
    </main>
  );
}

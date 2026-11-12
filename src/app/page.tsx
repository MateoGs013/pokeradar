// La sala de monitoreo. El servidor genera el mundo al compilar y se lo pasa al mapa, que es
// cliente, una sola vez. El rótulo de la esquina muestra la huella del mundo: si coincide entre
// local y producción, el mundo es el mismo.
import { MapLoader } from "@/components/map/map-loader";
import { generateWorld, worldHash } from "@/lib/world/generate";
import { WORLD_BOUNDS } from "@/lib/world/grid";

export default function Home() {
  const world = generateWorld();
  const { west, south, east, north } = WORLD_BOUNDS;

  return (
    <main className="relative flex-1 overflow-hidden">
      <MapLoader
        biomes={world.biomes}
        bounds={[
          [west, south],
          [east, north],
        ]}
      />
      <p className="pointer-events-none absolute top-3 left-3 font-mono text-xs text-muted-foreground">
        <span className="tracking-widest text-hud uppercase">PokéRadar</span> ·
        semilla {world.seed} · huella {worldHash(world)}
      </p>
    </main>
  );
}

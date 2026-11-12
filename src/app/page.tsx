// Página provisoria: comprueba el dataset de especies y el mundo generado, los dos armados en
// el servidor al compilar. Se reemplaza por el mapa en el bloque 2.
import { getSpeciesDataset } from "@/lib/pokeapi/dataset";
import type { HabitatName } from "@/lib/pokeapi/types";
import { countCells } from "@/lib/world/biomes";
import { generateWorld, worldHash } from "@/lib/world/generate";
import { CELL_COUNT, WORLD_BOUNDS } from "@/lib/world/grid";
import type { BiomeFeature } from "@/lib/world/types";

/** Relleno de cada bioma en la vista previa, con los colores del HUD. */
const PREVIEW_FILL: Record<HabitatName, string> = {
  sea: "fill-hud-cian/10",
  "waters-edge": "fill-hud-cian/30",
  grassland: "fill-hud/15",
  "rough-terrain": "fill-hud-ambar/25",
  forest: "fill-hud/35",
  urban: "fill-foreground/60",
  mountain: "fill-hud/50",
  cave: "fill-hud/75",
  rare: "fill-hud-ambar",
};

/** MultiPolygon en [lng, lat] → atributo `d` de un path de SVG (x hacia la derecha, y hacia abajo). */
function toSvgPath(feature: BiomeFeature): string {
  return feature.geometry.coordinates
    .flatMap((polygon) =>
      polygon.map(
        (ring) =>
          "M" +
          ring
            .map(
              ([lng, lat]) =>
                `${(lng - WORLD_BOUNDS.west).toFixed(3)} ${(WORLD_BOUNDS.north - lat).toFixed(3)}`,
            )
            .join("L") +
          "Z",
      ),
    )
    .join("");
}

export default async function Home() {
  const species = await getSpeciesDataset();
  const dualType = species.filter((s) => s.types.length === 2).length;

  const world = generateWorld();
  const counts = countCells(world.cells);
  const geoJsonKb = Math.round(
    Buffer.byteLength(JSON.stringify(world.biomes)) / 1024,
  );
  const polygonCount = world.biomes.features.reduce(
    (total, feature) => total + feature.geometry.coordinates.length,
    0,
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 font-mono">
      <h1 className="text-lg tracking-widest text-hud uppercase">PokéRadar</h1>
      <svg
        viewBox={`0 0 ${WORLD_BOUNDS.east - WORLD_BOUNDS.west} ${WORLD_BOUNDS.north - WORLD_BOUNDS.south}`}
        className="aspect-4/3 w-full rounded-md border border-border"
        role="img"
        aria-label="Vista previa del mundo generado, con sus 9 biomas"
      >
        {world.biomes.features.map((feature) => (
          <path
            key={feature.properties.habitat}
            d={toSvgPath(feature)}
            className={PREVIEW_FILL[feature.properties.habitat]}
            fillRule="evenodd"
          />
        ))}
      </svg>
      <p className="text-sm text-muted-foreground">
        Semilla {world.seed} · huella {worldHash(world)} · {polygonCount}{" "}
        polígonos · GeoJSON {geoJsonKb} KB
      </p>
      <table className="text-sm">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="font-normal">Hábitat</th>
            <th className="text-right font-normal">Mundo</th>
            <th className="text-right font-normal">Especies</th>
          </tr>
        </thead>
        <tbody>
          {world.biomes.features.map(({ properties: { habitat } }) => (
            <tr key={habitat}>
              <td>{habitat}</td>
              <td className="text-right">
                {(((counts.get(habitat) ?? 0) / CELL_COUNT) * 100).toFixed(1)} %
              </td>
              <td className="text-right">
                {species.filter((s) => s.habitat === habitat).length}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm text-muted-foreground">
        {species.length} especies cargadas · {dualType} con dos tipos
      </p>
    </main>
  );
}

// El relieve pintado del mundo (lib/world/relief.ts), servido como imagen. Con `force-static`,
// Next lo genera una vez, al compilar, y lo sirve como un archivo más: pintarlo no le cuesta nada
// al navegador ni a cada visita (docs de Next, "Route Handlers", "Caching").
import { paintRelief } from "@/lib/world/relief";

export const dynamic = "force-static";

export function GET(): Response {
  return new Response(new Uint8Array(paintRelief()), {
    headers: { "Content-Type": "image/png" },
  });
}

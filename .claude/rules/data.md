---
paths:
  - "src/lib/**"
---

# Datos, mundo y geometría

- `fetch` tipado: cada respuesta de PokéAPI tiene su tipo en `src/lib/pokeapi/`, y solo ahí.
- Caché explícita: en el servidor, `fetch` con `next: { revalidate: ... }` (los datos de PokéAPI casi no cambian).
  Verificá la API de caché en `node_modules/next/dist/docs/` antes de usarla.
- Errores explícitos: si `!res.ok`, se lanza un error con el status y la URL. Nunca se devuelve `undefined` en silencio.
- Nada de `any` ni de `as` para forzar la forma. En el borde (lo que llega de la red) se valida la forma con un type
  guard propio antes de usar el dato. Los sprites pueden venir `null`: el tipo lo refleja.
- La generación del mundo es **determinista**: misma semilla, mismo mundo. Random con semilla de `src/lib/geo/`, nunca
  `Math.random()` en la generación.
- El mundo y el dataset se generan en el servidor: esos módulos llevan `import "server-only"`.
- Funciones puras y chicas: entrada → salida, sin efectos, fáciles de explicar y probar.
- Los datos comprobados de la API están en `docs/hallazgos-pokeapi.md`; si algo los contradice, se actualiza ese archivo.

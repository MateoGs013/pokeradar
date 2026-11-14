# Hallazgos de PokéAPI y Open-Meteo

Lo que se comprobó con pedidos reales, con fecha. Si algo de acá contradice al concepto, manda lo comprobado.

## Confirmado por Mateo con curl (11/11 y 12/11)

- Solo las especies de las generaciones 1 a 3 tienen `pokemon-habitat`. Las de generaciones posteriores devuelven
  `habitat: null`.
- Son 9 hábitats con 386 especies: grassland 80, forest 71, waters-edge 47, mountain 45, sea 40, urban 37, cave 29,
  rough-terrain 27, rare 10.
- Los gritos existen en `cries.latest` (.ogg).
- Existe el ítem `/item/poke-radar` con sprite, y `radar` y `swarm` como condiciones de encuentro
  (`/encounter-condition`).
- PokéAPI no tiene personajes humanos: la tripulación son Pokémon.

## Confirmado en el andamiaje (12/11, pedidos reales)

### Sprites animados (generaciones 1 a 3)

Probado con 1 (bulbasaur), 25 (pikachu), 150 (mewtwo) y 384 (rayquaza): los cuatro tienen
`sprites.versions["generation-v"]["black-white"].animated.front_default` (GIF). Las URLs responden 200
(`image/gif`, ej. Pikachu 23 958 bytes).

- **Pikachu sí devolvió el sprite animado.** El concepto dice que en la primera prueba no; con esta ruta exacta sí está.
- Los cuatro también tienen `sprites.other.showdown.front_default` (GIF animado de Showdown).
- **Fallback propuesto**, en este orden:
  1. `versions["generation-v"]["black-white"].animated.front_default`
  2. `other.showdown.front_default`
  3. `other["official-artwork"].front_default`
  4. `front_default` (estático)

  Todos pueden ser `null` en el tipo de PokéAPI: el cliente tipado tiene que tratarlos como `string | null`.

- La ficha (`src/lib/pokeapi/detail.ts`) lo separa en dos: el **animado** prueba 1 y después 2; el **quieto** (para
  movimiento reducido) prueba 4 y después 3. El artwork oficial no es pixel art y se ve mal con
  `image-rendering: pixelated`, por eso va último.
- Al principio se probaron 4 especies; el 13/11 se confirmaron las 386 ("Confirmado al armar la ficha", abajo).

### Shiny

Los cuatro tienen `black-white.animated.front_shiny` (ej. `animated/shiny/384.gif`, 200), `front_shiny` estático
(`shiny/150.png`, 200), `other["official-artwork"].front_shiny` y `other.showdown.front_shiny`.

### Tipos con `/type/{nombre}`

Sí sirve. `/type/{nombre}` devuelve `pokemon: [{ pokemon: { name, url }, slot }]`. El id sale del final de la URL y
`slot` (1 o 2) da el orden del tipo.

- Con los 18 tipos (`normal` … `fairy`) se cubren **las 386 especies, sin faltantes**: 204 de un tipo y 182 de dos.
- `/type?limit=100` lista 21: además están `stellar`, `unknown` y `shadow`, con 0 especies entre 1 y 386.
- Son los **tipos actuales**, no los de la generación original. Ej.: Clefairy (35) devuelve `fairy`. Los tipos viejos
  están en `/pokemon/{id}` → `past_types`.
- La respuesta incluye `sprites` con íconos de tipo por generación (ej. `generation-viii/sword-shield`: `name_icon` y
  `symbol_icon`). Sirven para los "íconos de tipos" de la consigna.

### Tripulación

| Id  | Pokémon  | Sprite animado B/W | Sprite estático | Showdown | `cries.latest` |
| --- | -------- | ------------------ | --------------- | -------- | -------------- |
| 479 | Rotom    | sí, 200            | 200             | 200      | 200            |
| 137 | Porygon  | sí, 200            | 200             | 200      | 200            |
| 279 | Pelipper | sí, 200            | 200             | 200      | 200            |
| 178 | Xatu     | sí, 200            | 200             | 200      | 200            |
| 164 | Noctowl  | sí, 200            | 200             | 200      | 200            |
| 441 | Chatot   | sí, 200            | 200             | 200      | 200            |

Los seis también tienen `cries.legacy`.

### Otros

- `/item/poke-radar`: id 408, sprite en `.../sprites/items/poke-radar.png`.
- `/pokemon-habitat/`: `count` 9 (`cave, forest, grassland, mountain, rare, rough-terrain, sea, urban, waters-edge`).

### Open-Meteo

Responde **sin API key**. Pedido:
`https://api.open-meteo.com/v1/forecast?latitude=-40.81&longitude=-62.99&current=temperature_2m,weather_code,is_day,precipitation,snowfall&timezone=auto`
→ HTTP 200 con `current.temperature_2m`, `current.weather_code` (código WMO), `current.is_day`, `precipitation` y
`snowfall`. `timezone=auto` devolvió `America/Argentina/Salta` (GMT-3) para esas coordenadas.

Comprobado al sumar el clima (14/11): con `current=weather_code,temperature_2m`, `current` trae además `time` e
`interval` (900 s), y `current_units` las unidades (`°C`, `wmo code`). Con un `Origin` en el pedido responde
`access-control-allow-origin: *`, y cuenta los pedidos en `x-ratelimit-limit: 600` por ventana de 60 s. Los datos son
CC BY 4.0, con un enlace a Open-Meteo junto a donde se muestran (open-meteo.com/en/licence); el uso gratis es solo no
comercial (open-meteo.com/en/terms).

## Confirmado al armar la ficha (13/11, pedidos reales)

Las 386 especies, pedidas con `fetchPokemonDetail` (`src/lib/pokeapi/detail.ts`: `/pokemon/{id}` y
`/pokemon-species/{id}`, 772 pedidos en 16 s), pasan los guards y traen:

- **Sprite animado B/W** (`versions["generation-v"]["black-white"].animated.front_default`): las 386. El respaldo
  de Showdown no hace falta en ninguna.
- **`front_default`** (quieto): las 386.
- **Descripción en español** (`flavor_text_entries` con `language.name === "es"`): las 386. Traen `\n` en medio de las
  oraciones. La más larga, ya unida con espacios, tiene 230 caracteres.
- **Clase en español** (`genera`, ej. "Pokémon Ratón"): las 386. La más larga: "Pokémon Serpiente Tierra".
- **Estadísticas base:** de 1 a 255; la suma, de 180 a 680. Con los cortes del nivel de amenaza (docs/concepto.md):
  66 Bajo, 159 Medio, 135 Alto y 26 Crítico.
- `/pokemon/386` se llama `deoxys-normal`: el nombre para mostrar sale de `/pokemon-species` → `names` ("Deoxys").
- Compresión: `/pokemon/25` pesa 309 KB en JSON y viaja en 8 KB comprimido; `/pokemon-species/25`, 51 KB y 10 KB.
  Las dos responden con `Access-Control-Allow-Origin: *` y `Cache-Control: public, max-age=86400`.

Nombres oficiales en español, de `names` con `language.name === "es"`:

- Tipos (`/type/{nombre}`): Normal, Lucha, Volador, Veneno, Tierra, Roca, Bicho, Fantasma, Acero, Fuego, Agua,
  Planta, Eléctrico, Psíquico, Hielo, Dragón, Siniestro y Hada.
- Estadísticas (`/stat/{nombre}`): PS, Ataque, Defensa, Ataque Especial, Defensa Especial y Velocidad.

## Pendiente de confirmar

- Formas especiales: `/pokemon/386` es Deoxys forma normal; revisar cómo se muestran Unown (201) y Castform (351).

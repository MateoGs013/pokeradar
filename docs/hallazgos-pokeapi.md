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

- Solo se probaron 4 especies. No se confirmó que las 386 tengan sprite animado; el fallback cubre el caso.

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

## Pendiente de confirmar

- Sprite animado en el resto de las 386 especies (se cubre con el fallback; se puede verificar en el dataset del servidor).
- Formas especiales: `/pokemon/386` es Deoxys forma normal; revisar cómo se muestran Unown (201) y Castform (351).
- Descripción en español en `/pokemon-species/{id}` (`flavor_text_entries` con `language.name === "es"`): no se probó.

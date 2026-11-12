# PokéRadar · Sala de monitoreo

Concepto completo para el desafío técnico de DataInt ("PokéRadar Geoespacial Interactivo").

> **En una frase:** sos el operador de turno de un centro de monitoreo. El territorio está
> cubierto de niebla, el radar la va despejando y cada señal que identificás es un Pokémon
> que entra como alerta, igual que los eventos en la plataforma de DataInt.

---

## 1. Por qué este concepto

- **Habla el idioma de DataInt.** Monitoreo en tiempo real, alertas por prioridad, geocercas,
  niveles de amenaza e informes descargables son funciones de su producto real. Tomás va a
  reconocerlo enseguida.
- **Es una experiencia de descubrimiento literal,** como pide la consigna: el mapa empieza
  oculto y se revela explorando.
- **Convierte los requisitos en parte del juego:** el skeleton es "Analizando firma…", el
  error es "Señal perdida" y la carga inicial es el arranque del sistema.
- **Tiene un dato real detrás:** el Poké Radar existe en PokéAPI como ítem (con sprite) y
  como condición de encuentro (`encounter-condition/radar`). El concepto sale de la API.

### Cómo cubre el MVP obligatorio

| Requisito | Cómo se cumple |
|---|---|
| Mapa interactivo con marcadores personalizados y cámara suave | MapLibre con mundo propio y mapa real; señales con silueta, sprites animados e íconos de tipo; `flyTo` con padding al identificar |
| Datos reales de PokéAPI, panel de detalle, skeleton y errores | Ficha de inteligencia con nombre, tipos, estadísticas y sprite; "Analizando firma…" y "Señal perdida, reintentar" |
| Animaciones con propósito | Barrido del radar, señales pulsantes, niebla que se despeja, ficha que entra, barras de estadísticas que crecen |

### Cómo apunta a la rúbrica

| Criterio | Peso | Qué lo empuja |
|---|---|---|
| Visual, UX y creatividad | 35% | HUD de instrumento, niebla, tripulación, onboarding, mundo propio |
| Fluidez del mapa | 25% | Cámara suave, capas en lugar de cientos de elementos DOM, niebla eficiente |
| Código y arquitectura Next.js | 25% | Mundo y dataset generados en el servidor, interacción en el cliente, TypeScript estricto |
| IA y documentación | 15% | Registro real de correcciones y README con las decisiones |

---

## 2. Onboarding: inicio de turno

Corto, todo preseleccionado y con **"Saltar"** siempre visible. Se muestra solo la primera vez
(se recuerda en el navegador) y se cambia después desde el ícono de ajustes del HUD. Los
links compartidos se lo saltean. Mientras se configura, por detrás se cargan los datos y el
mapa.

1. **Identificación del operador**
   - Nombre en clave, opcional (por defecto "Operador-07").
   - Color del HUD: verde, ámbar o cian.
2. **Zona de operaciones**
   - **Mundo generado** (preseleccionado).
   - **Mi ubicación real:** recién acá se pide el permiso de ubicación, con una línea que
     explica para qué. Si se rechaza, la zona pasa a Río Negro sin errores.
3. **Preferencias del sistema**
   - Sonido: apagado por defecto (los navegadores bloquean el audio hasta que el usuario
     interactúa).
   - Intensidad visual: completa o reducida; por defecto toma `prefers-reduced-motion`.

Con teclado: Enter avanza y Esc saltea. Pensado también para el celular.

**Plan B de una sola pantalla:** zona de operaciones y sonido; el resto, desde el HUD.

---

## 3. Arranque del sistema

Al tocar "Iniciar turno", Rotom inicia el sistema: "Calibrando radar… Conectando satélites…
Cobertura: 0%". Es la pantalla de carga real, contada dentro de la historia, y termina con el
primer barrido del radar sobre el mapa.

---

## 4. El mapa híbrido

Una sola interfaz con dos fuentes de terreno intercambiables. El resto de la app no sabe cuál
está activa: el mundo es solo una fuente de datos.

### Modo principal: mundo generado

Un mundo propio generado por código a partir de una semilla, siempre el mismo:

- Ruido para la altura del terreno. De la altura salen las franjas de mar, costa, llanura,
  bosque y montaña, convertidas en polígonos con líneas de nivel, como un mapa topográfico.
- Se genera una vez en el servidor o al compilar; el navegador recibe el GeoJSON listo.
- Coordenadas inventadas cerca del ecuador, para que la proyección no deforme el mundo.
- Nombres de lugares inventados en el mapa (MapLibre necesita un servidor de tipografías
  público para mostrar texto).

**Cada bioma es un hábitat de PokéAPI** (las 386 especies de las generaciones 1 a 3):

| Hábitat | Bioma del mundo | Especies |
|---|---|---|
| sea | Mar abierto | 40 |
| waters-edge | Costas, lagos y ríos | 47 |
| grassland | Llanuras | 80 |
| forest | Bosques | 71 |
| mountain | Montañas | 45 |
| rough-terrain | Zonas áridas y volcánicas | 27 |
| cave | Las cumbres más altas, con cuevas | 29 |
| urban | Ciudades ubicadas en la llanura | 37 |
| rare | Uno o dos lugares únicos (una isla, un volcán) | 10 |

### Modo secundario: tu ubicación real

El mismo radar proyectado sobre el mapa real de tu zona: OpenFreeMap con un estilo propio
(colores del HUD, niebla y tipografía de instrumento), centrado en tu ubicación o en Río
Negro. Los Pokémon se reparten alrededor según el tipo de terreno cercano o por sorteo con
semilla.

**Para qué está:** demuestra que también sabés trabajar con mapas base reales y
coordenadas, que es el día a día de DataInt.

---

## 5. La interfaz: HUD de instrumento

- **El mapa ocupa toda la pantalla.** La interfaz va encima, en las esquinas:
  - Arriba a la izquierda: nombre del operador, porcentaje de cobertura e identificados del
    turno.
  - Arriba a la derecha: hora y clima.
  - Abajo: el feed de alertas.
  - A un costado (abajo en el celular): la ficha de inteligencia.
- **Estética:** tipografía monoespaciada para los datos, el color elegido sobre fondo
  oscuro, un brillo apenas sugerido. Sobria: se siente un juego sin parecer un juguete.

---

## 6. La mecánica

### Niebla y radar

- Todo el mapa arranca cubierto. Un barrido giratorio despeja la niebla a su alrededor.
- Cada región muestra su porcentaje de cobertura.

### Antenas

- Clic en el mapa para instalar un puesto de radar, con un límite de 3 a 5.
- Un poco de estrategia: dónde ponerlas para cubrir más terreno.

### Señales e identificación

- Lo que detecta el radar aparece como una **señal sin identificar**: silueta y signo de
  pregunta, con un pulso de radar.
- Al tocarla, la cámara vuela hasta ella y empieza la identificación:
  - Cargando: **"Analizando firma…"** (el skeleton de la consigna).
  - Error: **"Señal perdida. Reintentar"** (el estado de error de la consigna).
  - Listo: la silueta se transforma en el sprite animado y se abre la ficha.

### Ficha de inteligencia

Un expediente del Pokémon: sprite animado, nombre y número, tipos, estadísticas base en
barras animadas, altura, peso, descripción de la especie (en español si existe), hábitat y
**nivel de amenaza**.

El nivel de amenaza sale de la suma de estadísticas base:

| Suma | Nivel |
|---|---|
| Menos de 300 | Bajo |
| 300 a 449 | Medio |
| 450 a 579 | Alto |
| 580 o más | Crítico (los legendarios rondan 580 a 680) |

---

## 7. La tripulación: notificaciones con personajes

PokéAPI no tiene personajes humanos, así que la tripulación son Pokémon, con su sprite y su
grito.

| Mensajero | Por qué | Qué avisa |
|---|---|---|
| **Rotom** | Un fantasma eléctrico que vive en los aparatos | El sistema: arranque, radar, cobertura |
| **Porygon** | Pokémon digital, hecho de datos | Análisis completado, nivel de amenaza |
| **Pelipper** | El cartero de los Pokémon | Nuevos avistamientos |
| **Xatu** | Ve el futuro | Pronósticos según el clima |
| **Noctowl** | El vigía nocturno | Toma el relevo de noche |
| **Chatot** | Un loro que imita voces | Avisos de radio, repetidos y graciosos |

- **Prioridades:** informativo, alerta y crítico, como un sistema de monitoreo real.
- **No estorban:** se apilan en una esquina, se silencian, y al tocar una la cámara vuela al
  lugar.

---

## 8. Eventos del mundo

- **Anomalías:** de vez en cuando aparece un shiny (PokéAPI tiene su sprite) con una alerta
  crítica especial. Probabilidad ajustable; para la demo, algo como 1 de cada 64
  identificaciones.
- **Enjambres:** cada tanto una zona se llena de un mismo Pokémon (existe en PokéAPI como
  `swarm`). Lo anuncia Pelipper.
- **Día y noche:** con la hora real del usuario. De noche el mapa se oscurece, Noctowl toma
  la guardia y suben los tipos Fantasma y Siniestro.
- **Clima:** el clima real de tu ciudad (Open-Meteo, sin API key) cambia qué aparece: lluvia
  potencia Agua y Eléctrico, nieve Hielo, sol Fuego. En el mundo generado, el clima es el de
  tu ciudad real. Xatu lo pronostica.

---

## 9. Herramientas del operador

- **Geocercas:** dibujás un área y te avisa de lo que entra. Es literalmente una función de
  DataInt.
- **Bitácora del turno:** todo lo identificado, con hora, lugar y nivel de amenaza.
- **Exportar informe:** el resumen del turno descargable (hoja de impresión a PDF o CSV),
  como los reportes de DataInt.
- **Compartir un avistamiento:** la URL guarda el estado (`?modo=mundo&p=25`). El link abre
  el mapa con ese Pokémon ya identificado y saltea el onboarding.
- **Fin de turno:** un resumen con cobertura, identificados y anomalías.

---

## 10. Sonido

- El grito de cada Pokémon al identificarlo (`cries.latest`, en .ogg).
- Un ping de radar generado por código (Web Audio), sin archivos de audio.
- Control para silenciar siempre a mano, recordado en el navegador.

---

## 11. Teclado

| Tecla | Acción |
|---|---|
| R | Barrido manual del radar |
| A | Instalar antena |
| G | Dibujar geocerca |
| B | Abrir la bitácora |
| M | Silenciar |
| / | Buscar un Pokémon identificado |
| Esc | Cerrar la ficha o el panel abierto |
| ? | Ayuda con los atajos |

---

## 12. Accesibilidad y movimiento

- Cada señal es un `<button>` con `aria-label` ("Señal sin identificar en el bosque norte").
- Foco visible y todo usable con teclado.
- Con movimiento reducido: sin barrido animado ni pulsos, la niebla se despeja sin
  transición y la cámara usa `jumpTo` en lugar de `flyTo`.
- Contraste suficiente en los tres colores del HUD.

---

## 13. Datos de PokéAPI

| Endpoint | Para qué |
|---|---|
| `/pokemon-habitat/{nombre}` | Qué especie va en cada bioma (9 pedidos) |
| `/type/{nombre}` | Los tipos de cada especie (18 pedidos en lugar de 386; a confirmar) |
| `/pokemon/{id}` | Detalle: estadísticas, sprites (incluido shiny), gritos |
| `/pokemon-species/{id}` | Descripción y datos de la especie |
| `/item/poke-radar` | El ícono del radar y el dato curioso del README |

**Verificado:** solo las generaciones 1 a 3 tienen hábitat (386 especies en 9 hábitats); los
gritos existen en `cries.latest`.

**A confirmar:** que todas las especies de las generaciones 1 a 3 tengan sprite animado
(Pikachu no lo devolvió en la primera prueba; definir un sprite de respaldo) y que `/type`
sirva para armar los tipos de los 386 de una vez.

---

## 14. Orden sugerido (vos decidís qué entra)

1. **MVP:** mapa con mundo generado o mapa real, señales, identificación con ficha,
   skeleton, error y animaciones básicas. Deployado.
2. **El núcleo del concepto:** niebla y radar, HUD, onboarding, arranque del sistema.
3. **El híbrido:** el segundo modo de mapa.
4. **La tripulación** y sus notificaciones.
5. **Eventos:** anomalías, enjambres, día y noche, clima.
6. **Herramientas:** bitácora, compartir, informe, geocercas, fin de turno.
7. **Sonido y atajos de teclado.**

Si el tiempo aprieta, se corta desde abajo, y lo que queda afuera va a "Próximos pasos" en el
README.

## 15. Riesgos y plan B

| Riesgo | Plan B |
|---|---|
| El mundo generado lleva más tiempo o no se ve bien | Fijar un horario límite; si no está, el modo principal pasa a ser el mapa real con estilo propio y el concepto sigue igual |
| La niebla se traba al moverse | Resolverla con una capa del mapa (máscara), no con elementos encima; si no rinde, niebla por regiones en lugar de continua |
| OpenFreeMap no responde | Estilo raster de CARTO como respaldo |
| PokéAPI lenta | Dataset generado en el servidor con caché; detalles guardados en memoria |
| Faltan sprites animados | Sprite estático u official-artwork de respaldo |

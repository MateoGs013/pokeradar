# Consigna del desafío (fuente de verdad)

Transcripción fiel del PDF `desafio-tecnico-frontend-jr.pdf` (impreso el 10/11/26, 13:20).
No está resumida ni interpretada. Si algo de este repo choca con este archivo, manda este archivo.
Al final están los datos del mail, que no figuran en el PDF. En esta copia pública se omitió el mail de contacto.

---

**DataInt**
INGENIERÍA DE SOFTWARE • VISUALIZACIÓN GEOESPACIAL

- **Posición:** Frontend Engineer (Junior)
- **Mentor:** Tomás Plevak (Tech Lead)
- **Ventana:** 72 horas corridas

## Desafío Técnico Asíncrono: PokéRadar Geoespacial Interactivo

**Stack Obligatorio:** Next.js (App Router) · TypeScript Estricto · Tailwind CSS · MapLibre GL / Leaflet · Framer Motion

## 1. La Experiencia que Esperamos que Construyas

**Imaginá una aplicación que permita explorar el mundo Pokémon a través de un mapa interactivo.** Al ingresar, el
usuario podrá recorrer distintas regiones geográficas y descubrir Pokémon distribuidos sobre el terreno. Al seleccionar uno,
podrá conocer sus características, estadísticas y otros detalles relevantes.

Queremos que la exploración se sienta **fluida, intuitiva y visualmente atractiva**. El mapa no debe ser simplemente una
imagen estática de fondo sobre la cual colocar marcadores, sino **el elemento central de una experiencia de
descubrimiento**.

El desafío consiste en transformar los datos de la PokéAPI en una experiencia geoespacial coherente y entretenida. Como la
API no proporciona ubicaciones reales, tendrás libertad para imaginar cómo se distribuyen los Pokémon y qué lógica
justifica su aparición en distintas ubicaciones (por clima, por biomas, por zonas geográficas de Argentina o del mundo, o
simulación de radar).

> 💡 **Filosofía del Desafío • Uso Libre de Inteligencia Artificial**
>
> ¡Felicitaciones por llegar a esta etapa! Tu postulación quedó seleccionada entre más de 100 candidatos por tu base técnica,
> curiosidad y buen ojo visual.
>
> En **DataInt** no evaluamos memoria de sintaxis ni hacemos Live Coding. **El uso de asistentes de IA (Cursor, Claude, Copilot,
> ChatGPT, v0) está 100% permitido e incentivado**. Evaluamos tu sensibilidad estética (UX/UI), tu criterio arquitectónico y tu
> capacidad de auditar y dirigir a la IA.

## 2. Requerimientos Nucleares (MVP Obligatorio)

Para respetar tu tiempo (**dedicación estimada de 3 a 4 horas efectivas**), estos son los 3 puntos indispensables que
evaluaremos:

- **1. Mapa Interactivo Navegable:** Renderizado de un mapa interactivo (usando `MapLibre GL JS`, `OpenFreeMap`, `CARTO` o
  `Leaflet`) con marcadores personalizados (sprites animados, íconos de tipos) y navegación suave de cámara (`flyTo` o
  centrado suave al seleccionar).
- **2. Consumo Real de Datos y Panel de Detalle:** Consumo dinámico de PokéAPI con un drawer lateral, modal o tarjeta
  flotante que muestre la información detallada de la criatura (nombre, tipos, estadísticas base, sprite o animación), con
  manejo prolijo de estados de carga (skeletons) y errores.
- **3. Animaciones con Propósito (UX/UI):** Incorporar animaciones que aporten a la fluidez visual (ej. marcadores pulsantes
  estilo radar, transiciones de paneles con `Framer Motion` o CSS, barras de estadísticas animadas).

## 3. Tip Técnico: Mapas en Next.js App Router (Evitá este error)

En Next.js App Router, las librerías de mapas acceden al objeto global `window`. Si se ejecutan en el servidor, arrojan el error
`window is not defined`. Para resolverlo de forma limpia:

```tsx
import dynamic from "next/dynamic";

// 1. Marca el componente del mapa con "use client";
// 2. Impórtalo dinámicamente desactivando el SSR:
const MapView = dynamic(
  () => import("@/components/map/map-view").then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="h-[450px] w-full flex items-center justify-center bg-slate-900 text-slate-400">
        Cargando mapa interactivo...
      </div>
    ),
  }
);
```

## 4. Menú Creativo Abierto: "Sorprendenos" (Libertad Total)

Una vez cubierto el MVP obligatorio, **tenés libertad absoluta para sumar todo lo que quieras al proyecto**. No hay límite
ni techo para tu creatividad. Ideas disparadoras sugeridas:

- 🌦 **Clima en Tiempo Real (Open-Meteo):** Cruzar el clima real de una ciudad para que determine qué tipos de Pokémon
  aparecen allí (lluvia → Agua/Eléctrico; nieve → Hielo; sol → Fuego).
- 🗺 **Biomas Geográficos:** Mapear hábitats (`cave`, `forest`, `mountain`, `sea`, `urban`) a zonas de Argentina o del mundo
  (Glaciar Perito Moreno, Cataratas del Iguazú, Cordillera, Buenos Aires).
- 🔊 **Experiencia Sonora:** Reproducir el sonido original del Pokémon (`cries.latest` de PokéAPI en formato `.ogg`) al
  seleccionarlo o descubrirlo.
- 🎒 **Equipo de Expedición:** Un dock o panel flotante para "capturar" o guardar hasta 6 Pokémon favoritos durante el
  recorrido.
- ⚡ **Filtros Avanzados:** Filtrar por tipo, generación o rango de estadísticas con microinteracciones cuidadas.

## 5. Kit de Recursos 100% Gratuitos (Sin Tarjetas ni API Keys)

| Recurso | URL / Acceso | Utilidad Principal |
|---|---|---|
| **PokéAPI v2** | `https://pokeapi.co/` | Endpoints REST sin auth: `/pokemon/{id}`, `/pokemon-habitat/{id}`, sprites animados y audios. |
| **OpenFreeMap** | `https://openfreeMap.org/` | Tiles vectoriales ultra rápidos basados en MapLibre GL sin API key (`https://tiles.openfreemap.org/styles/liberty` o `/dark`). |
| **CARTO Basemaps** | `https://carto.com/basemaps/` | Tiles raster gratuitos ideales para Leaflet (`dark-matter`, `voyager`, `positron`). |
| **Open-Meteo API** | `https://open-meteo.com/` | API de clima en tiempo real 100% libre sin API key. |

## 6. Estructura Requerida en tu README.md

El `README.md` de tu repositorio es fundamental. Te pedimos que incluyas estas 4 secciones:

1. **Concepto y Narrativa:** ¿Qué enfoque o idea creativa elegiste para tu PokéRadar y qué valor aporta a la UX?
2. **Arquitectura y Stack:** ¿Qué librerías elegiste y cómo organizaste tus carpetas y componentes?
3. **Uso de Inteligencia Artificial (AI-Native Workflow):** ¿Qué herramientas usaste (Cursor, Claude, v0, etc.)? ¿Para qué
   tareas te apoyaste en ellas? *Punto clave: ¿En qué momentos la IA se equivocó o alucinó, y cómo interveniste vos para
   corregirla?*
4. **Próximos Pasos:** Si tuvieras 1 semana más, ¿qué mejoras técnicas o de producto agregarías?

## 7. Criterios de Evaluación & Ponderación

| Criterio | Peso | Qué observamos |
|---|---|---|
| **Sensibilidad Visual, UX y Creatividad** | 35% | Buen gusto estético, diseño responsivo (mobile y desktop), coherencia de diseño y originalidad. |
| **Fluidez del Mapa e Interacciones** | 25% | Navegación suave, animaciones con sentido, transiciones de cámara sin bloqueos. |
| **Calidad de Código y Arquitectura Next.js** | 25% | Código limpio, TypeScript estricto (sin `any`), separación clara Server vs Client Components. |
| **Criterio de Uso de IA y Documentación** | 15% | Honestidad, espíritu crítico para auditar código generado por IA y claridad del README. |

## 8. Plazo y Forma de Entrega

- **Ventana de entrega: 72 horas corridas** desde el momento de inicio acordado (dedicación esperada: ~3 a 4 horas).
- **Mecanismo de entrega:** Respondé directamente al mismo hilo de correo antes de que finalice tu ventana con:
  1. **Enlace al repositorio público en GitHub** (con el `README.md` completo).
  2. **Enlace a la aplicación desplegada y funcional en producción** (en Vercel o Netlify).

DataInt • Plataforma de Inteligencia de Datos y Visualización Geoespacial · Contacto: Tomás Plevak

---

## Datos del mail (no están en el PDF)

- **Entrega:** domingo 15/11 a las 10:00 (hora Argentina). El cierre de trabajo propio es el sábado 14/11.
- **Forma:** se responde el mismo mail con el repo público de GitHub (README completo) y la app deployada en Vercel.
- **IA:** el uso de IA está permitido e incentivado; evalúan cómo se la audita y se la dirige.
- **Disponibilidad:** al menos 48 h de trabajo hasta el cierre del sábado. Las 3–4 h de la consigna son la
  estimación del MVP, no un límite.

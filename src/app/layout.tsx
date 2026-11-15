import type { Metadata } from "next";
import {
  Atkinson_Hyperlegible_Next,
  Big_Shoulders,
  Doto,
  Martian_Mono,
} from "next/font/google";

import { REDUCED_MOTION_QUERY } from "@/lib/motion";
import { HUD_COLORS, MOTION_LEVELS, SHIFT_STORAGE_KEY } from "@/lib/shift";

import "./globals.css";

// Las voces de la sala (docs/decisiones.md, "Tipografía"): tres para la interfaz y una, la del
// afiche, para el título y las cifras de la hoja. Las cuatro son variables: no hace falta listar
// pesos.

/**
 * Para leer: descripciones y mensajes. next/font no tiene sus métricas, así que no arma solo la
 * fuente de respaldo como con las otras dos: si no carga, o mientras carga, va la del sistema.
 */
const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  fallback: ["system-ui", "arial"],
});

/** La voz del sistema: datos, rótulos y el mapa. Con su eje de ancho (`font-stretch`). */
const martianMono = Martian_Mono({
  variable: "--font-martian-mono",
  subsets: ["latin"],
  axes: ["wdth"],
});

/** Matriz de puntos, solo para lo grande: el nombre identificado y "Señal perdida". */
const doto = Doto({
  variable: "--font-doto",
  subsets: ["latin"],
  axes: ["ROND"],
});

/**
 * La voz del afiche: una gótica condensada y pesada, de cartel, para el título de la hoja y sus
 * cifras. Solo en grande. next/font no tiene sus métricas (lo avisa al compilar), así que no arma
 * sola la fuente de respaldo: si no carga, va una condensada del sistema.
 */
const bigShoulders = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin"],
  adjustFontFallback: false,
  fallback: ["Impact", "Haettenschweiler", "Arial Narrow", "sans-serif"],
});

export const metadata: Metadata = {
  title: "PokéRadar",
  description: "Sala de monitoreo geoespacial de señales Pokémon.",
};

/**
 * Aplica el color del HUD guardado y la intensidad visual (lib/motion.ts: la guardada o, si no hay,
 * la del sistema) antes del primer cuadro: el navegador corre un script del <head>
 * mientras lee el HTML, antes de pintar (node_modules/next/dist/docs, "How to prevent flash before
 * hydration", sección "Themes"). next/script con beforeInteractive no sirve para esto: en el App
 * Router lo corre Next cuando ya cargó su JS. Valida lo mismo que el hook (use-shift-settings.ts):
 * si lo guardado no sirve, queda el verde y se abre el inicio de turno. Va dentro de una función que
 * se llama sola, para que sus variables no queden globales en `window`.
 */
const applyStoredSettings = `(function () {
var root = document.documentElement;
root.dataset.motion = matchMedia(${JSON.stringify(REDUCED_MOTION_QUERY)}).matches ? "reducida" : "completa";
try {
  var shift = JSON.parse(localStorage.getItem(${JSON.stringify(SHIFT_STORAGE_KEY)}));
  if (shift && typeof shift.operator === "string" && ${JSON.stringify(HUD_COLORS)}.indexOf(shift.hud) >= 0) {
    root.dataset.hud = shift.hud;
    if (${JSON.stringify(MOTION_LEVELS)}.indexOf(shift.motion) >= 0) root.dataset.motion = shift.motion;
  }
} catch (error) {}
})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      data-hud="verde"
      // El script del <head> puede cambiar data-hud y pone data-motion antes de hidratar.
      suppressHydrationWarning
      className={`${atkinson.variable} ${martianMono.variable} ${doto.variable} ${bigShoulders.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: applyStoredSettings }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

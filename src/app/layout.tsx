import type { Metadata } from "next";
import {
  Atkinson_Hyperlegible_Next,
  Doto,
  Martian_Mono,
} from "next/font/google";

import { HUD_COLORS, SHIFT_STORAGE_KEY } from "@/lib/shift";

import "./globals.css";

// Las tres voces del HUD (docs/decisiones.md, "Tipografía"). Las tres son variables: no hace
// falta listar pesos.

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

export const metadata: Metadata = {
  title: "PokéRadar",
  description: "Sala de monitoreo geoespacial de señales Pokémon.",
};

/**
 * Aplica el color del HUD guardado antes del primer cuadro: el navegador corre un script del <head>
 * mientras lee el HTML, antes de pintar (node_modules/next/dist/docs, "How to prevent flash before
 * hydration", sección "Themes"). next/script con beforeInteractive no sirve para esto: en el App
 * Router lo corre Next cuando ya cargó su JS. Valida lo mismo que el hook (use-shift-settings.ts):
 * si lo guardado no sirve, queda el verde y se abre el inicio de turno.
 */
const applyStoredHud = `try {
  var shift = JSON.parse(localStorage.getItem(${JSON.stringify(SHIFT_STORAGE_KEY)}));
  if (shift && typeof shift.operator === "string" && ${JSON.stringify(HUD_COLORS)}.indexOf(shift.hud) >= 0) {
    document.documentElement.dataset.hud = shift.hud;
  }
} catch (error) {}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      data-hud="verde"
      // El script del <head> puede cambiar data-hud antes de hidratar.
      suppressHydrationWarning
      className={`dark ${atkinson.variable} ${martianMono.variable} ${doto.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: applyStoredHud }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

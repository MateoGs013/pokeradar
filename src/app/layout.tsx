import type { Metadata } from "next";
import {
  Atkinson_Hyperlegible_Next,
  Doto,
  Martian_Mono,
} from "next/font/google";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      data-hud="verde"
      className={`dark ${atkinson.variable} ${martianMono.variable} ${doto.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

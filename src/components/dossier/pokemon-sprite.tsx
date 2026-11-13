"use client";

// El sprite de un Pokémon: el GIF animado, y con movimiento reducido el sprite quieto. Lo usan la
// ficha (96 px) y la señal identificada en el mapa (40 px).
import { cn } from "cn";
import { useReducedMotion } from "motion/react";
import Image from "next/image";

import type { PokemonDetail } from "@/lib/pokeapi/detail";

interface PokemonSpriteProps {
  sprites: PokemonDetail["sprites"];
  /** Lado en píxeles: el tamaño del lugar que ocupa, para que no se corra nada al cargar. */
  size: number;
  className?: string;
}

export function PokemonSprite({
  sprites,
  size,
  className,
}: PokemonSpriteProps) {
  const reducedMotion = useReducedMotion();
  const src = reducedMotion
    ? (sprites.still ?? sprites.animated)
    : (sprites.animated ?? sprites.still);
  if (!src) return null;
  // `unoptimized`: la imagen llega tal cual de PokéAPI. Un GIF animado no gana nada con el
  // optimizador de Next (docs de Next, 02-components/image.md, `unoptimized`), y así no hace falta
  // habilitar el dominio en next.config. Sin texto alternativo: el nombre ya está escrito al lado,
  // en la ficha, o en el aria-label de la señal, en el mapa.
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      unoptimized
      className={cn("object-contain [image-rendering:pixelated]", className)}
    />
  );
}

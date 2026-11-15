// Un PNG mínimo, sin dependencias: lo justo para guardar el relieve pintado (relief.ts).
// Formato: la firma, y tres bloques (IHDR con el tamaño, IDAT con los píxeles comprimidos, IEND).
import "server-only";

import { deflateSync } from "node:zlib";

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** Bytes por píxel: rojo, verde, azul y opacidad. */
const CHANNELS = 4;

/** Un PNG de 8 bits por canal a partir de los píxeles RGBA, fila por fila desde arriba. */
export function encodePng(
  width: number,
  height: number,
  rgba: Uint8Array,
): Buffer {
  // Cada fila lleva adelante el número de su filtro. Con "Sub" (1), cada byte guarda la diferencia
  // con el mismo canal del píxel de la izquierda: en una imagen de degradés quedan números chicos y
  // repetidos, que deflate comprime mejor que los colores tal cual (medido con el relieve de la
  // semilla 151, de 1600 × 1200: 900 KB contra 1489 KB sin filtro).
  const stride = width * CHANNELS;
  const rows = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (stride + 1);
    rows[row] = 1;
    for (let x = 0; x < stride; x++) {
      const value = rgba[y * stride + x] ?? 0;
      const left = x >= CHANNELS ? (rgba[y * stride + x - CHANNELS] ?? 0) : 0;
      rows[row + 1 + x] = (value - left) & 0xff;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bits por canal
  header[9] = 6; // tipo de color: RGB con opacidad
  return Buffer.concat([
    Buffer.from(SIGNATURE),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Un bloque del PNG: el largo de los datos, el tipo, los datos y el CRC del tipo y los datos. */
function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const check = Buffer.alloc(4);
  check.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, check]);
}

/**
 * CRC-32, el control de errores que pide PNG (el mismo de zip): bit por bit, con el polinomio
 * 0xEDB88320. Propio y no `zlib.crc32`: así no depende de que el Node que compila lo traiga.
 */
function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

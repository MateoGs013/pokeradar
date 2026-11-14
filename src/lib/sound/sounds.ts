// Los sonidos de la sala (docs/concepto.md, "Sonido"): el ping del radar, generado con Web Audio y
// sin archivos, y el grito de cada Pokémon al identificarlo. Solo suenan si el operador prendió el
// sonido; los navegadores, además, no dejan sonar nada hasta que la persona toca la página.

let context: AudioContext | null = null;

/**
 * Un ping de sonar: un tono que baja de 1320 a 880 Hz y se apaga en 0,4 s. El volumen sube en 10 ms
 * en lugar de arrancar de golpe, que haría un clic.
 */
export function playPing() {
  context ??= new AudioContext();
  // Un contexto creado antes de que la persona toque la página arranca suspendido.
  if (context.state === "suspended") void context.resume();
  const now = context.currentTime;
  const tone = context.createOscillator();
  tone.type = "sine";
  tone.frequency.setValueAtTime(1320, now);
  tone.frequency.exponentialRampToValueAtTime(880, now + 0.25);
  const volume = context.createGain();
  volume.gain.setValueAtTime(0.0001, now);
  volume.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
  volume.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
  tone.connect(volume).connect(context.destination);
  tone.start(now);
  tone.stop(now + 0.45);
}

/**
 * El grito de la especie (`/pokemon/{id}`, `cries.latest`, un .ogg). Si el navegador no lo puede
 * reproducir o todavía no deja sonar nada, no pasa nada: el sonido acompaña, no informa.
 */
export function playCry(url: string) {
  const audio = new Audio(url);
  audio.volume = 0.4;
  audio.play().catch(() => {});
}

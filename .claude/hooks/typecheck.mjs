// Hook Stop: cuando Claude termina su turno, corre `pnpm typecheck`.
// Si falla, imprime los errores por stderr y sale con código 2: Claude no se
// detiene y recibe los errores para corregirlos.
// Si stop_hook_active es true, Claude ya está continuando por este hook:
// salimos con 0 para no entrar en un bucle infinito.
// Doc: https://code.claude.com/docs/en/hooks (Stop, stop_hook_active).
import { spawnSync } from "node:child_process";

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);

/** @type {{ stop_hook_active?: unknown }} */
const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
if (input.stop_hook_active === true) process.exit(0);

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
// shell: true porque en Windows pnpm es un .cmd y Node no lo ejecuta sin shell.
const result = spawnSync("pnpm typecheck", {
  cwd: projectDir,
  encoding: "utf8",
  shell: true,
});

if (result.status !== 0) {
  process.stderr.write(
    `pnpm typecheck falló:\n${result.stdout}${result.stderr}`,
  );
  process.exit(2);
}

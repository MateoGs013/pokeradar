// Hook PostToolUse: después de que Claude edita o escribe un archivo .ts/.tsx,
// corre ESLint solo sobre ese archivo. Si hay errores, los imprime por stderr y
// sale con código 2: Claude Code le muestra ese stderr a Claude como contexto.
// Doc: https://code.claude.com/docs/en/hooks (PostToolUse, exit code 2).
import { spawnSync } from "node:child_process";
import { join, relative, isAbsolute } from "node:path";

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);

/** @type {{ tool_input?: { file_path?: unknown }, cwd?: unknown }} */
const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
const filePath = input.tool_input?.file_path;
if (typeof filePath !== "string" || !/\.(ts|tsx)$/.test(filePath))
  process.exit(0);

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const rel = relative(projectDir, filePath);
// Fuera del proyecto o en carpetas generadas: no se lintea.
if (
  rel.startsWith("..") ||
  isAbsolute(rel) ||
  /^(node_modules|\.next)[\\/]/.test(rel)
) {
  process.exit(0);
}

const eslintBin = join(
  projectDir,
  "node_modules",
  "eslint",
  "bin",
  "eslint.js",
);
const result = spawnSync(
  process.execPath,
  [eslintBin, "--no-warn-ignored", filePath],
  {
    cwd: projectDir,
    encoding: "utf8",
  },
);

if (result.status !== 0) {
  process.stderr.write(
    `ESLint encontró problemas en ${rel}:\n${result.stdout}${result.stderr}`,
  );
  process.exit(2);
}

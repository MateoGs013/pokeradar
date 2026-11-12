// Captura la app en varios anchos y junta los errores de consola, sin dependencias.
//
// 1. Levanta el build de producción (`next start` en el puerto 3100) como proceso
//    hijo propio, sin pnpm ni shell, para poder cerrarlo seguro al final.
// 2. Abre Chrome (o Edge) headless con el puerto de depuración y se conecta por el
//    protocolo de DevTools (CDP) con el WebSocket que trae Node 22+.
// 3. Por cada ancho: fija el viewport, carga la página, espera, guarda un PNG y
//    registra los errores de consola.
// 4. En el `finally` cierra Chrome y el servidor, pase lo que pase.
//
// Uso (desde la raíz, después de `pnpm build`):
//   node .claude/skills/verificar/capturar.mjs [ruta] [carpeta-salida]
//   ruta relativa a la raíz (por defecto la home; ej. "?modo=mundo&p=25"),
//   carpeta por defecto ./.verificar
// Para capturar una URL externa sin levantar servidor: VERIFICAR_URL=<url>.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const PUERTO_APP = 3100;
const PUERTO_CDP = 9333;
const ESPERA_MS = 4000; // tiempo para que hidrate y corran las animaciones de entrada
const ANCHOS = [
  { ancho: 390, alto: 844, mobile: true },
  { ancho: 768, alto: 1024, mobile: true },
  { ancho: 1440, alto: 900, mobile: false },
];

const urlExterna = process.env.VERIFICAR_URL;
const ruta = process.argv[2] ?? "";
// Git Bash convierte un argumento "/algo" en "C:/Program Files/Git/algo": se rechaza.
if (/^[A-Za-z]:/.test(ruta)) {
  console.error(
    `Ruta inválida "${ruta}". En Git Bash pasala sin "/" inicial (ej. "?modo=mundo&p=25").`,
  );
  process.exit(1);
}
const url = urlExterna ?? new URL(ruta, `http://localhost:${PUERTO_APP}/`).href;
const outDir = resolve(process.argv[3] ?? ".verificar");

const navegador = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find((ruta) => typeof ruta === "string" && existsSync(ruta));
if (!navegador) {
  console.error("No encontré Chrome ni Edge. Definí CHROME_PATH.");
  process.exit(1);
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function responde(direccion) {
  try {
    await fetch(direccion);
    return true;
  } catch {
    return false;
  }
}

// Reintenta hasta que la función devuelva algo distinto de undefined.
async function esperarHasta(fn, intentos, mensaje) {
  for (let i = 0; i < intentos; i++) {
    const valor = await fn();
    if (valor !== undefined) return valor;
    await esperar(250);
  }
  throw new Error(mensaje);
}

let servidor;
let chrome;
let ws;
try {
  if (!urlExterna) {
    // Si el puerto ya responde, es un servidor viejo: capturaría otro build.
    if (await responde(`http://localhost:${PUERTO_APP}`)) {
      throw new Error(
        `El puerto ${PUERTO_APP} ya está ocupado: cerrá ese servidor y reintentá.`,
      );
    }
    const nextBin = join(
      process.cwd(),
      "node_modules",
      "next",
      "dist",
      "bin",
      "next",
    );
    servidor = spawn(
      process.execPath,
      [nextBin, "start", "--port", String(PUERTO_APP)],
      {
        stdio: "ignore",
      },
    );
    await esperarHasta(
      async () => ((await responde(url)) ? true : undefined),
      120,
      "next start no respondió en 30 s (¿corriste pnpm build?)",
    );
  }

  mkdirSync(outDir, { recursive: true });
  const perfil = mkdtempSync(join(tmpdir(), "verificar-"));
  chrome = spawn(navegador, [
    "--headless=new",
    `--remote-debugging-port=${PUERTO_CDP}`,
    `--user-data-dir=${perfil}`,
    "--no-first-run",
    "--hide-scrollbars",
    "about:blank",
  ]);

  const wsUrl = await esperarHasta(
    async () => {
      try {
        const tabs = await (
          await fetch(`http://127.0.0.1:${PUERTO_CDP}/json/list`)
        ).json();
        return tabs.find((t) => t.type === "page")?.webSocketDebuggerUrl;
      } catch {
        return undefined; // Chrome todavía no levantó.
      }
    },
    40,
    "Chrome no expuso el puerto de depuración",
  );

  ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));

  let siguienteId = 1;
  const pendientes = new Map();
  const consola = [];
  ws.addEventListener("message", (evento) => {
    const msg = JSON.parse(String(evento.data));
    if (msg.id && pendientes.has(msg.id)) {
      pendientes.get(msg.id)(msg);
      pendientes.delete(msg.id);
      return;
    }
    if (
      msg.method === "Runtime.consoleAPICalled" &&
      ["error", "warning"].includes(msg.params.type)
    ) {
      const texto = msg.params.args
        .map((a) => a.value ?? a.description ?? "")
        .join(" ");
      consola.push(`[console.${msg.params.type}] ${texto}`);
    }
    if (msg.method === "Runtime.exceptionThrown") {
      const d = msg.params.exceptionDetails;
      consola.push(`[excepción] ${d.exception?.description ?? d.text}`);
    }
    if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") {
      consola.push(
        `[log] ${msg.params.entry.text} ${msg.params.entry.url ?? ""}`,
      );
    }
  });

  const cdp = (method, params = {}) => {
    const id = siguienteId++;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((r) => pendientes.set(id, r));
  };

  await cdp("Runtime.enable");
  await cdp("Log.enable");
  await cdp("Page.enable");

  const resumen = [];
  for (const { ancho, alto, mobile } of ANCHOS) {
    const desde = consola.length;
    await cdp("Emulation.setDeviceMetricsOverride", {
      width: ancho,
      height: alto,
      deviceScaleFactor: 1,
      mobile,
    });
    await cdp("Page.navigate", { url });
    await esperar(ESPERA_MS);
    const medida = await cdp("Runtime.evaluate", {
      expression:
        "JSON.stringify([innerWidth, document.documentElement.scrollWidth])",
      returnByValue: true,
    });
    const [anchoReal, anchoScroll] = JSON.parse(medida.result.result.value);
    const foto = await cdp("Page.captureScreenshot", { format: "png" });
    const archivo = join(outDir, `captura-${ancho}.png`);
    writeFileSync(archivo, Buffer.from(foto.result.data, "base64"));
    resumen.push({
      ancho,
      anchoReal,
      desbordaHorizontal: anchoScroll > anchoReal,
      archivo,
      errores: consola.slice(desde),
    });
  }

  console.log(JSON.stringify({ url, resumen }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  ws?.close();
  chrome?.kill();
  servidor?.kill();
}

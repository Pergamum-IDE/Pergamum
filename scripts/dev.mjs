import { spawn, execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import electronPath from "electron";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function localBin(name) {
  const executable = process.platform === "win32" ? `${name}.cmd` : name;
  return path.join(rootDir, "node_modules", ".bin", executable);
}

execFileSync(localBin("tsc"), ["-p", "tsconfig.main.json"], {
  cwd: rootDir,
  stdio: "inherit"
});

const server = await createServer({
  configFile: path.join(rootDir, "vite.config.mts"),
  mode: "development"
});

await server.listen();
server.printUrls();

const localUrl =
  server.resolvedUrls?.local[0] ??
  `http://127.0.0.1:${server.config.server.port ?? 5173}/`;

const electronEnv = {
  ...process.env,
  VITE_DEV_SERVER_URL: localUrl
};

delete electronEnv.ELECTRON_RUN_AS_NODE;

const electronProcess = spawn(electronPath, ["."], {
  cwd: rootDir,
  env: electronEnv,
  stdio: ["ignore", "inherit", "inherit"]
});

let shuttingDown = false;

async function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  electronProcess.kill();
  await server.close();
  process.exit(exitCode);
}

electronProcess.on("exit", (code) => {
  void shutdown(code ?? 0);
});

process.on("SIGINT", () => {
  void shutdown(0);
});

process.on("SIGTERM", () => {
  void shutdown(0);
});

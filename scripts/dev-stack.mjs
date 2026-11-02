import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const commands = [
  { label: "GraphQL backend", args: ["run", "dev:backend"] },
  { label: "Vite frontend", args: ["run", "dev"] },
];
let shuttingDown = false;

const children = commands.map(({ label, args }) => {
  const child = spawn(npmCommand, args, {
    cwd: repositoryRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  child.on("error", (error) => {
    console.error(`[${label}] Unable to start: ${error.message}`);
    process.exitCode = 1;
    stopChildren("SIGTERM");
  });
  child.on("exit", (code) => {
    if (shuttingDown) return;
    if (code !== 0) process.exitCode = code ?? 1;
    stopChildren("SIGTERM");
  });
  return child;
});

function stopChildren(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill(signal);
  }
}

process.once("SIGINT", () => stopChildren("SIGINT"));
process.once("SIGTERM", () => stopChildren("SIGTERM"));

import { spawn, spawnSync } from "node:child_process";

const args = process.argv.slice(2);
let stopping = false;

function pnpmInvocation(commandArgs) {
  if (process.platform !== "win32") {
    return {
      command: "pnpm",
      args: commandArgs,
    };
  }

  return {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", ["pnpm", ...commandArgs].join(" ")],
  };
}

function run(commandArgs) {
  const invocation = pnpmInvocation(commandArgs);

  return spawnSync(invocation.command, invocation.args, {
    stdio: "inherit",
  });
}

function stopServer() {
  if (stopping) return;
  stopping = true;
  run(["exec", "astro", "dev", "stop"]);
}

process.on("SIGINT", () => {
  stopServer();
  process.exit(130);
});

process.on("SIGTERM", () => {
  stopServer();
  process.exit(143);
});

process.on("exit", stopServer);

const devCommand = pnpmInvocation(["exec", "astro", "dev", "--background", ...args]);
const dev = spawn(devCommand.command, devCommand.args, {
  stdio: "inherit",
});

dev.on("exit", (code) => {
  if (code && code !== 0) process.exit(code);
});

setInterval(() => {}, 1000);

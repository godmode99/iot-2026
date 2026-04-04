import { spawn } from "node:child_process";

const processes = [
  {
    name: "backend",
    command: "pnpm",
    args: ["--dir", "backend", "dev"],
  },
  {
    name: "dashboard",
    command: "pnpm",
    args: ["--dir", "dashboard", "dev"],
  },
];

const children = processes.map(({ name, command, args }) => {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: true,
  });
  child.on("exit", (code) => {
    if (code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
    }
  });
  return child;
});

const shutdown = () => {
  for (const child of children) {
    child.kill("SIGINT");
  }
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);


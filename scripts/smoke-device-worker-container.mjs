import { spawnSync } from "node:child_process";

const containerName = "iot-2026-device-worker-smoke";
const imageName = process.env.DEVICE_WORKER_IMAGE ?? "iot-2026-device-worker:local";
const envFile = process.env.DEVICE_WORKER_ENV_FILE ?? ".env.staging.local";
const port = process.env.DEVICE_WORKER_PORT ?? "8080";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.stdio ?? "pipe"
  });

  if (result.status !== 0 && !options.allowFailure) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`${command} ${args.join(" ")} failed\n${output}`);
  }

  return result;
}

function docker(args, options = {}) {
  return run("docker", args, options);
}

async function waitForHealth() {
  const url = `http://localhost:${port}/health`;
  let lastError = null;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(url);
      const body = await response.json();
      if (response.ok && body?.ok === true) {
        return body;
      }
      lastError = new Error(`health returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw lastError ?? new Error("health check timed out");
}

async function main() {
  docker(["rm", "-f", containerName], { allowFailure: true });

  const started = docker([
    "run",
    "-d",
    "--name",
    containerName,
    "--env-file",
    envFile,
    "-p",
    `${port}:8080`,
    imageName
  ]);

  try {
    const containerId = started.stdout.trim();
    const health = await waitForHealth();
    console.log("[worker-smoke] passed", JSON.stringify({
      image: imageName,
      containerId: containerId.slice(0, 12),
      service: health.service,
      ok: health.ok,
      missingEnv: health.missingEnv ?? []
    }, null, 2));
  } finally {
    const logs = docker(["logs", "--tail", "80", containerName], { allowFailure: true });
    if (logs.stdout.trim()) {
      console.log("[worker-smoke] logs\n" + logs.stdout.trim());
    }
    docker(["rm", "-f", containerName], { allowFailure: true });
  }
}

main().catch((error) => {
  console.error("[worker-smoke] failed", error.message);
  docker(["logs", "--tail", "80", containerName], { allowFailure: true, stdio: "inherit" });
  docker(["rm", "-f", containerName], { allowFailure: true });
  process.exitCode = 1;
});

import { readFile } from "node:fs/promises";

import * as core from "@actions/core";

import { parseMaxAgeSeconds, validateHeartbeat } from "./heartbeat.js";

async function run() {
  try {
    const path = core.getInput("path", { required: true });
    const maxAgeSeconds = parseMaxAgeSeconds(core.getInput("max-age-seconds"));
    const heartbeat = JSON.parse(await readFile(path, "utf8"));
    const result = validateHeartbeat(heartbeat, { maxAgeSeconds });

    core.setOutput("last-run", result.lastRun);
    core.setOutput("age-seconds", Math.floor(result.ageSeconds).toString());
    core.info(
      `${result.check} heartbeat is healthy: last full success ${Math.floor(result.ageSeconds)}s ago`,
    );
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

await run();

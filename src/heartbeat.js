const DEFAULT_MAX_AGE_SECONDS = 48 * 60 * 60;

export function parseMaxAgeSeconds(raw) {
  if (raw === undefined || raw === "") return DEFAULT_MAX_AGE_SECONDS;

  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("max-age-seconds must be a positive number");
  }
  return value;
}

function parseTimestamp(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a non-empty timestamp string`);
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`${field} is not a valid timestamp: ${value}`);
  }
  return timestamp;
}

export function validateHeartbeat(
  heartbeat,
  { maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS, now = Date.now() } = {},
) {
  if (!heartbeat || typeof heartbeat !== "object" || Array.isArray(heartbeat)) {
    throw new Error("heartbeat must be a JSON object");
  }

  const lastRun = parseTimestamp(heartbeat.last_run, "last_run");
  const lastSuccess = parseTimestamp(
    heartbeat.last_all_success,
    "last_all_success",
  );
  const futureToleranceMs = 5 * 60 * 1000;

  if (lastRun > now + futureToleranceMs) {
    throw new Error("last_run is more than 5 minutes in the future");
  }
  if (lastSuccess > lastRun) {
    throw new Error("last_all_success cannot be later than last_run");
  }

  const failedDetectors = heartbeat.failed_detectors;
  if (failedDetectors !== undefined && !Array.isArray(failedDetectors)) {
    throw new Error("failed_detectors must be an array when present");
  }
  if (failedDetectors?.length) {
    throw new Error(
      `last detector run was partial: ${failedDetectors.join(", ")}`,
    );
  }
  if (lastSuccess !== lastRun) {
    throw new Error(
      "last detector run did not fully succeed (last_all_success differs from last_run)",
    );
  }

  const ageSeconds = (now - lastRun) / 1000;
  if (ageSeconds > maxAgeSeconds) {
    throw new Error(
      `heartbeat is stale: ${Math.floor(ageSeconds)}s old (maximum ${maxAgeSeconds}s)`,
    );
  }

  return {
    ageSeconds,
    check:
      typeof heartbeat.check === "string" && heartbeat.check
        ? heartbeat.check
        : "detector",
    lastRun: heartbeat.last_run,
  };
}

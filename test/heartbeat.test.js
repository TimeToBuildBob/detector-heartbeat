import assert from "node:assert/strict";
import test from "node:test";

import { parseMaxAgeSeconds, validateHeartbeat } from "../src/heartbeat.js";

const NOW = Date.parse("2026-09-08T12:00:00Z");

function heartbeat(overrides = {}) {
  return {
    check: "harm-detection",
    last_run: "2026-09-08T11:59:00Z",
    last_all_success: "2026-09-08T11:59:00Z",
    failed_detectors: [],
    ...overrides,
  };
}

test("accepts a recent fully successful run", () => {
  const result = validateHeartbeat(heartbeat(), {
    maxAgeSeconds: 120,
    now: NOW,
  });

  assert.equal(result.ageSeconds, 60);
  assert.equal(result.check, "harm-detection");
});

test("rejects a stale heartbeat", () => {
  assert.throws(
    () =>
      validateHeartbeat(heartbeat(), {
        maxAgeSeconds: 30,
        now: NOW,
      }),
    /heartbeat is stale: 60s old \(maximum 30s\)/,
  );
});

test("rejects an explicitly partial run", () => {
  assert.throws(
    () =>
      validateHeartbeat(
        heartbeat({ failed_detectors: ["issue-harm:exit1"] }),
        { now: NOW },
      ),
    /last detector run was partial: issue-harm:exit1/,
  );
});

test("rejects a run that did not advance full-success evidence", () => {
  assert.throws(
    () =>
      validateHeartbeat(
        heartbeat({ last_all_success: "2026-09-07T11:59:00Z" }),
        { now: NOW },
      ),
    /last detector run did not fully succeed/,
  );
});

test("rejects missing or invalid timestamps", () => {
  assert.throws(
    () => validateHeartbeat(heartbeat({ last_run: undefined }), { now: NOW }),
    /last_run must be a non-empty timestamp string/,
  );
  assert.throws(
    () => validateHeartbeat(heartbeat({ last_run: "yesterday" }), { now: NOW }),
    /last_run is not a valid timestamp/,
  );
});

test("rejects success timestamps later than their run", () => {
  assert.throws(
    () =>
      validateHeartbeat(
        heartbeat({ last_all_success: "2026-09-08T12:00:00Z" }),
        { now: NOW },
      ),
    /last_all_success cannot be later than last_run/,
  );
});

test("rejects runs implausibly far in the future", () => {
  assert.throws(
    () =>
      validateHeartbeat(
        heartbeat({
          last_run: "2026-09-08T12:06:00Z",
          last_all_success: "2026-09-08T12:06:00Z",
        }),
        { now: NOW },
      ),
    /last_run is more than 5 minutes in the future/,
  );
});

test("parses a positive max age and defaults to 48 hours", () => {
  assert.equal(parseMaxAgeSeconds("60"), 60);
  assert.equal(parseMaxAgeSeconds(""), 172800);
  assert.throws(() => parseMaxAgeSeconds("0"), /must be a positive number/);
  assert.throws(() => parseMaxAgeSeconds("nope"), /must be a positive number/);
});

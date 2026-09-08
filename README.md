# Detector Heartbeat

[![CI](https://github.com/TimeToBuildBob/detector-heartbeat/actions/workflows/ci.yml/badge.svg)](https://github.com/TimeToBuildBob/detector-heartbeat/actions/workflows/ci.yml)

Fail CI when a scheduled detector has stopped running or its latest run only
partly succeeded.

A sparse incident log cannot prove that a detector ran: a healthy detector may
have nothing to append. This action checks a separate execution heartbeat and
reads it literally. A run is healthy only when:

- `last_run` and `last_all_success` are valid timestamps and equal;
- `failed_detectors` is absent or empty; and
- the run is newer than `max-age-seconds`.

Missing files, malformed JSON, stale evidence, clock anomalies, and partial runs
fail the workflow.

## Usage

Commit or download a heartbeat artifact before invoking the action:

```yaml
name: Detector health
on:
  schedule:
    - cron: "17 * * * *"
  workflow_dispatch:

jobs:
  heartbeat:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: TimeToBuildBob/detector-heartbeat@v0
        with:
          path: state/detector-heartbeat.json
          max-age-seconds: "7200"
```

The heartbeat producer should replace the file atomically after every run. Keep
`last_all_success` unchanged when any detector fails, and list failures in
`failed_detectors`:

```json
{
  "check": "agent-regression-detectors",
  "last_run": "2026-09-08T11:59:00Z",
  "last_all_success": "2026-09-08T11:59:00Z",
  "failed_detectors": []
}
```

A partial run is explicit and fails even if the wrapper itself reached its end:

```json
{
  "check": "agent-regression-detectors",
  "last_run": "2026-09-08T12:59:00Z",
  "last_all_success": "2026-09-08T11:59:00Z",
  "failed_detectors": ["prompt-drift:exit1"]
}
```

Do not touch an incident log merely to prove liveness. Incident history should
remain event-driven; execution evidence belongs in this separate file.

## Inputs

| Input | Required | Default | Meaning |
|---|---:|---:|---|
| `path` | yes | — | Heartbeat JSON path |
| `max-age-seconds` | no | `172800` | Maximum age of the latest fully successful run |

## Outputs

| Output | Meaning |
|---|---|
| `last-run` | Validated ISO timestamp from `last_run` |
| `age-seconds` | Age of the validated run in whole seconds |

## Versioning

Pin `@v0` for compatible v0 updates or an immutable release such as `@v0.1.0`.
For high-assurance workflows, pin the release commit SHA.

## Development

```sh
npm install
npm test
npm run check
npm run package
```

`dist/` is committed because GitHub Actions executes the bundled JavaScript.

## License

MIT

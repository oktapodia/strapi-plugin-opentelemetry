# Strapi OpenTelemetry Plugin

Export **traces**, **metrics**, and **logs** from Strapi to any OTLP-compatible observability backend (Grafana Tempo, Prometheus via Collector, Honeycomb, SigNoz, your own server, etc.).

Unlike Prometheus scrape plugins, this plugin **pushes** telemetry using the OpenTelemetry Protocol (OTLP) over gRPC or HTTP/protobuf.

## Features

- **OTLP export** for traces, metrics, and logs (each signal independently configurable)
- **Standard `OTEL_*` environment variables** supported out of the box
- **Auto-instrumentation** for HTTP, Koa, PostgreSQL, DNS, and Net
- **Runtime & host metrics** (event loop, GC, CPU, memory)
- **Strapi HTTP metrics** with route normalization to control cardinality
- **Database lifecycle metrics & traces** for create/update/delete/find operations
- **Early instrumentation entrypoint** for maximum auto-instrumentation coverage
- **Strapi v5** compatible

## Installation

```bash
pnpm add strapi-plugin-opentelemetry
# or
npm install strapi-plugin-opentelemetry
```

Enable the plugin in `config/plugins.ts`:

```ts
export default ({ env }) => ({
  opentelemetry: {
    enabled: true,
    config: {
      serviceName: env('OTEL_SERVICE_NAME', 'my-strapi-app'),
      traces: { enabled: true, exporter: 'otlp', protocol: 'grpc' },
      metrics: {
        enabled: true,
        exporter: 'otlp',
        protocol: 'grpc',
        exportIntervalMillis: 60_000,
        runtimeNode: true,
        hostMetrics: true,
        httpMetrics: true,
        lifecycleMetrics: true,
      },
      logs: { enabled: false, exporter: 'otlp', protocol: 'grpc' },
    },
  },
});
```

## Environment variables

When `useEnvironmentVariables` is `true` (default), standard OpenTelemetry environment variables are respected:

| Variable | Description |
| --- | --- |
| `OTEL_SERVICE_NAME` | Service name for all signals |
| `OTEL_SERVICE_VERSION` | Service version |
| `OTEL_SERVICE_INSTANCE_ID` | Instance identifier |
| `OTEL_RESOURCE_ATTRIBUTES` | Comma-separated `key=value` resource attributes |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Base OTLP endpoint |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | Traces endpoint override |
| `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` | Metrics endpoint override |
| `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | Logs endpoint override |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `grpc`, `http/protobuf`, or `http/json` |
| `OTEL_EXPORTER_OTLP_HEADERS` | Comma-separated `key=value` headers |
| `OTEL_TRACES_EXPORTER` | `otlp` or `none` |
| `OTEL_METRICS_EXPORTER` | `otlp` or `none` |
| `OTEL_LOGS_EXPORTER` | `otlp` or `none` |
| `OTEL_METRIC_EXPORT_INTERVAL` | Metrics export interval in ms |
| `OTEL_LOG_LEVEL` | Diagnostic log level (`error`, `debug`, `verbose`, …) |

### Example: push to a local OpenTelemetry Collector

```bash
OTEL_SERVICE_NAME=strapi-cms
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_EXPORTER_OTLP_PROTOCOL=grpc
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
```

## Configuration reference

All options can be set in `config/plugins.ts` under `opentelemetry.config`:

### Top-level

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Master switch |
| `useEnvironmentVariables` | `boolean` | `true` | Merge standard `OTEL_*` env vars |
| `serviceName` | `string` | `strapi` | Service name |
| `serviceVersion` | `string` | — | Service version |
| `serviceInstanceId` | `string` | hostname | Instance ID |
| `resourceAttributes` | `Record<string, string>` | `{}` | Extra resource attributes |
| `diagLogLevel` | `string` | `error` | OTel internal diagnostics |

### `traces`, `metrics`, `logs`

Each signal supports:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | traces/metrics: `true`, logs: `false` | Enable this signal |
| `exporter` | `otlp` \| `none` | `otlp` | Exporter type |
| `protocol` | `grpc` \| `http/protobuf` \| `http/json` | `grpc` | OTLP transport |
| `endpoint` | `string` | — | Signal-specific OTLP URL |
| `headers` | `Record<string, string>` | — | Auth / custom headers |
| `timeoutMillis` | `number` | — | Export timeout |

### `metrics` (additional)

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `exportIntervalMillis` | `number` | `60000` | Export interval |
| `runtimeNode` | `boolean` | `true` | Node.js runtime metrics |
| `hostMetrics` | `boolean` | `true` | Host CPU/memory metrics |
| `httpMetrics` | `boolean` | `true` | HTTP request metrics middleware |
| `lifecycleMetrics` | `boolean` | `true` | DB lifecycle duration metrics |

### `instrumentations`

| Option | Type | Default |
| --- | --- | --- |
| `enabled` | `boolean` | `true` |
| `http` | `boolean` | `true` |
| `koa` | `boolean` | `true` |
| `pg` | `boolean` | `true` |
| `dns` | `boolean` | `true` |
| `net` | `boolean` | `true` |

### `http`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Register HTTP metrics middleware |
| `ignorePaths` | `string[]` | `['/favicon.ico', '/_health', …]` | Paths to skip |
| `normalize` | `[string, string][]` \| `function` | Strapi-aware rules | Route normalization |
| `recordPayloadSizes` | `boolean` | `true` | Record request/response sizes |

### `lifecycles`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Track DB lifecycle events |
| `events` | `LifecycleEvent[]` | all supported | Events to instrument |
| `contentTypes` | `string[]` | `[]` (all) | Content-type UIDs to filter |

## Early instrumentation (recommended for production)

For the best auto-instrumentation coverage, load the SDK **before** Strapi boots:

```json
{
  "scripts": {
    "start": "NODE_OPTIONS='--import strapi-plugin-opentelemetry/instrumentation' strapi start"
  }
}
```

Optional JSON config via env when using early instrumentation:

```bash
STRAPI_OTEL_CONFIG='{"serviceName":"strapi-cms","metrics":{"exportIntervalMillis":30000}}'
```

## Collected metrics

### HTTP (middleware)

| Metric | Type | Attributes |
| --- | --- | --- |
| `http.server.request.duration` | Histogram | `http.request.method`, `http.route`, `http.response.status_code` |
| `http.server.active_requests` | UpDownCounter | `http.request.method`, `http.route` |
| `http.server.request.body.size` | Histogram | `http.request.method`, `http.route` |
| `http.server.response.body.size` | Histogram | `http.request.method`, `http.route`, `http.response.status_code` |

### Database lifecycles

| Metric | Type | Attributes |
| --- | --- | --- |
| `strapi.db.lifecycle.duration` | Histogram | `strapi.content_type`, `strapi.lifecycle.event` |

Auto-instrumentation additionally exports standard OTel HTTP, Koa, and PostgreSQL spans/metrics.

## Compatibility

| Strapi | Plugin |
| --- | --- |
| v5.x | v0.x (pre-release) |

> **Note:** v0.x is experimental. Pin a specific version in production until v1.0.0.

## License

MIT

"use strict";
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const api = require("@opentelemetry/api");
const apiLogs = require("@opentelemetry/api-logs");
const hostMetrics = require("@opentelemetry/host-metrics");
const resources = require("@opentelemetry/resources");
const sdkLogs = require("@opentelemetry/sdk-logs");
const sdkMetrics = require("@opentelemetry/sdk-metrics");
const sdkNode = require("@opentelemetry/sdk-node");
const semanticConventions = require("@opentelemetry/semantic-conventions");
const autoInstrumentationsNode = require("@opentelemetry/auto-instrumentations-node");
const instrumentationRuntimeNode = require("@opentelemetry/instrumentation-runtime-node");
const exporterLogsOtlpGrpc = require("@opentelemetry/exporter-logs-otlp-grpc");
const exporterLogsOtlpHttp = require("@opentelemetry/exporter-logs-otlp-http");
const exporterMetricsOtlpGrpc = require("@opentelemetry/exporter-metrics-otlp-grpc");
const exporterMetricsOtlpHttp = require("@opentelemetry/exporter-metrics-otlp-http");
const exporterTraceOtlpGrpc = require("@opentelemetry/exporter-trace-otlp-grpc");
const exporterTraceOtlpHttp = require("@opentelemetry/exporter-trace-otlp-http");
const node_os = require("node:os");
const buildInstrumentations = (config2, metrics) => {
  if (!config2.enabled) {
    return [];
  }
  const instrumentations = autoInstrumentationsNode.getNodeAutoInstrumentations({
    "@opentelemetry/instrumentation-http": {
      enabled: config2.http,
      ignoreIncomingRequestHook: (request) => {
        const url = request.url || "";
        return url.includes("/_health") || url.includes("/favicon.ico");
      }
    },
    "@opentelemetry/instrumentation-koa": { enabled: config2.koa },
    "@opentelemetry/instrumentation-pg": { enabled: config2.pg },
    "@opentelemetry/instrumentation-dns": { enabled: config2.dns },
    "@opentelemetry/instrumentation-net": { enabled: config2.net },
    "@opentelemetry/instrumentation-fs": { enabled: false },
    "@opentelemetry/instrumentation-express": { enabled: false }
  });
  if (metrics.runtimeNode) {
    instrumentations.push(new instrumentationRuntimeNode.RuntimeNodeInstrumentation());
  }
  return instrumentations;
};
const buildExporterOptions = (config2) => {
  const options = {};
  if (config2.endpoint) {
    options.url = config2.endpoint;
  }
  if (config2.headers) {
    options.headers = config2.headers;
  }
  if (config2.timeoutMillis) {
    options.timeoutMillis = config2.timeoutMillis;
  }
  return options;
};
const createTraceExporter = (protocol, config2) => {
  const options = buildExporterOptions(config2);
  if (protocol === "grpc") {
    return new exporterTraceOtlpGrpc.OTLPTraceExporter(options);
  }
  return new exporterTraceOtlpHttp.OTLPTraceExporter(options);
};
const createMetricExporter = (protocol, config2) => {
  const options = buildExporterOptions(config2);
  if (protocol === "grpc") {
    return new exporterMetricsOtlpGrpc.OTLPMetricExporter(options);
  }
  return new exporterMetricsOtlpHttp.OTLPMetricExporter(options);
};
const createLogExporter = (protocol, config2) => {
  const options = buildExporterOptions(config2);
  if (protocol === "http/json") {
    throw new Error("OpenTelemetry logs do not support http/json in this plugin. Use grpc or http/protobuf.");
  }
  if (protocol === "grpc") {
    return new exporterLogsOtlpGrpc.OTLPLogExporter(options);
  }
  return new exporterLogsOtlpHttp.OTLPLogExporter(options);
};
const GLOBAL_INITIALIZED_KEY = Symbol.for("strapi.plugin.opentelemetry.initialized");
const GLOBAL_SDK_KEY = Symbol.for("strapi.plugin.opentelemetry.sdk");
const GLOBAL_HOST_METRICS_KEY = Symbol.for("strapi.plugin.opentelemetry.hostMetrics");
const GLOBAL_LOGGER_PROVIDER_KEY = Symbol.for("strapi.plugin.opentelemetry.loggerProvider");
const globalState = globalThis;
const diagLevelMap = {
  none: api.DiagLogLevel.NONE,
  error: api.DiagLogLevel.ERROR,
  warn: api.DiagLogLevel.WARN,
  info: api.DiagLogLevel.INFO,
  debug: api.DiagLogLevel.DEBUG,
  verbose: api.DiagLogLevel.VERBOSE,
  all: api.DiagLogLevel.ALL
};
const configureDiagnostics = (level) => {
  if (level === "none") {
    return;
  }
  api.diag.setLogger(new api.DiagConsoleLogger(), diagLevelMap[level] ?? api.DiagLogLevel.ERROR);
};
const buildResource = (config2) => {
  const attributes = {
    [semanticConventions.ATTR_SERVICE_NAME]: config2.serviceName,
    [semanticConventions.ATTR_SERVICE_INSTANCE_ID]: config2.serviceInstanceId,
    ...config2.resourceAttributes
  };
  if (config2.serviceVersion) {
    attributes[semanticConventions.ATTR_SERVICE_VERSION] = config2.serviceVersion;
  }
  return resources.resourceFromAttributes(attributes);
};
const hasActiveSignals = (config2) => {
  return config2.traces.enabled && config2.traces.exporter === "otlp" || config2.metrics.enabled && config2.metrics.exporter === "otlp" || config2.logs.enabled && config2.logs.exporter === "otlp";
};
const initializeTelemetry = async (config2, logger) => {
  if (!config2.enabled) {
    return false;
  }
  if (globalState[GLOBAL_INITIALIZED_KEY]) {
    return true;
  }
  if (!hasActiveSignals(config2)) {
    logger?.info("[opentelemetry] all signals disabled — skipping SDK startup");
    return false;
  }
  configureDiagnostics(config2.diagLogLevel);
  const resource = buildResource(config2);
  const instrumentations = buildInstrumentations(config2.instrumentations, config2.metrics);
  const traceExporter = config2.traces.enabled && config2.traces.exporter === "otlp" ? createTraceExporter(config2.traces.protocol, config2.traces) : void 0;
  const metricExporter = config2.metrics.enabled && config2.metrics.exporter === "otlp" ? createMetricExporter(config2.metrics.protocol, config2.metrics) : void 0;
  const metricReader = metricExporter ? new sdkMetrics.PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: config2.metrics.exportIntervalMillis
  }) : void 0;
  const logExporter = config2.logs.enabled && config2.logs.exporter === "otlp" ? createLogExporter(config2.logs.protocol, config2.logs) : void 0;
  const sdk = new sdkNode.NodeSDK({
    resource,
    traceExporter,
    metricReader,
    instrumentations
  });
  if (logExporter) {
    const loggerProvider = new sdkLogs.LoggerProvider({
      resource,
      processors: [new sdkLogs.SimpleLogRecordProcessor(logExporter)]
    });
    apiLogs.logs.setGlobalLoggerProvider(loggerProvider);
    globalState[GLOBAL_LOGGER_PROVIDER_KEY] = loggerProvider;
  }
  try {
    await sdk.start();
    globalState[GLOBAL_INITIALIZED_KEY] = true;
    globalState[GLOBAL_SDK_KEY] = sdk;
    if (config2.metrics.hostMetrics && config2.metrics.enabled && config2.metrics.exporter === "otlp") {
      const hostMetrics$1 = new hostMetrics.HostMetrics({ name: config2.serviceName });
      hostMetrics$1.start();
      globalState[GLOBAL_HOST_METRICS_KEY] = hostMetrics$1;
    }
    logger?.info(
      `[opentelemetry] started (service=${config2.serviceName}, traces=${config2.traces.enabled && config2.traces.exporter === "otlp"}, metrics=${config2.metrics.enabled && config2.metrics.exporter === "otlp"}, logs=${config2.logs.enabled && config2.logs.exporter === "otlp"})`
    );
    return true;
  } catch (error) {
    logger?.error("[opentelemetry] failed to start SDK", error);
    return false;
  }
};
const shutdownTelemetry = async (logger) => {
  const sdk = globalState[GLOBAL_SDK_KEY];
  const loggerProvider = globalState[GLOBAL_LOGGER_PROVIDER_KEY];
  if (!sdk) {
    return;
  }
  try {
    await loggerProvider?.shutdown();
    await sdk.shutdown();
    globalState[GLOBAL_INITIALIZED_KEY] = false;
    globalState[GLOBAL_SDK_KEY] = void 0;
    globalState[GLOBAL_HOST_METRICS_KEY] = void 0;
    globalState[GLOBAL_LOGGER_PROVIDER_KEY] = void 0;
    logger?.info("[opentelemetry] shut down successfully");
  } catch (error) {
    logger?.error("[opentelemetry] shutdown failed", error);
  }
};
const getMeter = (name = "strapi-plugin-opentelemetry", version = "1.0.0") => {
  return api.metrics.getMeter(name, version);
};
const getTracer = (name = "strapi-plugin-opentelemetry", version = "1.0.0") => {
  return api.trace.getTracer(name, version);
};
const isTelemetryInitialized = () => Boolean(globalState[GLOBAL_INITIALIZED_KEY]);
const METER_NAME$1 = "strapi.lifecycle";
const TRACER_NAME = "strapi.lifecycle";
const beforeEvents = [
  "beforeCreate",
  "beforeUpdate",
  "beforeDelete",
  "beforeFindOne",
  "beforeFindMany"
];
const afterEvents = [
  "afterCreate",
  "afterUpdate",
  "afterDelete",
  "afterFindOne",
  "afterFindMany"
];
const registerDatabaseLifecycles = (strapi, config2) => {
  if (!config2.lifecycles.enabled || !config2.metrics.lifecycleMetrics) {
    return;
  }
  const meter = getMeter(METER_NAME$1);
  const tracer = getTracer(TRACER_NAME);
  const durationHistogram = meter.createHistogram("strapi.db.lifecycle.duration", {
    description: "Duration of Strapi database lifecycle events in seconds",
    unit: "s"
  });
  const trackedEvents = new Set(config2.lifecycles.events);
  const contentTypeFilter = new Set(config2.lifecycles.contentTypes);
  const shouldTrack = (uid) => {
    if (contentTypeFilter.size === 0) {
      return true;
    }
    return contentTypeFilter.has(uid);
  };
  const handleBefore = (eventName) => {
    return async (event) => {
      if (!trackedEvents.has(eventName) || !shouldTrack(event.model.uid)) {
        return;
      }
      const span = tracer.startSpan(`strapi.lifecycle.${eventName}`, {
        attributes: {
          "strapi.content_type": event.model.uid,
          "strapi.lifecycle.event": eventName
        }
      });
      event.state = {
        start: process.hrtime.bigint(),
        span
      };
    };
  };
  const handleAfter = (eventName) => {
    return async (event) => {
      if (!trackedEvents.has(eventName) || !shouldTrack(event.model.uid) || !event.state) {
        return;
      }
      const durationSeconds = Number(process.hrtime.bigint() - event.state.start) / 1e9;
      const attributes = {
        "strapi.content_type": event.model.uid,
        "strapi.lifecycle.event": eventName
      };
      durationHistogram.record(durationSeconds, attributes);
      event.state.span?.setAttributes(attributes);
      event.state.span?.end();
      delete event.state;
    };
  };
  const handlers = {};
  for (const eventName of beforeEvents) {
    handlers[eventName] = handleBefore(eventName);
  }
  for (const eventName of afterEvents) {
    handlers[eventName] = handleAfter(eventName);
  }
  strapi.db.lifecycles.subscribe({
    models: config2.lifecycles.contentTypes.length ? config2.lifecycles.contentTypes : ["*"],
    ...handlers
  });
};
const DEFAULT_LIFECYCLE_EVENTS = [
  "beforeCreate",
  "afterCreate",
  "beforeUpdate",
  "afterUpdate",
  "beforeDelete",
  "afterDelete",
  "beforeFindOne",
  "afterFindOne",
  "beforeFindMany",
  "afterFindMany"
];
const DEFAULT_IGNORE_PATHS = ["/favicon.ico", "/_health", "/admin/_health"];
const DEFAULT_NORMALIZE_RULES = [
  ["\\/(?:[a-f0-9]{24,25}|[a-f0-9-]{36})(?=\\/|$)", "/:id"],
  ["\\/\\d+(?=\\/|$)", "/:id"],
  ["\\/uploads\\/[^/]+\\.[a-zA-Z0-9]+", "/uploads/:file"]
];
const defaultConfig = {
  enabled: true,
  useEnvironmentVariables: true,
  serviceName: "strapi",
  diagLogLevel: "error",
  traces: {
    enabled: true,
    exporter: "otlp",
    protocol: "grpc"
  },
  metrics: {
    enabled: true,
    exporter: "otlp",
    protocol: "grpc",
    exportIntervalMillis: 6e4,
    runtimeNode: true,
    hostMetrics: true,
    httpMetrics: true,
    lifecycleMetrics: true
  },
  logs: {
    enabled: false,
    exporter: "otlp",
    protocol: "grpc"
  },
  instrumentations: {
    enabled: true,
    http: true,
    koa: true,
    pg: true,
    dns: true,
    net: true
  },
  http: {
    enabled: true,
    ignorePaths: DEFAULT_IGNORE_PATHS,
    normalize: DEFAULT_NORMALIZE_RULES,
    recordPayloadSizes: true
  },
  lifecycles: {
    enabled: true,
    events: [...DEFAULT_LIFECYCLE_EVENTS],
    contentTypes: []
  }
};
const compileRules = (normalize) => {
  if (!normalize) {
    return DEFAULT_NORMALIZE_RULES.map(([pattern, replacement]) => [
      new RegExp(pattern, "g"),
      replacement
    ]);
  }
  if (typeof normalize === "function") {
    return [];
  }
  return normalize.map(([pattern, replacement]) => [new RegExp(pattern, "g"), replacement]);
};
const normalizePath = (path, normalize, context) => {
  if (typeof normalize === "function") {
    return normalize(path, context);
  }
  let normalized = path;
  const rules = compileRules(normalize);
  for (const [pattern, replacement] of rules) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized;
};
const shouldIgnorePath = (path, ignorePaths) => {
  return ignorePaths.some((candidate) => {
    if (candidate.startsWith("/") && candidate.endsWith("/") && candidate.length > 2) {
      const source = candidate.slice(1, -1);
      return new RegExp(source).test(path);
    }
    return path === candidate || path.startsWith(`${candidate}/`);
  });
};
const METER_NAME = "strapi.http";
const createHttpMetricsMiddleware = (config2) => {
  if (!config2.http.enabled || !config2.metrics.httpMetrics) {
    return async (_ctx, next) => next();
  }
  const meter = getMeter(METER_NAME);
  const requestDuration = meter.createHistogram("http.server.request.duration", {
    description: "Duration of HTTP requests in seconds",
    unit: "s"
  });
  const activeRequests = meter.createUpDownCounter("http.server.active_requests", {
    description: "Number of active HTTP requests"
  });
  const requestBodySize = meter.createHistogram("http.server.request.body.size", {
    description: "Size of HTTP request bodies in bytes",
    unit: "By"
  });
  const responseBodySize = meter.createHistogram("http.server.response.body.size", {
    description: "Size of HTTP response bodies in bytes",
    unit: "By"
  });
  return async (ctx, next) => {
    const rawPath = ctx._matchedRoute || ctx.path;
    if (shouldIgnorePath(rawPath, config2.http.ignorePaths)) {
      await next();
      return;
    }
    const route = normalizePath(rawPath, config2.http.normalize, { method: ctx.method });
    const attributes = {
      "http.request.method": ctx.method,
      "http.route": route
    };
    activeRequests.add(1, attributes);
    const start = process.hrtime.bigint();
    if (config2.http.recordPayloadSizes) {
      const requestLength = Number(ctx.request.length || 0);
      if (requestLength > 0) {
        requestBodySize.record(requestLength, attributes);
      }
    }
    try {
      await next();
    } finally {
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
      const responseAttributes = {
        ...attributes,
        "http.response.status_code": ctx.status
      };
      requestDuration.record(durationSeconds, responseAttributes);
      activeRequests.add(-1, attributes);
      if (config2.http.recordPayloadSizes) {
        const responseLength = Number(ctx.response.length || 0);
        if (responseLength > 0) {
          responseBodySize.record(responseLength, responseAttributes);
        }
      }
    }
  };
};
const bootstrap = ({ strapi }) => {
  const telemetry = strapi.plugin("opentelemetry").service("telemetry");
  const config2 = telemetry.getConfig();
  if (!config2.enabled || !telemetry.isInitialized()) {
    return;
  }
  if (config2.http.enabled && config2.metrics.httpMetrics) {
    strapi.server.use(createHttpMetricsMiddleware(config2));
  }
  if (config2.lifecycles.enabled && config2.metrics.lifecycleMetrics) {
    registerDatabaseLifecycles(strapi, config2);
  }
  strapi.log.info("[opentelemetry] middleware and lifecycle instrumentation registered");
};
const destroy = ({ strapi }) => {
  void shutdownTelemetry(strapi.log);
};
const parseNumber = (value, fallback) => {
  if (value === void 0) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const parseProtocol = (value, fallback) => {
  if (!value) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "grpc" || normalized === "http/protobuf" || normalized === "http/json") {
    return normalized;
  }
  if (normalized === "http" || normalized === "http/protobuf") {
    return "http/protobuf";
  }
  return fallback;
};
const parseSignalExporter = (value, fallback) => {
  if (!value) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "none" || normalized === "false" || normalized === "off") {
    return "none";
  }
  if (normalized === "otlp" || normalized === "true" || normalized === "on") {
    return "otlp";
  }
  return fallback;
};
const parseDiagLogLevel = (value, fallback) => {
  if (!value) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  const allowed = [
    "none",
    "error",
    "warn",
    "info",
    "debug",
    "verbose",
    "all"
  ];
  return allowed.includes(normalized) ? normalized : fallback;
};
const parseHeaders = (value) => {
  if (!value) {
    return void 0;
  }
  return value.split(",").reduce((headers, pair) => {
    const [key, ...rest] = pair.split("=");
    const trimmedKey = key?.trim();
    const trimmedValue = rest.join("=").trim();
    if (trimmedKey && trimmedValue) {
      headers[trimmedKey] = trimmedValue;
    }
    return headers;
  }, {});
};
const parseResourceAttributes = (value) => {
  if (!value) {
    return void 0;
  }
  return value.split(",").reduce((attributes, pair) => {
    const [key, ...rest] = pair.split("=");
    const trimmedKey = key?.trim();
    const trimmedValue = rest.join("=").trim();
    if (trimmedKey && trimmedValue) {
      attributes[trimmedKey] = trimmedValue;
    }
    return attributes;
  }, {});
};
const mergeSignalConfig = (pluginValue, defaults, envExporterKey, useEnvironmentVariables) => {
  const exporter = useEnvironmentVariables ? parseSignalExporter(
    process.env[envExporterKey],
    pluginValue?.exporter ?? defaults.exporter ?? "otlp"
  ) : pluginValue?.exporter ?? defaults.exporter ?? "otlp";
  const enabled = useEnvironmentVariables ? exporter !== "none" && (pluginValue?.enabled ?? defaults.enabled ?? true) : (pluginValue?.enabled ?? defaults.enabled ?? true) && exporter !== "none";
  return {
    ...defaults,
    ...pluginValue,
    enabled,
    exporter
  };
};
const resolveConfig = (pluginConfig = {}) => {
  const merged = {
    ...defaultConfig,
    ...pluginConfig,
    traces: { ...defaultConfig.traces, ...pluginConfig.traces },
    metrics: { ...defaultConfig.metrics, ...pluginConfig.metrics },
    logs: { ...defaultConfig.logs, ...pluginConfig.logs },
    instrumentations: {
      ...defaultConfig.instrumentations,
      ...pluginConfig.instrumentations
    },
    http: { ...defaultConfig.http, ...pluginConfig.http },
    lifecycles: { ...defaultConfig.lifecycles, ...pluginConfig.lifecycles }
  };
  const useEnvironmentVariables = merged.useEnvironmentVariables ?? true;
  const serviceName = useEnvironmentVariables ? process.env.OTEL_SERVICE_NAME || merged.serviceName || "strapi" : merged.serviceName || "strapi";
  const serviceVersion = useEnvironmentVariables ? process.env.OTEL_SERVICE_VERSION || merged.serviceVersion : merged.serviceVersion;
  const serviceInstanceId = useEnvironmentVariables ? process.env.OTEL_SERVICE_INSTANCE_ID || merged.serviceInstanceId || process.env.HOSTNAME || node_os.hostname() : merged.serviceInstanceId || process.env.HOSTNAME || node_os.hostname();
  const resourceAttributes = {
    ...useEnvironmentVariables ? parseResourceAttributes(process.env.OTEL_RESOURCE_ATTRIBUTES) : void 0,
    ...merged.resourceAttributes
  };
  const protocol = useEnvironmentVariables ? parseProtocol(process.env.OTEL_EXPORTER_OTLP_PROTOCOL, merged.traces?.protocol || "grpc") : merged.traces?.protocol || "grpc";
  const traces = mergeSignalConfig(
    merged.traces,
    defaultConfig.traces,
    "OTEL_TRACES_EXPORTER",
    useEnvironmentVariables
  );
  const metrics = {
    ...mergeSignalConfig(
      merged.metrics,
      defaultConfig.metrics,
      "OTEL_METRICS_EXPORTER",
      useEnvironmentVariables
    ),
    exportIntervalMillis: useEnvironmentVariables ? parseNumber(
      process.env.OTEL_METRIC_EXPORT_INTERVAL,
      merged.metrics?.exportIntervalMillis ?? 6e4
    ) : merged.metrics?.exportIntervalMillis ?? 6e4,
    runtimeNode: merged.metrics?.runtimeNode ?? true,
    hostMetrics: merged.metrics?.hostMetrics ?? true,
    httpMetrics: merged.metrics?.httpMetrics ?? true,
    lifecycleMetrics: merged.metrics?.lifecycleMetrics ?? true,
    protocol: useEnvironmentVariables ? parseProtocol(
      process.env.OTEL_EXPORTER_OTLP_PROTOCOL,
      merged.metrics?.protocol || protocol
    ) : merged.metrics?.protocol || protocol,
    endpoint: useEnvironmentVariables ? process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || merged.metrics?.endpoint : merged.metrics?.endpoint,
    headers: (useEnvironmentVariables ? parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS) : void 0) || merged.metrics?.headers,
    timeoutMillis: merged.metrics?.timeoutMillis
  };
  const logs = {
    ...mergeSignalConfig(
      merged.logs,
      defaultConfig.logs,
      "OTEL_LOGS_EXPORTER",
      useEnvironmentVariables
    ),
    protocol: useEnvironmentVariables ? parseProtocol(process.env.OTEL_EXPORTER_OTLP_PROTOCOL, merged.logs?.protocol || protocol) : merged.logs?.protocol || protocol,
    endpoint: useEnvironmentVariables ? process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || merged.logs?.endpoint : merged.logs?.endpoint,
    headers: (useEnvironmentVariables ? parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS) : void 0) || merged.logs?.headers,
    timeoutMillis: merged.logs?.timeoutMillis
  };
  const tracesResolved = {
    ...traces,
    protocol: useEnvironmentVariables ? parseProtocol(process.env.OTEL_EXPORTER_OTLP_PROTOCOL, merged.traces?.protocol || protocol) : merged.traces?.protocol || protocol,
    endpoint: useEnvironmentVariables ? process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || merged.traces?.endpoint : merged.traces?.endpoint,
    headers: (useEnvironmentVariables ? parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS) : void 0) || merged.traces?.headers,
    timeoutMillis: merged.traces?.timeoutMillis
  };
  const enabled = merged.enabled ?? true;
  return {
    enabled,
    useEnvironmentVariables,
    serviceName,
    serviceVersion,
    serviceInstanceId,
    resourceAttributes,
    diagLogLevel: useEnvironmentVariables ? parseDiagLogLevel(process.env.OTEL_LOG_LEVEL, merged.diagLogLevel || "error") : merged.diagLogLevel || "error",
    traces: tracesResolved,
    metrics,
    logs,
    instrumentations: {
      enabled: merged.instrumentations?.enabled ?? true,
      http: merged.instrumentations?.http ?? true,
      koa: merged.instrumentations?.koa ?? true,
      pg: merged.instrumentations?.pg ?? true,
      dns: merged.instrumentations?.dns ?? true,
      net: merged.instrumentations?.net ?? true
    },
    http: {
      enabled: merged.http?.enabled ?? true,
      ignorePaths: merged.http?.ignorePaths ?? DEFAULT_IGNORE_PATHS,
      normalize: merged.http?.normalize ?? DEFAULT_NORMALIZE_RULES,
      recordPayloadSizes: merged.http?.recordPayloadSizes ?? true
    },
    lifecycles: {
      enabled: merged.lifecycles?.enabled ?? true,
      events: merged.lifecycles?.events ?? DEFAULT_LIFECYCLE_EVENTS,
      contentTypes: merged.lifecycles?.contentTypes ?? []
    }
  };
};
const register = ({ strapi }) => {
  const pluginConfig = strapi.config.get("plugin::opentelemetry");
  const config2 = resolveConfig(pluginConfig);
  if (!config2.enabled) {
    return;
  }
  void initializeTelemetry(config2, strapi.log);
};
const config = {
  default: defaultConfig,
  validator(config2) {
    if (config2 === void 0 || config2 === null) {
      return;
    }
    if (typeof config2 !== "object") {
      throw new Error("plugin::opentelemetry config must be an object");
    }
    resolveConfig(config2);
  }
};
const contentTypes = {};
const controllers = {};
const policies = {};
const routes = {};
const createTelemetryService = ({ strapi }) => {
  const getConfig = () => {
    const pluginConfig = strapi.config.get("plugin::opentelemetry");
    return resolveConfig(pluginConfig);
  };
  return {
    getConfig,
    initialize: async () => initializeTelemetry(getConfig(), strapi.log),
    shutdown: async () => shutdownTelemetry(strapi.log),
    isInitialized: isTelemetryInitialized,
    getMeter,
    getTracer
  };
};
const index = {
  register,
  bootstrap,
  destroy,
  config,
  controllers,
  routes,
  services: createTelemetryService,
  contentTypes,
  policies,
  middlewares: createHttpMetricsMiddleware
};
exports.default = index;

// server/src/config/resolve-config.ts
var import_node_os = require("node:os");

// server/src/config/defaults.ts
var DEFAULT_LIFECYCLE_EVENTS = [
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
var DEFAULT_IGNORE_PATHS = ["/favicon.ico", "/_health", "/admin/_health"];
var DEFAULT_NORMALIZE_RULES = [
  ["\\/(?:[a-f0-9]{24,25}|[a-f0-9-]{36})(?=\\/|$)", "/:id"],
  ["\\/\\d+(?=\\/|$)", "/:id"],
  ["\\/uploads\\/[^/]+\\.[a-zA-Z0-9]+", "/uploads/:file"]
];
var defaultConfig = {
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

// server/src/config/resolve-config.ts
var parseNumber = (value, fallback) => {
  if (value === void 0) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
var parseProtocol = (value, fallback) => {
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
var parseSignalExporter = (value, fallback) => {
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
var parseDiagLogLevel = (value, fallback) => {
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
var parseHeaders = (value) => {
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
var parseResourceAttributes = (value) => {
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
var mergeSignalConfig = (pluginValue, defaults, envExporterKey, useEnvironmentVariables) => {
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
var resolveConfig = (pluginConfig2 = {}) => {
  const merged = {
    ...defaultConfig,
    ...pluginConfig2,
    traces: { ...defaultConfig.traces, ...pluginConfig2.traces },
    metrics: { ...defaultConfig.metrics, ...pluginConfig2.metrics },
    logs: { ...defaultConfig.logs, ...pluginConfig2.logs },
    instrumentations: {
      ...defaultConfig.instrumentations,
      ...pluginConfig2.instrumentations
    },
    http: { ...defaultConfig.http, ...pluginConfig2.http },
    lifecycles: { ...defaultConfig.lifecycles, ...pluginConfig2.lifecycles }
  };
  const useEnvironmentVariables = merged.useEnvironmentVariables ?? true;
  const serviceName = useEnvironmentVariables ? process.env.OTEL_SERVICE_NAME || merged.serviceName || "strapi" : merged.serviceName || "strapi";
  const serviceVersion = useEnvironmentVariables ? process.env.OTEL_SERVICE_VERSION || merged.serviceVersion : merged.serviceVersion;
  const serviceInstanceId = useEnvironmentVariables ? process.env.OTEL_SERVICE_INSTANCE_ID || merged.serviceInstanceId || process.env.HOSTNAME || (0, import_node_os.hostname)() : merged.serviceInstanceId || process.env.HOSTNAME || (0, import_node_os.hostname)();
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
  const metrics2 = {
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
  const logs2 = {
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
    metrics: metrics2,
    logs: logs2,
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

// server/src/services/telemetry.ts
var import_api = require("@opentelemetry/api");
var import_api_logs = require("@opentelemetry/api-logs");
var import_host_metrics = require("@opentelemetry/host-metrics");
var import_resources = require("@opentelemetry/resources");
var import_sdk_logs = require("@opentelemetry/sdk-logs");
var import_sdk_metrics = require("@opentelemetry/sdk-metrics");
var import_sdk_node = require("@opentelemetry/sdk-node");
var import_semantic_conventions = require("@opentelemetry/semantic-conventions");

// server/src/utils/build-instrumentations.ts
var import_auto_instrumentations_node = require("@opentelemetry/auto-instrumentations-node");
var import_instrumentation_runtime_node = require("@opentelemetry/instrumentation-runtime-node");
var buildInstrumentations = (config2, metrics2) => {
  if (!config2.enabled) {
    return [];
  }
  const instrumentations = (0, import_auto_instrumentations_node.getNodeAutoInstrumentations)({
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
  if (metrics2.runtimeNode) {
    instrumentations.push(new import_instrumentation_runtime_node.RuntimeNodeInstrumentation());
  }
  return instrumentations;
};

// server/src/utils/build-exporters.ts
var import_exporter_logs_otlp_grpc = require("@opentelemetry/exporter-logs-otlp-grpc");
var import_exporter_logs_otlp_http = require("@opentelemetry/exporter-logs-otlp-http");
var import_exporter_metrics_otlp_grpc = require("@opentelemetry/exporter-metrics-otlp-grpc");
var import_exporter_metrics_otlp_http = require("@opentelemetry/exporter-metrics-otlp-http");
var import_exporter_trace_otlp_grpc = require("@opentelemetry/exporter-trace-otlp-grpc");
var import_exporter_trace_otlp_http = require("@opentelemetry/exporter-trace-otlp-http");
var buildExporterOptions = (config2) => {
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
var createTraceExporter = (protocol, config2) => {
  const options = buildExporterOptions(config2);
  if (protocol === "grpc") {
    return new import_exporter_trace_otlp_grpc.OTLPTraceExporter(options);
  }
  return new import_exporter_trace_otlp_http.OTLPTraceExporter(options);
};
var createMetricExporter = (protocol, config2) => {
  const options = buildExporterOptions(config2);
  if (protocol === "grpc") {
    return new import_exporter_metrics_otlp_grpc.OTLPMetricExporter(options);
  }
  return new import_exporter_metrics_otlp_http.OTLPMetricExporter(options);
};
var createLogExporter = (protocol, config2) => {
  const options = buildExporterOptions(config2);
  if (protocol === "http/json") {
    throw new Error("OpenTelemetry logs do not support http/json in this plugin. Use grpc or http/protobuf.");
  }
  if (protocol === "grpc") {
    return new import_exporter_logs_otlp_grpc.OTLPLogExporter(options);
  }
  return new import_exporter_logs_otlp_http.OTLPLogExporter(options);
};

// server/src/services/telemetry.ts
var GLOBAL_INITIALIZED_KEY = Symbol.for("strapi.plugin.opentelemetry.initialized");
var GLOBAL_SDK_KEY = Symbol.for("strapi.plugin.opentelemetry.sdk");
var GLOBAL_HOST_METRICS_KEY = Symbol.for("strapi.plugin.opentelemetry.hostMetrics");
var GLOBAL_LOGGER_PROVIDER_KEY = Symbol.for("strapi.plugin.opentelemetry.loggerProvider");
var globalState = globalThis;
var diagLevelMap = {
  none: import_api.DiagLogLevel.NONE,
  error: import_api.DiagLogLevel.ERROR,
  warn: import_api.DiagLogLevel.WARN,
  info: import_api.DiagLogLevel.INFO,
  debug: import_api.DiagLogLevel.DEBUG,
  verbose: import_api.DiagLogLevel.VERBOSE,
  all: import_api.DiagLogLevel.ALL
};
var configureDiagnostics = (level) => {
  if (level === "none") {
    return;
  }
  import_api.diag.setLogger(new import_api.DiagConsoleLogger(), diagLevelMap[level] ?? import_api.DiagLogLevel.ERROR);
};
var buildResource = (config2) => {
  const attributes = {
    [import_semantic_conventions.ATTR_SERVICE_NAME]: config2.serviceName,
    [import_semantic_conventions.ATTR_SERVICE_INSTANCE_ID]: config2.serviceInstanceId,
    ...config2.resourceAttributes
  };
  if (config2.serviceVersion) {
    attributes[import_semantic_conventions.ATTR_SERVICE_VERSION] = config2.serviceVersion;
  }
  return (0, import_resources.resourceFromAttributes)(attributes);
};
var hasActiveSignals = (config2) => {
  return config2.traces.enabled && config2.traces.exporter === "otlp" || config2.metrics.enabled && config2.metrics.exporter === "otlp" || config2.logs.enabled && config2.logs.exporter === "otlp";
};
var initializeTelemetry = async (config2, logger) => {
  if (!config2.enabled) {
    return false;
  }
  if (globalState[GLOBAL_INITIALIZED_KEY]) {
    return true;
  }
  if (!hasActiveSignals(config2)) {
    logger?.info("[opentelemetry] all signals disabled \u2014 skipping SDK startup");
    return false;
  }
  configureDiagnostics(config2.diagLogLevel);
  const resource = buildResource(config2);
  const instrumentations = buildInstrumentations(config2.instrumentations, config2.metrics);
  const traceExporter = config2.traces.enabled && config2.traces.exporter === "otlp" ? createTraceExporter(config2.traces.protocol, config2.traces) : void 0;
  const metricExporter = config2.metrics.enabled && config2.metrics.exporter === "otlp" ? createMetricExporter(config2.metrics.protocol, config2.metrics) : void 0;
  const metricReader = metricExporter ? new import_sdk_metrics.PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: config2.metrics.exportIntervalMillis
  }) : void 0;
  const logExporter = config2.logs.enabled && config2.logs.exporter === "otlp" ? createLogExporter(config2.logs.protocol, config2.logs) : void 0;
  const sdk = new import_sdk_node.NodeSDK({
    resource,
    traceExporter,
    metricReader,
    instrumentations
  });
  if (logExporter) {
    const loggerProvider = new import_sdk_logs.LoggerProvider({
      resource,
      processors: [new import_sdk_logs.SimpleLogRecordProcessor(logExporter)]
    });
    import_api_logs.logs.setGlobalLoggerProvider(loggerProvider);
    globalState[GLOBAL_LOGGER_PROVIDER_KEY] = loggerProvider;
  }
  try {
    await sdk.start();
    globalState[GLOBAL_INITIALIZED_KEY] = true;
    globalState[GLOBAL_SDK_KEY] = sdk;
    if (config2.metrics.hostMetrics && config2.metrics.enabled && config2.metrics.exporter === "otlp") {
      const hostMetrics = new import_host_metrics.HostMetrics({ name: config2.serviceName });
      hostMetrics.start();
      globalState[GLOBAL_HOST_METRICS_KEY] = hostMetrics;
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

// server/src/instrumentation.ts
var pluginConfig = process.env.STRAPI_OTEL_CONFIG ? JSON.parse(process.env.STRAPI_OTEL_CONFIG) : {};
var config = resolveConfig(pluginConfig);
void initializeTelemetry(config, console);

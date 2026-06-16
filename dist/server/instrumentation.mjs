var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// server/src/config/defaults.ts
var DEFAULT_LIFECYCLE_EVENTS, DEFAULT_IGNORE_PATHS, DEFAULT_NORMALIZE_RULES, defaultConfig;
var init_defaults = __esm({
  "server/src/config/defaults.ts"() {
    DEFAULT_LIFECYCLE_EVENTS = [
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
    DEFAULT_IGNORE_PATHS = ["/favicon.ico", "/_health", "/admin/_health"];
    DEFAULT_NORMALIZE_RULES = [
      ["\\/(?:[a-f0-9]{24,25}|[a-f0-9-]{36})(?=\\/|$)", "/:id"],
      ["\\/\\d+(?=\\/|$)", "/:id"],
      ["\\/uploads\\/[^/]+\\.[a-zA-Z0-9]+", "/uploads/:file"]
    ];
    defaultConfig = {
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
  }
});

// server/src/config/resolve-config.ts
import { hostname } from "node:os";
var parseNumber, parseProtocol, parseSignalExporter, parseDiagLogLevel, parseHeaders, parseResourceAttributes, mergeSignalConfig, resolveConfig;
var init_resolve_config = __esm({
  "server/src/config/resolve-config.ts"() {
    init_defaults();
    parseNumber = (value, fallback) => {
      if (value === void 0) {
        return fallback;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    parseProtocol = (value, fallback) => {
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
    parseSignalExporter = (value, fallback) => {
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
    parseDiagLogLevel = (value, fallback) => {
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
    parseHeaders = (value) => {
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
    parseResourceAttributes = (value) => {
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
    mergeSignalConfig = (pluginValue, defaults, envExporterKey, useEnvironmentVariables) => {
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
    resolveConfig = (pluginConfig = {}) => {
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
      const serviceInstanceId = useEnvironmentVariables ? process.env.OTEL_SERVICE_INSTANCE_ID || merged.serviceInstanceId || process.env.HOSTNAME || hostname() : merged.serviceInstanceId || process.env.HOSTNAME || hostname();
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
  }
});

// server/src/utils/build-instrumentations.ts
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { RuntimeNodeInstrumentation } from "@opentelemetry/instrumentation-runtime-node";
var buildInstrumentations;
var init_build_instrumentations = __esm({
  "server/src/utils/build-instrumentations.ts"() {
    buildInstrumentations = (config, metrics2) => {
      if (!config.enabled) {
        return [];
      }
      const instrumentations = getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-http": {
          enabled: config.http,
          ignoreIncomingRequestHook: (request) => {
            const url = request.url || "";
            return url.includes("/_health") || url.includes("/favicon.ico");
          }
        },
        "@opentelemetry/instrumentation-koa": { enabled: config.koa },
        "@opentelemetry/instrumentation-pg": { enabled: config.pg },
        "@opentelemetry/instrumentation-dns": { enabled: config.dns },
        "@opentelemetry/instrumentation-net": { enabled: config.net },
        "@opentelemetry/instrumentation-fs": { enabled: false },
        "@opentelemetry/instrumentation-express": { enabled: false }
      });
      if (metrics2.runtimeNode) {
        instrumentations.push(new RuntimeNodeInstrumentation());
      }
      return instrumentations;
    };
  }
});

// server/src/utils/build-exporters.ts
import { OTLPLogExporter as GrpcLogExporter } from "@opentelemetry/exporter-logs-otlp-grpc";
import { OTLPLogExporter as HttpLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter as GrpcMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc";
import { OTLPMetricExporter as HttpMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter as GrpcTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPTraceExporter as HttpTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
var buildExporterOptions, createTraceExporter, createMetricExporter, createLogExporter;
var init_build_exporters = __esm({
  "server/src/utils/build-exporters.ts"() {
    buildExporterOptions = (config) => {
      const options = {};
      if (config.endpoint) {
        options.url = config.endpoint;
      }
      if (config.headers) {
        options.headers = config.headers;
      }
      if (config.timeoutMillis) {
        options.timeoutMillis = config.timeoutMillis;
      }
      return options;
    };
    createTraceExporter = (protocol, config) => {
      const options = buildExporterOptions(config);
      if (protocol === "grpc") {
        return new GrpcTraceExporter(options);
      }
      return new HttpTraceExporter(options);
    };
    createMetricExporter = (protocol, config) => {
      const options = buildExporterOptions(config);
      if (protocol === "grpc") {
        return new GrpcMetricExporter(options);
      }
      return new HttpMetricExporter(options);
    };
    createLogExporter = (protocol, config) => {
      const options = buildExporterOptions(config);
      if (protocol === "http/json") {
        throw new Error("OpenTelemetry logs do not support http/json in this plugin. Use grpc or http/protobuf.");
      }
      if (protocol === "grpc") {
        return new GrpcLogExporter(options);
      }
      return new HttpLogExporter(options);
    };
  }
});

// server/src/services/telemetry.ts
import { diag, DiagConsoleLogger, DiagLogLevel, metrics, trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { HostMetrics } from "@opentelemetry/host-metrics";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { LoggerProvider, SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  ATTR_SERVICE_INSTANCE_ID,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION
} from "@opentelemetry/semantic-conventions";
var GLOBAL_INITIALIZED_KEY, GLOBAL_SDK_KEY, GLOBAL_HOST_METRICS_KEY, GLOBAL_LOGGER_PROVIDER_KEY, globalState, diagLevelMap, configureDiagnostics, buildResource, hasActiveSignals, initializeTelemetry;
var init_telemetry = __esm({
  "server/src/services/telemetry.ts"() {
    init_build_instrumentations();
    init_build_exporters();
    GLOBAL_INITIALIZED_KEY = Symbol.for("strapi.plugin.opentelemetry.initialized");
    GLOBAL_SDK_KEY = Symbol.for("strapi.plugin.opentelemetry.sdk");
    GLOBAL_HOST_METRICS_KEY = Symbol.for("strapi.plugin.opentelemetry.hostMetrics");
    GLOBAL_LOGGER_PROVIDER_KEY = Symbol.for("strapi.plugin.opentelemetry.loggerProvider");
    globalState = globalThis;
    diagLevelMap = {
      none: DiagLogLevel.NONE,
      error: DiagLogLevel.ERROR,
      warn: DiagLogLevel.WARN,
      info: DiagLogLevel.INFO,
      debug: DiagLogLevel.DEBUG,
      verbose: DiagLogLevel.VERBOSE,
      all: DiagLogLevel.ALL
    };
    configureDiagnostics = (level) => {
      if (level === "none") {
        return;
      }
      diag.setLogger(new DiagConsoleLogger(), diagLevelMap[level] ?? DiagLogLevel.ERROR);
    };
    buildResource = (config) => {
      const attributes = {
        [ATTR_SERVICE_NAME]: config.serviceName,
        [ATTR_SERVICE_INSTANCE_ID]: config.serviceInstanceId,
        ...config.resourceAttributes
      };
      if (config.serviceVersion) {
        attributes[ATTR_SERVICE_VERSION] = config.serviceVersion;
      }
      return resourceFromAttributes(attributes);
    };
    hasActiveSignals = (config) => {
      return config.traces.enabled && config.traces.exporter === "otlp" || config.metrics.enabled && config.metrics.exporter === "otlp" || config.logs.enabled && config.logs.exporter === "otlp";
    };
    initializeTelemetry = async (config, logger) => {
      if (!config.enabled) {
        return false;
      }
      if (globalState[GLOBAL_INITIALIZED_KEY]) {
        return true;
      }
      if (!hasActiveSignals(config)) {
        logger?.info("[opentelemetry] all signals disabled \u2014 skipping SDK startup");
        return false;
      }
      configureDiagnostics(config.diagLogLevel);
      const resource = buildResource(config);
      const instrumentations = buildInstrumentations(config.instrumentations, config.metrics);
      const traceExporter = config.traces.enabled && config.traces.exporter === "otlp" ? createTraceExporter(config.traces.protocol, config.traces) : void 0;
      const metricExporter = config.metrics.enabled && config.metrics.exporter === "otlp" ? createMetricExporter(config.metrics.protocol, config.metrics) : void 0;
      const metricReader = metricExporter ? new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: config.metrics.exportIntervalMillis
      }) : void 0;
      const logExporter = config.logs.enabled && config.logs.exporter === "otlp" ? createLogExporter(config.logs.protocol, config.logs) : void 0;
      const sdk = new NodeSDK({
        resource,
        traceExporter,
        metricReader,
        instrumentations
      });
      if (logExporter) {
        const loggerProvider = new LoggerProvider({
          resource,
          processors: [new SimpleLogRecordProcessor(logExporter)]
        });
        logs.setGlobalLoggerProvider(loggerProvider);
        globalState[GLOBAL_LOGGER_PROVIDER_KEY] = loggerProvider;
      }
      try {
        await sdk.start();
        globalState[GLOBAL_INITIALIZED_KEY] = true;
        globalState[GLOBAL_SDK_KEY] = sdk;
        if (config.metrics.hostMetrics && config.metrics.enabled && config.metrics.exporter === "otlp") {
          const hostMetrics = new HostMetrics({ name: config.serviceName });
          hostMetrics.start();
          globalState[GLOBAL_HOST_METRICS_KEY] = hostMetrics;
        }
        logger?.info(
          `[opentelemetry] started (service=${config.serviceName}, traces=${config.traces.enabled && config.traces.exporter === "otlp"}, metrics=${config.metrics.enabled && config.metrics.exporter === "otlp"}, logs=${config.logs.enabled && config.logs.exporter === "otlp"})`
        );
        return true;
      } catch (error) {
        logger?.error("[opentelemetry] failed to start SDK", error);
        return false;
      }
    };
  }
});

// server/src/instrumentation.ts
var require_instrumentation = __commonJS({
  "server/src/instrumentation.ts"() {
    init_resolve_config();
    init_telemetry();
    var pluginConfig = process.env.STRAPI_OTEL_CONFIG ? JSON.parse(process.env.STRAPI_OTEL_CONFIG) : {};
    var config = resolveConfig(pluginConfig);
    void initializeTelemetry(config, console);
  }
});
export default require_instrumentation();

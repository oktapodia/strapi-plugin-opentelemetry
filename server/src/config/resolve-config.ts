import { hostname } from 'node:os';

import {
  DEFAULT_IGNORE_PATHS,
  DEFAULT_LIFECYCLE_EVENTS,
  DEFAULT_NORMALIZE_RULES,
  defaultConfig,
} from './defaults';
import type {
  DiagLogLevelName,
  LifecycleEvent,
  OpenTelemetryPluginConfig,
  OtlpProtocol,
  ResolvedOpenTelemetryConfig,
  SignalExporter,
} from './types';

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseProtocol = (value: string | undefined, fallback: OtlpProtocol): OtlpProtocol => {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'grpc' || normalized === 'http/protobuf' || normalized === 'http/json') {
    return normalized;
  }

  if (normalized === 'http' || normalized === 'http/protobuf') {
    return 'http/protobuf';
  }

  return fallback;
};

const parseSignalExporter = (
  value: string | undefined,
  fallback: SignalExporter
): SignalExporter => {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'none' || normalized === 'false' || normalized === 'off') {
    return 'none';
  }

  if (normalized === 'otlp' || normalized === 'true' || normalized === 'on') {
    return 'otlp';
  }

  return fallback;
};

const parseDiagLogLevel = (
  value: string | undefined,
  fallback: DiagLogLevelName
): DiagLogLevelName => {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase() as DiagLogLevelName;
  const allowed: DiagLogLevelName[] = [
    'none',
    'error',
    'warn',
    'info',
    'debug',
    'verbose',
    'all',
  ];

  return allowed.includes(normalized) ? normalized : fallback;
};

const parseHeaders = (value: string | undefined): Record<string, string> | undefined => {
  if (!value) {
    return undefined;
  }

  return value.split(',').reduce<Record<string, string>>((headers, pair) => {
    const [key, ...rest] = pair.split('=');
    const trimmedKey = key?.trim();
    const trimmedValue = rest.join('=').trim();

    if (trimmedKey && trimmedValue) {
      headers[trimmedKey] = trimmedValue;
    }

    return headers;
  }, {});
};

const parseResourceAttributes = (
  value: string | undefined
): Record<string, string> | undefined => {
  if (!value) {
    return undefined;
  }

  return value.split(',').reduce<Record<string, string>>((attributes, pair) => {
    const [key, ...rest] = pair.split('=');
    const trimmedKey = key?.trim();
    const trimmedValue = rest.join('=').trim();

    if (trimmedKey && trimmedValue) {
      attributes[trimmedKey] = trimmedValue;
    }

    return attributes;
  }, {});
};

const mergeSignalConfig = <T extends { enabled?: boolean; exporter?: SignalExporter }>(
  pluginValue: T | undefined,
  defaults: T,
  envExporterKey: string,
  useEnvironmentVariables: boolean
): T & { enabled: boolean; exporter: SignalExporter } => {
  const exporter = useEnvironmentVariables
    ? parseSignalExporter(
        process.env[envExporterKey],
        pluginValue?.exporter ?? defaults.exporter ?? 'otlp'
      )
    : (pluginValue?.exporter ?? defaults.exporter ?? 'otlp');

  const enabled = useEnvironmentVariables
    ? exporter !== 'none' && (pluginValue?.enabled ?? defaults.enabled ?? true)
    : (pluginValue?.enabled ?? defaults.enabled ?? true) && exporter !== 'none';

  return {
    ...defaults,
    ...pluginValue,
    enabled,
    exporter,
  };
};

export const resolveConfig = (
  pluginConfig: OpenTelemetryPluginConfig = {}
): ResolvedOpenTelemetryConfig => {
  const merged: OpenTelemetryPluginConfig = {
    ...defaultConfig,
    ...pluginConfig,
    traces: { ...defaultConfig.traces, ...pluginConfig.traces },
    metrics: { ...defaultConfig.metrics, ...pluginConfig.metrics },
    logs: { ...defaultConfig.logs, ...pluginConfig.logs },
    instrumentations: {
      ...defaultConfig.instrumentations,
      ...pluginConfig.instrumentations,
    },
    http: { ...defaultConfig.http, ...pluginConfig.http },
    lifecycles: { ...defaultConfig.lifecycles, ...pluginConfig.lifecycles },
  };

  const useEnvironmentVariables = merged.useEnvironmentVariables ?? true;

  const serviceName = useEnvironmentVariables
    ? process.env.OTEL_SERVICE_NAME || merged.serviceName || 'strapi'
    : merged.serviceName || 'strapi';

  const serviceVersion = useEnvironmentVariables
    ? process.env.OTEL_SERVICE_VERSION || merged.serviceVersion
    : merged.serviceVersion;

  const serviceInstanceId = useEnvironmentVariables
    ? process.env.OTEL_SERVICE_INSTANCE_ID ||
      merged.serviceInstanceId ||
      process.env.HOSTNAME ||
      hostname()
    : merged.serviceInstanceId || process.env.HOSTNAME || hostname();

  const resourceAttributes = {
    ...(useEnvironmentVariables
      ? parseResourceAttributes(process.env.OTEL_RESOURCE_ATTRIBUTES)
      : undefined),
    ...merged.resourceAttributes,
  };

  const protocol = useEnvironmentVariables
    ? parseProtocol(process.env.OTEL_EXPORTER_OTLP_PROTOCOL, merged.traces?.protocol || 'grpc')
    : (merged.traces?.protocol || 'grpc');

  const traces = mergeSignalConfig(
    merged.traces,
    defaultConfig.traces!,
    'OTEL_TRACES_EXPORTER',
    useEnvironmentVariables
  );

  const metrics = {
    ...mergeSignalConfig(
      merged.metrics,
      defaultConfig.metrics!,
      'OTEL_METRICS_EXPORTER',
      useEnvironmentVariables
    ),
    exportIntervalMillis: useEnvironmentVariables
      ? parseNumber(
          process.env.OTEL_METRIC_EXPORT_INTERVAL,
          merged.metrics?.exportIntervalMillis ?? 60_000
        )
      : (merged.metrics?.exportIntervalMillis ?? 60_000),
    runtimeNode: merged.metrics?.runtimeNode ?? true,
    hostMetrics: merged.metrics?.hostMetrics ?? true,
    httpMetrics: merged.metrics?.httpMetrics ?? true,
    lifecycleMetrics: merged.metrics?.lifecycleMetrics ?? true,
    protocol: useEnvironmentVariables
      ? parseProtocol(
          process.env.OTEL_EXPORTER_OTLP_PROTOCOL,
          merged.metrics?.protocol || protocol
        )
      : (merged.metrics?.protocol || protocol),
    endpoint: useEnvironmentVariables
      ? process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ||
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
        merged.metrics?.endpoint
      : merged.metrics?.endpoint,
    headers:
      (useEnvironmentVariables
        ? parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS)
        : undefined) || merged.metrics?.headers,
    timeoutMillis: merged.metrics?.timeoutMillis,
  };

  const logs = {
    ...mergeSignalConfig(
      merged.logs,
      defaultConfig.logs!,
      'OTEL_LOGS_EXPORTER',
      useEnvironmentVariables
    ),
    protocol: useEnvironmentVariables
      ? parseProtocol(process.env.OTEL_EXPORTER_OTLP_PROTOCOL, merged.logs?.protocol || protocol)
      : (merged.logs?.protocol || protocol),
    endpoint: useEnvironmentVariables
      ? process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT ||
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
        merged.logs?.endpoint
      : merged.logs?.endpoint,
    headers:
      (useEnvironmentVariables
        ? parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS)
        : undefined) || merged.logs?.headers,
    timeoutMillis: merged.logs?.timeoutMillis,
  };

  const tracesResolved = {
    ...traces,
    protocol: useEnvironmentVariables
      ? parseProtocol(process.env.OTEL_EXPORTER_OTLP_PROTOCOL, merged.traces?.protocol || protocol)
      : (merged.traces?.protocol || protocol),
    endpoint: useEnvironmentVariables
      ? process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
        merged.traces?.endpoint
      : merged.traces?.endpoint,
    headers:
      (useEnvironmentVariables
        ? parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS)
        : undefined) || merged.traces?.headers,
    timeoutMillis: merged.traces?.timeoutMillis,
  };

  const enabled = merged.enabled ?? true;

  return {
    enabled,
    useEnvironmentVariables,
    serviceName,
    serviceVersion,
    serviceInstanceId,
    resourceAttributes,
    diagLogLevel:
      useEnvironmentVariables && process.env.OTEL_LOG_LEVEL !== undefined
        ? parseDiagLogLevel(process.env.OTEL_LOG_LEVEL, merged.diagLogLevel || 'error')
        : merged.diagLogLevel || 'error',
    traces: tracesResolved,
    metrics,
    logs,
    instrumentations: {
      enabled: merged.instrumentations?.enabled ?? true,
      http: merged.instrumentations?.http ?? true,
      koa: merged.instrumentations?.koa ?? true,
      pg: merged.instrumentations?.pg ?? true,
      dns: merged.instrumentations?.dns ?? true,
      net: merged.instrumentations?.net ?? true,
    },
    http: {
      enabled: merged.http?.enabled ?? true,
      ignorePaths: merged.http?.ignorePaths ?? DEFAULT_IGNORE_PATHS,
      normalize: merged.http?.normalize ?? DEFAULT_NORMALIZE_RULES,
      recordPayloadSizes: merged.http?.recordPayloadSizes ?? true,
    },
    lifecycles: {
      enabled: merged.lifecycles?.enabled ?? true,
      events: (merged.lifecycles?.events ?? DEFAULT_LIFECYCLE_EVENTS) as LifecycleEvent[],
      contentTypes: merged.lifecycles?.contentTypes ?? [],
    },
  };
};

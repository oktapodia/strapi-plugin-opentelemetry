import { diag, DiagConsoleLogger, DiagLogLevel, metrics, trace } from '@opentelemetry/api';
import { logs } from '@opentelemetry/api-logs';
import { HostMetrics } from '@opentelemetry/host-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { LoggerProvider, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ATTR_SERVICE_INSTANCE_ID,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

import type { ResolvedOpenTelemetryConfig } from '../config/types';
import { buildInstrumentations } from '../utils/build-instrumentations';
import {
  createLogExporter,
  createMetricExporter,
  createTraceExporter,
} from '../utils/build-exporters';

const GLOBAL_INITIALIZED_KEY = Symbol.for('strapi.plugin.opentelemetry.initialized');
const GLOBAL_SDK_KEY = Symbol.for('strapi.plugin.opentelemetry.sdk');
const GLOBAL_HOST_METRICS_KEY = Symbol.for('strapi.plugin.opentelemetry.hostMetrics');
const GLOBAL_LOGGER_PROVIDER_KEY = Symbol.for('strapi.plugin.opentelemetry.loggerProvider');

type GlobalState = typeof globalThis & {
  [GLOBAL_INITIALIZED_KEY]?: boolean;
  [GLOBAL_SDK_KEY]?: NodeSDK;
  [GLOBAL_HOST_METRICS_KEY]?: HostMetrics;
  [GLOBAL_LOGGER_PROVIDER_KEY]?: LoggerProvider;
};

const globalState = globalThis as GlobalState;

const diagLevelMap: Record<string, DiagLogLevel> = {
  none: DiagLogLevel.NONE,
  error: DiagLogLevel.ERROR,
  warn: DiagLogLevel.WARN,
  info: DiagLogLevel.INFO,
  debug: DiagLogLevel.DEBUG,
  verbose: DiagLogLevel.VERBOSE,
  all: DiagLogLevel.ALL,
};

const configureDiagnostics = (level: ResolvedOpenTelemetryConfig['diagLogLevel']) => {
  if (level === 'none') {
    return;
  }

  diag.setLogger(new DiagConsoleLogger(), diagLevelMap[level] ?? DiagLogLevel.ERROR);
};

const buildResource = (config: ResolvedOpenTelemetryConfig) => {
  const attributes: Record<string, string> = {
    [ATTR_SERVICE_NAME]: config.serviceName,
    [ATTR_SERVICE_INSTANCE_ID]: config.serviceInstanceId,
    ...config.resourceAttributes,
  };

  if (config.serviceVersion) {
    attributes[ATTR_SERVICE_VERSION] = config.serviceVersion;
  }

  return resourceFromAttributes(attributes);
};

const hasActiveSignals = (config: ResolvedOpenTelemetryConfig) => {
  return (
    (config.traces.enabled && config.traces.exporter === 'otlp') ||
    (config.metrics.enabled && config.metrics.exporter === 'otlp') ||
    (config.logs.enabled && config.logs.exporter === 'otlp')
  );
};

export const initializeTelemetry = async (
  config: ResolvedOpenTelemetryConfig,
  logger?: { info: (message: string) => void; error: (message: string, error?: unknown) => void }
): Promise<boolean> => {
  if (!config.enabled) {
    return false;
  }

  if (globalState[GLOBAL_INITIALIZED_KEY]) {
    return true;
  }

  if (!hasActiveSignals(config)) {
    logger?.info('[opentelemetry] all signals disabled — skipping SDK startup');
    return false;
  }

  configureDiagnostics(config.diagLogLevel);

  const resource = buildResource(config);
  const instrumentations = buildInstrumentations(config.instrumentations, config.metrics);

  const traceExporter =
    config.traces.enabled && config.traces.exporter === 'otlp'
      ? createTraceExporter(config.traces.protocol, config.traces)
      : undefined;

  const metricExporter =
    config.metrics.enabled && config.metrics.exporter === 'otlp'
      ? createMetricExporter(config.metrics.protocol, config.metrics)
      : undefined;

  const metricReader = metricExporter
    ? new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: config.metrics.exportIntervalMillis,
      })
    : undefined;

  const logExporter =
    config.logs.enabled && config.logs.exporter === 'otlp'
      ? createLogExporter(config.logs.protocol, config.logs)
      : undefined;

  const sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader,
    instrumentations,
  });

  if (logExporter) {
    const loggerProvider = new LoggerProvider({
      resource,
      processors: [new SimpleLogRecordProcessor(logExporter)],
    });
    logs.setGlobalLoggerProvider(loggerProvider);
    globalState[GLOBAL_LOGGER_PROVIDER_KEY] = loggerProvider;
  }

  try {
    await sdk.start();
    globalState[GLOBAL_INITIALIZED_KEY] = true;
    globalState[GLOBAL_SDK_KEY] = sdk;

    if (config.metrics.hostMetrics && config.metrics.enabled && config.metrics.exporter === 'otlp') {
      const hostMetrics = new HostMetrics({ name: config.serviceName });
      hostMetrics.start();
      globalState[GLOBAL_HOST_METRICS_KEY] = hostMetrics;
    }

    logger?.info(
      `[opentelemetry] started (service=${config.serviceName}, traces=${config.traces.enabled && config.traces.exporter === 'otlp'}, metrics=${config.metrics.enabled && config.metrics.exporter === 'otlp'}, logs=${config.logs.enabled && config.logs.exporter === 'otlp'})`
    );

    return true;
  } catch (error) {
    logger?.error('[opentelemetry] failed to start SDK', error);
    return false;
  }
};

export const shutdownTelemetry = async (
  logger?: { info: (message: string) => void; error: (message: string, error?: unknown) => void }
) => {
  const sdk = globalState[GLOBAL_SDK_KEY];
  const loggerProvider = globalState[GLOBAL_LOGGER_PROVIDER_KEY];

  if (!sdk) {
    return;
  }

  try {
    await loggerProvider?.shutdown();
    await sdk.shutdown();
    globalState[GLOBAL_INITIALIZED_KEY] = false;
    globalState[GLOBAL_SDK_KEY] = undefined;
    globalState[GLOBAL_HOST_METRICS_KEY] = undefined;
    globalState[GLOBAL_LOGGER_PROVIDER_KEY] = undefined;
    logger?.info('[opentelemetry] shut down successfully');
  } catch (error) {
    logger?.error('[opentelemetry] shutdown failed', error);
  }
};

export const getMeter = (name = 'strapi-plugin-opentelemetry', version = '0.1.1') => {
  return metrics.getMeter(name, version);
};

export const getTracer = (name = 'strapi-plugin-opentelemetry', version = '0.1.1') => {
  return trace.getTracer(name, version);
};

export const isTelemetryInitialized = () => Boolean(globalState[GLOBAL_INITIALIZED_KEY]);

import type { OpenTelemetryPluginConfig } from './types';

export const DEFAULT_LIFECYCLE_EVENTS = [
  'beforeCreate',
  'afterCreate',
  'beforeUpdate',
  'afterUpdate',
  'beforeDelete',
  'afterDelete',
  'beforeFindOne',
  'afterFindOne',
  'beforeFindMany',
  'afterFindMany',
] as const;

export const DEFAULT_IGNORE_PATHS = ['/favicon.ico', '/_health', '/admin/_health'];

export const DEFAULT_NORMALIZE_RULES: Array<[string, string]> = [
  ['\\/(?:[a-f0-9]{24,25}|[a-f0-9-]{36})(?=\\/|$)', '/:id'],
  ['\\/\\d+(?=\\/|$)', '/:id'],
  ['\\/uploads\\/[^/]+\\.[a-zA-Z0-9]+', '/uploads/:file'],
];

export const defaultConfig: OpenTelemetryPluginConfig = {
  enabled: true,
  useEnvironmentVariables: true,
  serviceName: 'strapi',
  diagLogLevel: 'error',
  traces: {
    enabled: true,
    exporter: 'otlp',
    protocol: 'grpc',
  },
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
  logs: {
    enabled: false,
    exporter: 'otlp',
    protocol: 'grpc',
  },
  instrumentations: {
    enabled: true,
    http: true,
    koa: true,
    pg: true,
    dns: true,
    net: true,
  },
  http: {
    enabled: true,
    ignorePaths: DEFAULT_IGNORE_PATHS,
    normalize: DEFAULT_NORMALIZE_RULES,
    recordPayloadSizes: true,
  },
  lifecycles: {
    enabled: true,
    events: [...DEFAULT_LIFECYCLE_EVENTS],
    contentTypes: [],
  },
};

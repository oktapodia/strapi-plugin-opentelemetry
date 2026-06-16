import type { Core } from '@strapi/strapi';

import { resolveConfig } from './config/resolve-config';
import registerDatabaseLifecycles from './lifecycles/database';
import createHttpMetricsMiddleware from './middlewares/http-metrics';
import { isTelemetryInitialized } from './services/telemetry';

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  const pluginConfig = strapi.config.get('plugin::opentelemetry') as Record<string, unknown>;
  const config = resolveConfig(pluginConfig);

  if (!config.enabled || !isTelemetryInitialized()) {
    return;
  }

  if (config.http.enabled && config.metrics.httpMetrics) {
    strapi.server.use(createHttpMetricsMiddleware(config));
  }

  if (config.lifecycles.enabled && config.metrics.lifecycleMetrics) {
    registerDatabaseLifecycles(strapi, config);
  }

  strapi.log.info('[opentelemetry] middleware and lifecycle instrumentation registered');
};

export default bootstrap;

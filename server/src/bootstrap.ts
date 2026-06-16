import type { Core } from '@strapi/strapi';

import registerDatabaseLifecycles from './lifecycles/database';
import createHttpMetricsMiddleware from './middlewares/http-metrics';

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  const telemetry = strapi.plugin('opentelemetry').service('telemetry');
  const config = telemetry.getConfig();

  if (!config.enabled || !telemetry.isInitialized()) {
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

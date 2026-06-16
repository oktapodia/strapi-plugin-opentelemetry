import type { Context, Next } from 'koa';

import type { ResolvedOpenTelemetryConfig } from '../config/types';
import { normalizePath, shouldIgnorePath } from '../utils/normalize-path';
import { getMeter } from '../services/telemetry';

const METER_NAME = 'strapi.http';

export const createHttpMetricsMiddleware = (config: ResolvedOpenTelemetryConfig) => {
  if (!config.http.enabled || !config.metrics.httpMetrics) {
    return async (_ctx: Context, next: Next) => next();
  }

  const meter = getMeter(METER_NAME);
  const requestDuration = meter.createHistogram('http.server.request.duration', {
    description: 'Duration of HTTP requests in seconds',
    unit: 's',
  });
  const activeRequests = meter.createUpDownCounter('http.server.active_requests', {
    description: 'Number of active HTTP requests',
  });
  const requestBodySize = meter.createHistogram('http.server.request.body.size', {
    description: 'Size of HTTP request bodies in bytes',
    unit: 'By',
  });
  const responseBodySize = meter.createHistogram('http.server.response.body.size', {
    description: 'Size of HTTP response bodies in bytes',
    unit: 'By',
  });

  return async (ctx: Context, next: Next) => {
    const rawPath = ctx._matchedRoute || ctx.path;
    if (shouldIgnorePath(rawPath, config.http.ignorePaths)) {
      await next();
      return;
    }

    const route = normalizePath(rawPath, config.http.normalize, { method: ctx.method });
    const attributes = {
      'http.request.method': ctx.method,
      'http.route': route,
    };

    activeRequests.add(1, attributes);
    const start = process.hrtime.bigint();

    if (config.http.recordPayloadSizes) {
      const requestLength = Number(ctx.request.length || 0);
      if (requestLength > 0) {
        requestBodySize.record(requestLength, attributes);
      }
    }

    try {
      await next();
    } finally {
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1_000_000_000;
      const responseAttributes = {
        ...attributes,
        'http.response.status_code': ctx.status,
      };

      requestDuration.record(durationSeconds, responseAttributes);
      activeRequests.add(-1, attributes);

      if (config.http.recordPayloadSizes) {
        const responseLength = Number(ctx.response.length || 0);
        if (responseLength > 0) {
          responseBodySize.record(responseLength, responseAttributes);
        }
      }
    }
  };
};

export default createHttpMetricsMiddleware;

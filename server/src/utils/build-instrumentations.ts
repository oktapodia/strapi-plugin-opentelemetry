import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { RuntimeNodeInstrumentation } from '@opentelemetry/instrumentation-runtime-node';
import type { Instrumentation } from '@opentelemetry/instrumentation';

import type { InstrumentationsConfig, MetricsConfig } from '../config/types';

export const buildInstrumentations = (
  config: InstrumentationsConfig,
  metrics: MetricsConfig
): Instrumentation[] => {
  if (!config.enabled) {
    return [];
  }

  const instrumentations: Instrumentation[] = getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        enabled: config.http,
        ignoreIncomingRequestHook: (request) => {
          const url = request.url || '';
          return url.includes('/_health') || url.includes('/favicon.ico');
        },
      },
      '@opentelemetry/instrumentation-koa': { enabled: config.koa },
      '@opentelemetry/instrumentation-pg': { enabled: config.pg },
      '@opentelemetry/instrumentation-dns': { enabled: config.dns },
      '@opentelemetry/instrumentation-net': { enabled: config.net },
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-express': { enabled: false },
    });

  if (metrics.runtimeNode) {
    instrumentations.push(new RuntimeNodeInstrumentation());
  }

  return instrumentations;
};

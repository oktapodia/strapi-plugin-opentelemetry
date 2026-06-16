import type { Core } from '@strapi/strapi';

import { resolveConfig } from '../config/resolve-config';
import type { ResolvedOpenTelemetryConfig } from '../config/types';
import {
  getMeter,
  getTracer,
  initializeTelemetry,
  isTelemetryInitialized,
  shutdownTelemetry,
} from './telemetry';

type TelemetryService = {
  getConfig(): ResolvedOpenTelemetryConfig;
  initialize(): Promise<boolean>;
  shutdown(): Promise<void>;
  isInitialized(): boolean;
  getMeter: typeof getMeter;
  getTracer: typeof getTracer;
};

const telemetry = ({ strapi }: { strapi: Core.Strapi }): TelemetryService => {
  const getConfig = () => {
    const pluginConfig = strapi.config.get('plugin::opentelemetry') as Record<string, unknown>;
    return resolveConfig(pluginConfig);
  };

  return {
    getConfig,
    initialize: async () => initializeTelemetry(getConfig(), strapi.log),
    shutdown: async () => shutdownTelemetry(strapi.log),
    isInitialized: isTelemetryInitialized,
    getMeter,
    getTracer,
  };
};

export default {
  telemetry,
};

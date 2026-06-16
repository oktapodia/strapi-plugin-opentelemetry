import type { Core } from '@strapi/strapi';

import { resolveConfig } from './config/resolve-config';
import { initializeTelemetry } from './services/telemetry';

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  const pluginConfig = strapi.config.get('plugin::opentelemetry') as Record<string, unknown>;
  const config = resolveConfig(pluginConfig);

  if (!config.enabled) {
    return;
  }

  void initializeTelemetry(config, strapi.log);
};

export default register;

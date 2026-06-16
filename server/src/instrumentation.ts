import { resolveConfig } from './config/resolve-config';
import { initializeTelemetry } from './services/telemetry';

const pluginConfig = process.env.STRAPI_OTEL_CONFIG
  ? (JSON.parse(process.env.STRAPI_OTEL_CONFIG) as Record<string, unknown>)
  : {};

const config = resolveConfig(pluginConfig);

void initializeTelemetry(config, console);

import { defaultConfig } from './defaults';
import { resolveConfig } from './resolve-config';
import type { OpenTelemetryPluginConfig } from './types';

export default {
  default: defaultConfig,
  validator(config: unknown) {
    if (config === undefined || config === null) {
      return;
    }

    if (typeof config !== 'object') {
      throw new Error('plugin::opentelemetry config must be an object');
    }

    resolveConfig(config as OpenTelemetryPluginConfig);
  },
};

export { resolveConfig };
export type { OpenTelemetryPluginConfig, ResolvedOpenTelemetryConfig } from './types';

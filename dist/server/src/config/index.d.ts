import { resolveConfig } from './resolve-config';
import { OpenTelemetryPluginConfig } from './types';
declare const _default: {
    default: OpenTelemetryPluginConfig;
    validator(config: unknown): void;
};
export default _default;
export { resolveConfig };
export type { OpenTelemetryPluginConfig, ResolvedOpenTelemetryConfig } from './types';

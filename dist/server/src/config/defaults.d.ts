import { OpenTelemetryPluginConfig } from './types';
export declare const DEFAULT_LIFECYCLE_EVENTS: readonly ["beforeCreate", "afterCreate", "beforeUpdate", "afterUpdate", "beforeDelete", "afterDelete", "beforeFindOne", "afterFindOne", "beforeFindMany", "afterFindMany"];
export declare const DEFAULT_IGNORE_PATHS: string[];
export declare const DEFAULT_NORMALIZE_RULES: Array<[string, string]>;
export declare const defaultConfig: OpenTelemetryPluginConfig;

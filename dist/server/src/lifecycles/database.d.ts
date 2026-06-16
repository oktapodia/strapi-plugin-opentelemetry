import { Core } from '@strapi/strapi';
import { ResolvedOpenTelemetryConfig } from '../config/types';
export declare const registerDatabaseLifecycles: (strapi: Core.Strapi, config: ResolvedOpenTelemetryConfig) => void;
export default registerDatabaseLifecycles;

import { Core } from '@strapi/strapi';
import { ResolvedOpenTelemetryConfig } from '../config/types';
import { getMeter, getTracer } from './telemetry';
type TelemetryService = {
    getConfig(): ResolvedOpenTelemetryConfig;
    initialize(): Promise<boolean>;
    shutdown(): Promise<void>;
    isInitialized(): boolean;
    getMeter: typeof getMeter;
    getTracer: typeof getTracer;
};
declare const createTelemetryService: ({ strapi }: {
    strapi: Core.Strapi;
}) => TelemetryService;
export default createTelemetryService;

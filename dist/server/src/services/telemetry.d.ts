import { ResolvedOpenTelemetryConfig } from '../config/types';
export declare const initializeTelemetry: (config: ResolvedOpenTelemetryConfig, logger?: {
    info: (message: string) => void;
    error: (message: string, error?: unknown) => void;
}) => Promise<boolean>;
export declare const shutdownTelemetry: (logger?: {
    info: (message: string) => void;
    error: (message: string, error?: unknown) => void;
}) => Promise<void>;
export declare const getMeter: (name?: string, version?: string) => import('@opentelemetry/api').Meter;
export declare const getTracer: (name?: string, version?: string) => import('@opentelemetry/api').Tracer;
export declare const isTelemetryInitialized: () => boolean;

import { Context, Next } from 'koa';
import { ResolvedOpenTelemetryConfig } from '../config/types';
export declare const createHttpMetricsMiddleware: (config: ResolvedOpenTelemetryConfig) => (_ctx: Context, next: Next) => Promise<any>;
export default createHttpMetricsMiddleware;

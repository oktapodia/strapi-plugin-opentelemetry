export type DiagLogLevelName = 'none' | 'error' | 'warn' | 'info' | 'debug' | 'verbose' | 'all';
export type OtlpProtocol = 'grpc' | 'http/protobuf' | 'http/json';
export type SignalExporter = 'otlp' | 'none';
export interface OtlpExporterConfig {
    /** `otlp` pushes to a collector; `none` disables this signal. */
    exporter?: SignalExporter;
    /** OTLP transport. Falls back to `OTEL_EXPORTER_OTLP_PROTOCOL` when `useEnvironmentVariables` is true. */
    protocol?: OtlpProtocol;
    /** Full signal endpoint URL. Falls back to standard `OTEL_EXPORTER_OTLP_*_ENDPOINT` env vars. */
    endpoint?: string;
    /** Additional HTTP/gRPC metadata headers (e.g. API keys). */
    headers?: Record<string, string>;
    /** Export timeout in milliseconds. */
    timeoutMillis?: number;
}
export type NormalizeRule = [string, string];
export type NormalizeConfig = NormalizeRule[] | ((path: string, ctx: {
    method: string;
}) => string);
export interface TracesConfig extends OtlpExporterConfig {
    enabled?: boolean;
}
export interface MetricsConfig extends OtlpExporterConfig {
    enabled?: boolean;
    /** Metrics export interval in milliseconds. */
    exportIntervalMillis?: number;
    /** Collect Node.js runtime metrics (event loop, GC, heap). */
    runtimeNode?: boolean;
    /** Collect host-level CPU/memory metrics. */
    hostMetrics?: boolean;
    /** Record HTTP request metrics via Strapi middleware. */
    httpMetrics?: boolean;
    /** Record Strapi database lifecycle durations. */
    lifecycleMetrics?: boolean;
}
export interface LogsConfig extends OtlpExporterConfig {
    enabled?: boolean;
}
export interface InstrumentationsConfig {
    enabled?: boolean;
    http?: boolean;
    koa?: boolean;
    pg?: boolean;
    dns?: boolean;
    net?: boolean;
}
export interface HttpMetricsConfig {
    enabled?: boolean;
    /** Paths to exclude from HTTP metrics (exact match or RegExp source string). */
    ignorePaths?: string[];
    /** Collapse dynamic path segments to control metric cardinality. */
    normalize?: NormalizeConfig;
    /** Record request/response payload sizes. */
    recordPayloadSizes?: boolean;
}
export type LifecycleEvent = 'beforeCreate' | 'afterCreate' | 'beforeUpdate' | 'afterUpdate' | 'beforeDelete' | 'afterDelete' | 'beforeFindOne' | 'afterFindOne' | 'beforeFindMany' | 'afterFindMany';
export interface LifecyclesConfig {
    enabled?: boolean;
    /** Lifecycle events to instrument. Defaults to all supported events. */
    events?: LifecycleEvent[];
    /** Content-type UIDs to watch. Empty array = all content types. */
    contentTypes?: string[];
}
export interface OpenTelemetryPluginConfig {
    /** Master switch. Also controlled by `enabled` in `config/plugins`. */
    enabled?: boolean;
    /** When true (default), standard `OTEL_*` environment variables override plugin config. */
    useEnvironmentVariables?: boolean;
    /** Service name sent with all telemetry. Defaults to `OTEL_SERVICE_NAME` or `strapi`. */
    serviceName?: string;
    serviceVersion?: string;
    serviceInstanceId?: string;
    /** Extra resource attributes attached to every signal. */
    resourceAttributes?: Record<string, string>;
    /** OpenTelemetry internal diagnostic logging level. */
    diagLogLevel?: DiagLogLevelName;
    traces?: TracesConfig;
    metrics?: MetricsConfig;
    logs?: LogsConfig;
    instrumentations?: InstrumentationsConfig;
    http?: HttpMetricsConfig;
    lifecycles?: LifecyclesConfig;
}
export interface ResolvedOpenTelemetryConfig {
    enabled: boolean;
    useEnvironmentVariables: boolean;
    serviceName: string;
    serviceVersion?: string;
    serviceInstanceId: string;
    resourceAttributes: Record<string, string>;
    diagLogLevel: DiagLogLevelName;
    traces: Required<Pick<TracesConfig, 'enabled' | 'exporter' | 'protocol'>> & Omit<TracesConfig, 'enabled' | 'exporter' | 'protocol'>;
    metrics: Required<Pick<MetricsConfig, 'enabled' | 'exporter' | 'protocol' | 'exportIntervalMillis' | 'runtimeNode' | 'hostMetrics' | 'httpMetrics' | 'lifecycleMetrics'>> & Omit<MetricsConfig, 'enabled' | 'exporter' | 'protocol' | 'exportIntervalMillis' | 'runtimeNode' | 'hostMetrics' | 'httpMetrics' | 'lifecycleMetrics'>;
    logs: Required<Pick<LogsConfig, 'enabled' | 'exporter' | 'protocol'>> & Omit<LogsConfig, 'enabled' | 'exporter' | 'protocol'>;
    instrumentations: Required<InstrumentationsConfig>;
    http: Required<Pick<HttpMetricsConfig, 'enabled' | 'ignorePaths' | 'recordPayloadSizes'>> & Pick<HttpMetricsConfig, 'normalize'>;
    lifecycles: Required<Pick<LifecyclesConfig, 'enabled' | 'events' | 'contentTypes'>>;
}

import { LogRecordExporter } from '@opentelemetry/sdk-logs';
import { PushMetricExporter } from '@opentelemetry/sdk-metrics';
import { SpanExporter } from '@opentelemetry/sdk-trace-base';
import { LogsConfig, MetricsConfig, OtlpProtocol, TracesConfig } from '../config/types';
declare const createTraceExporter: (protocol: OtlpProtocol, config: TracesConfig) => SpanExporter | undefined;
declare const createMetricExporter: (protocol: OtlpProtocol, config: MetricsConfig) => PushMetricExporter | undefined;
declare const createLogExporter: (protocol: OtlpProtocol, config: LogsConfig) => LogRecordExporter | undefined;
export { createLogExporter, createMetricExporter, createTraceExporter };

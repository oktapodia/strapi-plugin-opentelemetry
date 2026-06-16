import { OTLPLogExporter as GrpcLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { OTLPLogExporter as HttpLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPMetricExporter as GrpcMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPMetricExporter as HttpMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter as GrpcTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPTraceExporter as HttpTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import type { LogRecordExporter } from '@opentelemetry/sdk-logs';
import type { PushMetricExporter } from '@opentelemetry/sdk-metrics';
import type { SpanExporter } from '@opentelemetry/sdk-trace-base';

import type { LogsConfig, MetricsConfig, OtlpProtocol, TracesConfig } from '../config/types';

type ExporterOptions = {
  endpoint?: string;
  headers?: Record<string, string>;
  timeoutMillis?: number;
};

const buildExporterOptions = (config: ExporterOptions) => {
  const options: ExporterOptions & { url?: string } = {};

  if (config.endpoint) {
    options.url = config.endpoint;
  }

  if (config.headers) {
    options.headers = config.headers;
  }

  if (config.timeoutMillis) {
    options.timeoutMillis = config.timeoutMillis;
  }

  return options;
};

const createTraceExporter = (
  protocol: OtlpProtocol,
  config: TracesConfig
): SpanExporter | undefined => {
  const options = buildExporterOptions(config);

  if (protocol === 'grpc') {
    return new GrpcTraceExporter(options);
  }

  return new HttpTraceExporter(options);
};

const createMetricExporter = (
  protocol: OtlpProtocol,
  config: MetricsConfig
): PushMetricExporter | undefined => {
  const options = buildExporterOptions(config);

  if (protocol === 'grpc') {
    return new GrpcMetricExporter(options);
  }

  return new HttpMetricExporter(options);
};

const createLogExporter = (
  protocol: OtlpProtocol,
  config: LogsConfig
): LogRecordExporter | undefined => {
  const options = buildExporterOptions(config);

  if (protocol === 'http/json') {
    throw new Error('OpenTelemetry logs do not support http/json in this plugin. Use grpc or http/protobuf.');
  }

  if (protocol === 'grpc') {
    return new GrpcLogExporter(options);
  }

  return new HttpLogExporter(options);
};

export { createLogExporter, createMetricExporter, createTraceExporter };

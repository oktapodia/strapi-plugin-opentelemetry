import { Instrumentation } from '@opentelemetry/instrumentation';
import { InstrumentationsConfig, MetricsConfig } from '../config/types';
export declare const buildInstrumentations: (config: InstrumentationsConfig, metrics: MetricsConfig) => Instrumentation[];

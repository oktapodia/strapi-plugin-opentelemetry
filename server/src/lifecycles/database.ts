import type { Core } from '@strapi/strapi';
import type { Span } from '@opentelemetry/api';

import type { LifecycleEvent, ResolvedOpenTelemetryConfig } from '../config/types';
import { getMeter, getTracer } from '../services/telemetry';

const METER_NAME = 'strapi.lifecycle';
const TRACER_NAME = 'strapi.lifecycle';

type LifecycleEventState = {
  start: bigint;
  span?: Span;
};

type InstrumentedLifecycleEvent = {
  model: { uid: string };
  state?: LifecycleEventState;
};

const beforeEvents: LifecycleEvent[] = [
  'beforeCreate',
  'beforeUpdate',
  'beforeDelete',
  'beforeFindOne',
  'beforeFindMany',
];

const afterEvents: LifecycleEvent[] = [
  'afterCreate',
  'afterUpdate',
  'afterDelete',
  'afterFindOne',
  'afterFindMany',
];

export const registerDatabaseLifecycles = (
  strapi: Core.Strapi,
  config: ResolvedOpenTelemetryConfig
) => {
  if (!config.lifecycles.enabled || !config.metrics.lifecycleMetrics) {
    return;
  }

  const meter = getMeter(METER_NAME);
  const tracer = getTracer(TRACER_NAME);
  const durationHistogram = meter.createHistogram('strapi.db.lifecycle.duration', {
    description: 'Duration of Strapi database lifecycle events in seconds',
    unit: 's',
  });

  const trackedEvents = new Set<LifecycleEvent>(config.lifecycles.events);
  const contentTypeFilter = new Set(config.lifecycles.contentTypes);

  const shouldTrack = (uid: string) => {
    if (contentTypeFilter.size === 0) {
      return true;
    }

    return contentTypeFilter.has(uid);
  };

  const handleBefore = (eventName: LifecycleEvent) => {
    return async (event: InstrumentedLifecycleEvent) => {
      if (!trackedEvents.has(eventName) || !shouldTrack(event.model.uid)) {
        return;
      }

      const span = tracer.startSpan(`strapi.lifecycle.${eventName}`, {
        attributes: {
          'strapi.content_type': event.model.uid,
          'strapi.lifecycle.event': eventName,
        },
      });

      event.state = {
        start: process.hrtime.bigint(),
        span,
      };
    };
  };

  const handleAfter = (eventName: LifecycleEvent) => {
    return async (event: InstrumentedLifecycleEvent) => {
      if (!trackedEvents.has(eventName) || !shouldTrack(event.model.uid) || !event.state) {
        return;
      }

      const durationSeconds =
        Number(process.hrtime.bigint() - event.state.start) / 1_000_000_000;
      const attributes = {
        'strapi.content_type': event.model.uid,
        'strapi.lifecycle.event': eventName,
      };

      durationHistogram.record(durationSeconds, attributes);
      event.state.span?.setAttributes(attributes);
      event.state.span?.end();
      delete event.state;
    };
  };

  const handlers: Record<string, (event: InstrumentedLifecycleEvent) => Promise<void>> = {};

  for (const eventName of beforeEvents) {
    handlers[eventName] = handleBefore(eventName);
  }

  for (const eventName of afterEvents) {
    handlers[eventName] = handleAfter(eventName);
  }

  strapi.db.lifecycles.subscribe({
    models: config.lifecycles.contentTypes.length ? config.lifecycles.contentTypes : ['*'],
    ...handlers,
  });
};

export default registerDatabaseLifecycles;

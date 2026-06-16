import type { Core } from '@strapi/strapi';

import { shutdownTelemetry } from './services/telemetry';

const destroy = ({ strapi }: { strapi: Core.Strapi }) => {
  void shutdownTelemetry(strapi.log);
};

export default destroy;

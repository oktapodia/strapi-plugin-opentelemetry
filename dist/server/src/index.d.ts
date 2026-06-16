declare const _default: {
    register: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => void;
    bootstrap: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => void;
    destroy: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => void;
    config: {
        default: import('./config').OpenTelemetryPluginConfig;
        validator(config: unknown): void;
    };
    controllers: {};
    routes: {};
    services: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        getConfig(): import('./config').ResolvedOpenTelemetryConfig;
        initialize(): Promise<boolean>;
        shutdown(): Promise<void>;
        isInitialized(): boolean;
        getMeter: typeof import('./services/telemetry').getMeter;
        getTracer: typeof import('./services/telemetry').getTracer;
    };
    contentTypes: {};
    policies: {};
    middlewares: (config: import('./config').ResolvedOpenTelemetryConfig) => (_ctx: import('koa').Context, next: import('koa').Next) => Promise<any>;
};
export default _default;

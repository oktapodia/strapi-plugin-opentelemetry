import bootstrap from './bootstrap';
import destroy from './destroy';
import register from './register';
import config from './config';
import contentTypes from './content-types';
import controllers from './controllers';
import middlewares from './middlewares';
import policies from './policies';
import routes from './routes';
import services from './services';

type PluginExport = {
  register: typeof register;
  bootstrap: typeof bootstrap;
  destroy: typeof destroy;
  config: typeof config;
  controllers: typeof controllers;
  routes: typeof routes;
  services: typeof services;
  contentTypes: typeof contentTypes;
  policies: typeof policies;
  middlewares: typeof middlewares;
};

const plugin: PluginExport = {
  register,
  bootstrap,
  destroy,
  config,
  controllers,
  routes,
  services,
  contentTypes,
  policies,
  middlewares,
};

export default plugin;

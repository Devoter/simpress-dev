import { Route } from './route';

/**
 * @typedef {import('./types').RequestListener} RequestListener
 * @typedef {import('./types').Middleware} Middleware
 * @typedef {import('./types').ErrorMiddleware} ErrorMiddleware
 */

export class Router {
  /**
   * @readonly
   * @type {Map<string,Route>}
   */
  routes;

  /**
   * @readonly
   * @type {Middleware[]}
   */
  middlewares;

  /**
   * @readonly
   * @type {ErrorMiddleware[]}
   */
  errMiddlewares;

  constructor() {
    this.routes = new Map();
    this.middlewares = [];
    this.errMiddlewares = [];
  }

  /**
   * Appends a new middleware to the router.
   *
   * @param {Middleware} middleware
   * @returns {Router}
   */
  use(middleware) {
    if (!this.middlewares.includes(middleware)) {
      this.middlewares.push(middleware);
    }

    return this;
  }

  /**
   * Appends a new middleware to the router which handles errors from other middlewares.
   *
   * @param {ErrorMiddleware} middleware
   * @returns {Router}
   */
  useForError(middleware) {
    if (!this.errMiddlewares.includes(middleware)) {
      this.errMiddlewares.push(middleware);
    }

    return this;
  }

  /**
   * Appends a route.
   *
   * @param {string|RegExp} path route path
   * @param {string} method http method
   * @param {RequestListener} listener request listener function
   * @returns {Route} route instance
   */
  route(path, method, listener) {
    if (typeof path === 'string') path = new RegExp('^' + path + '\\/?$|\\?');

    const route = new Route(path, method, listener);

    this.routes.set(method + '|' + path.source, route);

    return route;
  }

  /**
   * Returns an existing route.
   *
   * @param {string|RegExp} path route path
   * @param {string} method http method
   * @returns {Route|null} route instance
   */
  findRoute(path, method) {
    if (typeof path === 'string') path = new RegExp('^' + path + '\\/?$|\\?');

    const route = this.routes.get(method + '|' + path.source);

    return route ? route : null;
  }
}

import { Route } from './route';
import { Router } from './router';

/**
 * @typedef {import('http').RequestListener} RequestListener
 * @typedef {import('./types').Middleware} Middleware
 * @typedef {import('./types').ErrorMiddleware} ErrorMiddleware
 */

/**
 * This class provides a simple http framework.
 */
export class Simpress {
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

  /**
   * @private
   * @type {Router[]}
   */
  _routers;

  constructor() {
    this.middlewares = [];
    this.errMiddlewares = [];
    this._routers = [new Router()];
  }

  /**
   * Appends a new middleware.
   *
   * @param {Middleware} middleware 
   * @returns {Simpress}
   */
  use(middleware) {
    if (!this.middlewares.includes(middleware)) {
      this.middlewares.push(middleware);
    }

    return this;
  }

  /**
   * Appends a new middleware which handles errors from other middlewares.
   *
   * @param {ErrorMiddleware} middleware 
   * @returns {Simpress}
   */
  useForError(middleware) {
    if (!this.errMiddlewares.includes(middleware)) {
      this.errMiddlewares.push(middleware);
    }

    return this;
  }

  /**
   * Appends a router to the instance.
   *
   * @param {Router} router 
   * @returns {Simpress}
   */
  useRouter(router) {
    if (!this._routers.includes(router)) {
      this._routers.push(router);
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

    this._routers[0].routes.set(method + '|' + path.source, route);

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

    for (const router of this._routers) {
      const route = router.routes.get(method + '|' + path.source);

      if (route) return route;
    }

    return null;
  }

  /**
   * Converts the instance to an @see http.RequestListener .
   *
   * @returns {RequestListener}
   */
  toListener() {
    return async (req, res) => {
      for (const router of this._routers) {
        for (const [_, route] of router.routes) {
          // check path and method
          if (route.path.test(req.url) && req.method === route.method) {
            req.pathRegex = route.path;

            for (const level of [this, router, route]) {
              for (const middleware of level.middlewares) {
                let err = await new Promise(resolve => middleware(req, res, resolve));

                if (err !== undefined) {
                  for (const errMiddleware of level.errMiddlewares) {
                    err = await new Promise(resolve => errMiddleware(err, req, res, resolve));

                    if (err === undefined) return;
                  }

                  return;
                }
              }
            }

            route.listener(req, res);

            return;
          }
        }
      }

      res.writeHead(404);
      res.end();
    }
  }
}
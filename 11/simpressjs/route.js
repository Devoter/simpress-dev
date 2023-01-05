/**
 * @typedef {import('./types').RequestListener} RequestListener
 * @typedef {import('./types').Middleware} Middleware
 * @typedef {import('./types').ErrorMiddleware} ErrorMiddleware
 */

export class Route {
  /**
   * Route path regular expression.
   *
   * @readonly
   * @type {RegExp}
   */
  path;

  /**
   * HTTP method.
   *
   * @readonly
   * @type {string}
   */
  method;

  /**
   * Request listener function.
   *
   * @readonly
   * @type {RequestListener}
   */
  listener;

  /**
   * Route-specified middlewares.
   *
   * @readonly
   * @type {Middleware[]}
   */
  middlewares;

  /**
   * Route-specified error middlewares.
   *
   * @readonly
   * @type {ErrorMiddleware[]}
   */
  errMiddlewares;

  /**
   * @param {RegExp} path route path
   * @param {string} method http method
   * @param {RequestListener} listener request listener function
   */
  constructor(path, method, listener) {
    this.path = path;
    this.method = method;
    this.listener = listener;
    this.middlewares = [];
    this.errMiddlewares = [];
  }

  /**
   * Appends a new middleware to the route.
   *
   * @param {Middleware} middleware
   * @returns {Route}
   */
  use(middleware) {
    if (!this.middlewares.includes(middleware)) {
      this.middlewares.push(middleware);
    }

    return this;
  }

  /**
   * Appends a new middleware to the route which handles errors from other middlewares.
   *
   * @param {ErrorMiddleware} middleware
   * @returns {Route}
   */
  useForError(middleware) {
    if (!this.errMiddlewares.includes(middleware)) {
      this.errMiddlewares.push(middleware);
    }

    return this;
  }
}

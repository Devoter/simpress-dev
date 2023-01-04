/**
 * @typedef {import('http').RequestListener} RequestListener
 */

export class Route {
  /**
   * Route path regular expression.
   *
   * @private
   * @readonly
   * @type {RegExp}
   */
  path;

  /**
   * HTTP method.
   *
   * @private
   * @readonly
   * @type {string}
   */
  method;

  /**
   * Request listener function.
   *
   * @private
   * @readonly
   * @type {RequestListener}
   */
  listener;

  /**
   * Route-specified middlewares.
   *
   * @private
   * @readonly
   * @type {Middleware[]}
   */
  middlewares;

  /**
   * Route-specified error middlewares.
   *
   * @private
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
   * @returns {Simpress}
   */
  useForError(middleware) {
    if (!this.errMiddlewares.includes(middleware)) {
      this.errMiddlewares.push(middleware);
    }

    return this;
  }
}
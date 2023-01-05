import http from 'http';
import url from 'url';

const host = 'localhost';
const port = 8000;

const ErrInvalidRequestBody = new Error('invalid request body');
const ErrInvalidNamePathParameter = new Error('invalid name path parameter');
const ErrNoQueryParams = new Error('no query params');

/**
 * @typedef {import('querystring').ParsedUrlQuery} ParsedUrlQuery
 *
 * @typedef {{ body?: unknown }} RawBody
 * @typedef {{ pathParams?: Record<string, string> | null }} PathParams
 * @typedef {{ queryParams?: ParsedUrlQuery }} QueryParams
 * @typedef {http.IncomingMessage & { pathRegex: RegExp } & RawBody & PathParams & QueryParams} Request
 * @typedef {http.ServerResponse & { req: Request }} Response
 * @typedef {(req: Request, res: Response) => void | Promise<void>} RequestListener
 * @typedef {(req: Request, res: Response, next: (err?: unknown) => void) => void} Middleware
 * @typedef {(err: unknown, req: Request, res: Response, next: (err?: unknown) => void) => void} ErrorMiddleware
 */

class Route {
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
   * Appends a new middleware which handles errors from other middlewares.
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

/**
 * This class provides a simple http framework.
 */
class Simpress {
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
   * @type {Map<string,Route>}
   */
  _routes;

  constructor() {
    this.middlewares = [];
    this.errMiddlewares = [];
    this._routes = new Map();
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
   * Appends a route.
   *
   * @param {string|RegExp} path route path
   * @param {string} method http method
   * @param {RequestListener} listener request listener function
   * @returns {Route} route instance
   */
  route(path, method, listener) {
    if (typeof path === 'string') path = new RegExp('^' + path);

    const route = new Route(path, method, listener);

    this._routes.set(method + '|' + path.source, route);

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
    if (typeof path === 'string') path = new RegExp('^' + path);

    const route = this._routes.get(method + '|' + path.source);

    return route ? route : null;
  }

  /**
   * Converts the instance to an @see http.RequestListener .
   *
   * @returns {http.RequestListener}
   */
  toListener() {
    /**
     *
     * @param {http.IncomingMessage & { pathRegex?: RegExp }} req
     * @param {http.ServerResponse} res
     * @returns
     */
    const listener = async (req, res) => {
      for (const [_, route] of this._routes) {
        // check path and method
        if (
          route.path.test(req.url ? req.url : '') &&
          req.method === route.method
        ) {
          req.pathRegex = route.path;

          for (const level of [this, route]) {
            for (const middleware of level.middlewares) {
              let err = await new Promise(resolve =>
                middleware(
                  /** @type {Request} */ (req),
                  /** @type {Response} */ (res),
                  resolve
                )
              );

              if (err !== undefined) {
                for (const errMiddleware of level.errMiddlewares) {
                  err = await new Promise(resolve =>
                    errMiddleware(
                      err,
                      /** @type {Request} */ (req),
                      /** @type {Response} */ (res),
                      resolve
                    )
                  );

                  if (err === undefined) return;
                }

                return;
              }
            }
          }

          route.listener(
            /** @type {Request} */ (req),
            /** @type {Response} */ (res)
          );

          return;
        }
      }

      res.writeHead(404);
      res.end();
    };

    return listener;
  }
}

/**
 * Appends a JSON body parser middleware.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {(err?: unknown) => void} next
 */
function applyJsonBodyParser(req, res, next) {
  /**
   * @type {Uint8Array[]}
   */
  const body = [];

  req.on('data', chunk => body.push(chunk));
  req.on('end', () => {
    if (body.length) {
      try {
        req.body = JSON.parse(Buffer.concat(body).toString());
      } catch (e) {
        // pass
      }
    }

    next();
  });
}

/**
 * Appends a query params parser middleware.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {(err?: unknown) => void} next
 */
function applyQueryParamsParser(req, res, next) {
  req.queryParams = url.parse(req.url ? req.url : '', true).query;
  next();
}

/**
 * Appends a path params parser middleware.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {(err?: unknown) => void} next
 */
function applyPathParamsParser(req, res, next) {
  const matches = req.url ? req.url.match(req.pathRegex) : null;

  req.pathParams = matches && matches.groups ? matches.groups : null;
  next();
}

/**
 * Appends a request console logger middleware.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {(err?: unknown) => void} next
 */
function applyConsoleLogger(req, res, next) {
  console.log(
    new Date(),
    req.method,
    req.url,
    'path params:',
    req.pathParams,
    'query params:',
    req.queryParams,
    'body:',
    req.body
  );

  next();
}

/**
 * Appends a JSON body validator middleware.
 *
 * This middleware returns the 400 status code
 * if the request body is not an object.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {(err?: unknown) => void} next
 */
function applyJsonBodyValidator(req, res, next) {
  if (!req.body || typeof req.body !== 'object') {
    next(ErrInvalidRequestBody);
  } else {
    next();
  }
}

/**
 *
 * @param {unknown} err
 * @param {Request} req
 * @param {Response} res
 * @param {(err?: unknown) => void} next
 * @returns
 */
function applyMiddlewareErrorsHandler(err, req, res, next) {
  if (err != ErrInvalidRequestBody) {
    next(err);

    return;
  }

  res.statusCode = 400;
  res.end(JSON.stringify({ message: ErrInvalidRequestBody.message }));
  next();
}

function main() {
  const app = new Simpress();

  app.use(applyJsonBodyParser);
  app.use(applyPathParamsParser);
  app.use(applyQueryParamsParser);
  app.use(applyConsoleLogger);

  app.route(/^\/$/, 'GET', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ message: 'ok' }));
  });

  app.route(/^\/echo\/?/, 'POST', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify(req.body));
  });

  app
    .route(/^\/params\/(?<name>\w+)\/?/, 'GET', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify({ query: req.queryParams, path: req.pathParams }));
    })
    .use((req, res, next) => {
      if (!req.pathParams || !/^[a-zA-Z0-9]+$/.test(req.pathParams.name)) {
        next(ErrInvalidNamePathParameter);
      } else {
        next();
      }
    })
    .use((req, res, next) => {
      if (!req.queryParams || !Object.keys(req.queryParams).length) {
        next(ErrNoQueryParams);
      } else {
        next();
      }
    })
    .useForError((err, req, res, next) => {
      if (err != ErrInvalidNamePathParameter) {
        next(err);

        return;
      }

      res.statusCode = 400;
      res.end(JSON.stringify({ message: ErrInvalidNamePathParameter.message }));
      next();
    })
    .useForError((err, req, res, next) => {
      if (err != ErrNoQueryParams) {
        next(err);

        return;
      }

      res.statusCode = 400;
      res.end(JSON.stringify({ message: ErrNoQueryParams.message }));
    });

  /** @type {Route} */ (app.findRoute(/^\/echo\/?/, 'POST'))
    .use(applyJsonBodyValidator)
    .useForError(applyMiddlewareErrorsHandler);

  const server = http.createServer(app.toListener());

  server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
  });
}

main();

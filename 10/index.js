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

class Router {
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
      for (const router of this._routers) {
        for (const [_, route] of router.routes) {
          // check path and method
          if (
            route.path.test(req.url ? req.url : '') &&
            req.method === route.method
          ) {
            req.pathRegex = route.path;

            for (const level of [this, router, route]) {
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
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ message: ErrInvalidRequestBody.message }));
  next();
}

/**
 * @typedef User
 * @property {number|null=} id
 * @property {string} name
 * @property {string} nick
 */

function main() {
  const app = new Simpress();

  app.use(applyJsonBodyParser);
  app.use(applyPathParamsParser);
  app.use(applyQueryParamsParser);
  app.use(applyConsoleLogger);

  app.route('/', 'GET', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ message: 'ok' }));
  });

  app.route('/echo', 'POST', (req, res) => {
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
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: ErrInvalidNamePathParameter.message }));
      next();
    })
    .useForError((err, req, res, next) => {
      if (err != ErrNoQueryParams) {
        next(err);

        return;
      }

      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: ErrNoQueryParams.message }));
    });

  /** @type {Route} */ (app.findRoute('/echo', 'POST'))
    .use(applyJsonBodyValidator)
    .useForError(applyMiddlewareErrorsHandler);

  let usersListCounter = 0;

  /**
   * @type {User[]}
   */
  const usersList = [];
  const usersRouter = new Router();

  usersRouter.route('/users', 'GET', (req, res) => {
    const page =
      req.queryParams && req.queryParams.page
        ? Number(req.queryParams.page)
        : 0;
    const pageSize =
      req.queryParams && req.queryParams.pageSize
        ? Number(req.queryParams.pageSize)
        : 10;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify(
        usersList.slice(page * pageSize, page * pageSize + pageSize)
      )
    );
  });

  const ErrInvalidUserData = new Error('invalid user data');
  const ErrInvalidUserName = new Error('invalid user name');
  const ErrInvalidUserNick = new Error('invalid user nickname');
  const ErrInvalidUserId = new Error('invalid user id');
  const ErrUserNotFound = new Error('user was not found');

  const validateUserFactory = (update = false) => {
    /**
     *
     * @param {Request} req
     * @param {Response} res
     * @param {(err?: unknown) => void} next
     */
    const mw = (req, res, next) => {
      const user = /** @type {User} */ (req.body);
      const id = req.pathParams && req.pathParams.id;

      if (!user || typeof user !== 'object') {
        next(ErrInvalidUserData);
      } else if (!/^[a-zA-Z-]+$/.test(user.name)) {
        next(ErrInvalidUserName);
      } else if (!/^[a-zA-Z-]+$/.test(user.nick)) {
        next(ErrInvalidUserNick);
      } else if (update && (typeof id !== 'number' || !Number.isInteger(id))) {
        next(ErrInvalidUserId);
      } else {
        next();
      }
    };

    return mw;
  };

  /**
   *
   * @param {unknown} err
   * @param {Request} req
   * @param {Response} res
   * @param {(err?: unknown) => void} next
   */
  const handleUserValidationError = (err, req, res, next) => {
    if (
      err === ErrInvalidUserData ||
      err === ErrInvalidUserName ||
      err === ErrInvalidUserNick ||
      err === ErrInvalidUserId
    ) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: /** @type {Error} */ (err).message }));
      next();
    } else {
      next(err);
    }
  };

  usersRouter
    .route('/users', 'POST', (req, res) => {
      const user = /** @type {User} */ (req.body);
      const id = ++usersListCounter;
      const item = { id, name: user.name, nick: user.nick };

      usersList.push(item);

      res.statusCode = 201;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(item));
    })
    .use(validateUserFactory())
    .useForError(handleUserValidationError);

  usersRouter.route(/^\/users\/(?<id>\d+)\/?/, 'GET', (req, res) => {
    const id =
      req.pathParams && req.pathParams.id ? Number(req.pathParams.id) : null;
    const item = usersList.find(u => u.id === id);

    if (!item) {
      res.statusCode = 404;
      res.end(JSON.stringify({ message: ErrUserNotFound.message }));

      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(item));
  });

  usersRouter
    .route(/^\/users\/(?<id>\d+)\/?/, 'PUT', (req, res) => {
      const id =
        req.pathParams && req.pathParams.id ? Number(req.pathParams.id) : null;
      const index = usersList.findIndex(u => u.id === id);

      if (index === -1) {
        res.statusCode = 404;
        res.end(JSON.stringify({ message: ErrUserNotFound.message }));

        return;
      }

      const user = /** @type {User} */ (req.body);
      const item = /** @type {User} */ ({
        id,
        name: user.name,
        nick: user.nick
      });

      usersList[index] = item;

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(item));
    })
    .use(validateUserFactory(true))
    .useForError(handleUserValidationError);

  usersRouter.route(/^\/users\/(?<id>\d+)\/?/, 'DELETE', (req, res) => {
    const id =
      req.pathParams && req.pathParams.id ? Number(req.pathParams.id) : null;
    const index = usersList.findIndex(u => u.id === id);

    if (index === -1) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: ErrUserNotFound.message }));

      return;
    }

    usersList.splice(index, 1);

    res.statusCode = 204;
    res.end();
  });

  app.useRouter(usersRouter);

  const server = http.createServer(app.toListener());

  server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
  });
}

main();

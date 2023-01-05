import http from 'http';
import url from 'url';

const host = 'localhost';
const port = 8000;

/**
 * @typedef {import('querystring').ParsedUrlQuery} ParsedUrlQuery
 *
 * @typedef {{ body?: unknown }} RawBody
 * @typedef {{ queryParams?: ParsedUrlQuery }} QueryParams
 * @typedef {http.IncomingMessage & RawBody & QueryParams} Request
 * @typedef {http.ServerResponse & { req: Request }} Response
 * @typedef {(req: Request, res: Response) => void | Promise<void>} RequestListener
 *
 * @typedef Route
 * @property {RegExp} path
 * @property {string} method
 * @property {RequestListener} listener
 *
 * @typedef {(req: Request, res: Response, next: (err?: unknown) => void) => void} Middleware
 */

class Simpress {
  /**
   * @readonly
   * @type {Middleware[]}
   */
  middlewares;

  /**
   * @private
   * @type {Route[]}
   */
  _routes;

  constructor() {
    this.middlewares = [];
    this._routes = [];
  }

  /**
   * @param {Middleware} middleware
   */
  use(middleware) {
    this.middlewares.push(middleware);
  }

  /**
   * @param {string|RegExp} path
   * @param {string} method
   * @param {RequestListener} listener
   */
  route(path, method, listener) {
    if (typeof path === 'string') path = new RegExp('^' + path);

    this._routes.push({ path, method, listener });
  }

  /**
   * @returns {http.RequestListener}
   */
  toListener() {
    /**
     * @param {Request} req
     * @param {Response} res
     * @returns {Promise<void>}
     */
    const listener = async (req, res) => {
      for (const route of this._routes) {
        // check path and method
        if (
          route.path.test(req.url ? req.url : '') &&
          req.method === route.method
        ) {
          for (const middleware of this.middlewares) {
            await new Promise(resolve => middleware(req, res, resolve));
          }

          route.listener(req, res);

          return;
        }
      }

      res.writeHead(404);
      res.end(null);
    };

    return listener;
  }
}

/**
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
        res.writeHead(400);
        res.end(null);

        return;
      }
    }

    next();
  });
}

/**
 * @param {Request} req
 * @param {Response} res
 * @param {(err?: unknown) => void} next
 */
function applyQueryParamsParser(req, res, next) {
  req.queryParams = url.parse(req.url ? req.url : '', true).query;

  next();
}

/**
 * @param {Request} req
 * @param {Response} res
 * @param {(err?: unknown) => void} next
 */
function applyConsoleLogger(req, res, next) {
  console.log(
    new Date(),
    req.method,
    req.url,
    'query params:',
    req.queryParams,
    'body:',
    req.body
  );

  next();
}

const app = new Simpress();

app.use(applyJsonBodyParser);
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

app.route(/^\/params\/?/, 'GET', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify(req.queryParams));
});

const server = http.createServer(app.toListener());

server.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});

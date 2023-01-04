import http from 'http';
import url from 'url';

const host = 'localhost';
const port = 8000;

/**
 * @typedef Route
 * @property {RegExp} path
 * @property {string} method
 * @property {http.RequestListener} listener
 */

/**
 * @typedef {(req: http.IncomingMessage, http.ServerResponse, next: () => void)} Middleware
 */

class Simpress {
  /**
   * @private
   * @type {Middleware[]}
   */
  _middlewares;

  /**
   * @private
   * @type {Route[]}
   */
  _routes;

  constructor() {
    this._middlewares = [];
    this._routes = [];
  }

  /**
   *
   * @param {Middleware} middleware
   */
  use(middleware) {
    this._middlewares.push(middleware);
  }

  /**
   *
   * @param {string|RegExp} path
   * @param {string} method
   * @param {http.RequestListener} listener
   */
  route(path, method, listener) {
    if (typeof path === 'string') path = new RegExp('^' + path);

    this._routes.push({ path, method, listener });
  }

  /**
   * @returns {http.RequestListener}
   */
  toListener() {
    return async (req, res) => {
      for (const route of this._routes) {
        // check path and method
        if (
          route.path.test(req.url ? req.url : '') &&
          req.method === route.method
        ) {
          for (const middleware of this._middlewares) {
            await new Promise(resolve => middleware(req, res, resolve));
          }

          route.listener(req, res);

          return;
        }
      }

      res.writeHead(404);
      res.end(null);
    };
  }
}

function applyJsonBodyParser(req, res, next) {
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

function applyQueryParamsParser(req, res, next) {
  req.queryParams = url.parse(req.url, true).query;

  next();
}

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

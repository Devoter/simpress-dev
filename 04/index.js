import http from 'http';

const host = 'localhost';
const port = 8000;

/**
 * @typedef Route
 * @property {RegExp} path
 * @property {string} method
 * @property {http.RequestListener} listener
 */

class Router {
  /**
   * @private
   * @type {Route[]}
   */
  _routes;

  constructor() {
    this._routes = [];
  }

  /**
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
    return (req, res) => {
      for (const route of this._routes) {
        // check path and method
        if (
          route.path.test(req.url ? req.url : '') &&
          req.method === route.method
        ) {
          route.listener(req, res);

          return;
        }
      }

      res.writeHead(404);
      res.end(null);
    };
  }
}

/**
 * @param {http.RequestListener} next
 * @returns {http.RequestListener}
 */
function makeJSONBodyParser(next) {
  /**
   * @param {http.IncomingMessage & { body?: unknown }} req
   * @param {http.ServerResponse} res
   */
  function listener(req, res) {
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

      next(req, res);
    });
  }

  return listener;
}

const router = new Router();

router.route(/^\/$/, 'GET', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify({ message: 'ok' }));
});

router.route(
  /^\/echo\/?/,
  'POST',
  /**
   * @param {http.IncomingMessage & { body?: unknown }} req
   * @param {http.ServerResponse} res
   */
  (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify(req.body));
  }
);

const server = http.createServer(makeJSONBodyParser(router.toListener()));
server.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});

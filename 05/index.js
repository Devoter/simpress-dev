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

function makeJSONBodyParser(next) {
  return function (req, res) {
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
  };
}

function makeQueryParamsParser(next) {
  return function (req, res) {
    req.queryParams = url.parse(req.url, true).query;

    next(req, res);
  };
}

const router = new Router();

router.route(/^\/$/, 'GET', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify({ message: 'ok' }));
});

router.route(/^\/echo\/?/, 'POST', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify(req.body));
});

router.route(/^\/params\/?/, 'GET', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify(req.queryParams));
});

const server = http.createServer(
  makeJSONBodyParser(makeQueryParamsParser(router.toListener()))
);
server.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});

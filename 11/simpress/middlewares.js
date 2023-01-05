import url from 'url';

/**
 * @typedef {import('./types').Request} Request
 * @typedef {import('./types').Response} Response
 */

/**
 * Appends a JSON body parser middleware.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {(err?: unknown) => void} next
 */
export function applyJsonBodyParser(req, res, next) {
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
export function applyQueryParamsParser(req, res, next) {
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
export function applyPathParamsParser(req, res, next) {
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
export function applyConsoleLogger(req, res, next) {
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

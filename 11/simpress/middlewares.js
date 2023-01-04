import url from 'url';

/**
 * @typedef {import('http').IncomingMessage} IncomingMessage
 * @typedef {import('http').ServerResponse} ServerResponse
 */

/**
 * Appends a JSON body parser middleware.
 *
 * @param {IncomingMessage} req 
 * @param {ServerResponse} res 
 * @param {(err?: unknown) => void} next 
 */
export function applyJsonBodyParser(req, res, next) {
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
 * @param {IncomingMessage} req 
 * @param {ServerResponse} res 
 * @param {(err?: unknown) => void} next 
 */
export function applyQueryParamsParser(req, res, next) {
  req.queryParams = url.parse(req.url, true).query;
  next();
}

/**
 * Appends a path params parser middleware.
 *
 * @param {IncomingMessage} req 
 * @param {ServerResponse} res 
 * @param {(err?: unknown) => void} next 
 */
export function applyPathParamsParser(req, res, next) {
  const matches = req.url.match(req.pathRegex);

  req.pathParams = matches && matches.groups ? matches.groups : null;
  next();
}

/**
 * Appends a request console logger middleware.
 *
 * @param {IncomingMessage} req 
 * @param {ServerResponse} res 
 * @param {(err?: unknown) => void} next 
 */
export function applyConsoleLogger(req, res, next) {
  console.log(new Date(), req.method, req.url,
    'path params:', req.pathParams,
    'query params:', req.queryParams,
    'body:', req.body
  );

  next();
}
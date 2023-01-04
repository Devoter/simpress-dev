import { createServer } from 'http';

import {
  Simpress,
  Router,
  Request,
  applyJsonBodyParser,
  applyPathParamsParser,
  applyQueryParamsParser,
  applyRequestConsoleLogger,
  Response
} from 'simpress';

const host = 'localhost';
const port = 8000;

const ErrInvalidRequestBody = new Error('invalid request body');
const ErrInvalidNamePathParameter = new Error('invalid name path parameter');
const ErrNoQueryParams = new Error('no query params');

const ErrInvalidUserData = new Error('invalid user data');
const ErrInvalidUserName = new Error('invalid user name');
const ErrInvalidUserNick = new Error('invalid user nickname');
const ErrInvalidUserId = new Error('invalid user id');
const ErrUserNotFound = new Error('user was not found');

interface User {
  id?: number | null;
  name: string;
  nick: string;
}

/**
 * Appends a JSON body validator middleware.
 * 
 * This middleware returns the 400 status code
 * if the request body is not an object.
 */
function applyJsonBodyValidator(req: Request, res: Response, next: (err?: unknown) => void) {
  if (!req.body || typeof req.body !== 'object') {
    next(ErrInvalidRequestBody);
  } else {
    next();
  }
}

function applyMiddlewareErrorsHandler(err: unknown, req: Request, res: Response, next: (err?: unknown) => void) {
  if (err != ErrInvalidRequestBody) {
    next(err);

    return;
  }

  res.statusCode = 400;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ message: ErrInvalidRequestBody.message }));
  next();
}

function main() {
  const app = new Simpress();

  app.use(applyJsonBodyParser);
  app.use(applyPathParamsParser);
  app.use(applyQueryParamsParser);
  app.use(applyRequestConsoleLogger);

  app.route('/', 'GET', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ message: 'ok' }));
  });

  app.route('/echo', 'POST', (req: Request, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify(req.body));
  });

  app.route(/^\/params\/(?<name>\w+)\/?/, 'GET', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ query: req.queryParams, path: req.pathParams }));
  })
    .use((req: Request & { pathParams?: Record<string, string> | null }, res, next) => {
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


  app.findRoute('/echo', 'POST')!
    .use(applyJsonBodyValidator)
    .useForError(applyMiddlewareErrorsHandler);
  
  let usersListCounter = 0;
  const usersList: User[] = [];
  const usersRouter = new Router();

  usersRouter.route('/users', 'GET', (req, res) => {
    const page = req.queryParams && req.queryParams.page ? Number(req.queryParams.page) : 0;
    const pageSize = req.queryParams && req.queryParams.pageSize ? Number(req.queryParams.pageSize) : 10;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(usersList.slice(page * pageSize, page * pageSize + pageSize)));
  })

  const validateUserFactory = (update = false) => {
    return (req: Request, res: Response, next: (err?: unknown) => void) => {
      const user = req.body as User;
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
  };

  const handleUserValidationError = (err: unknown, req: Request, res: Response, next: (err?: unknown) => void) => {
    if (err === ErrInvalidUserData || err === ErrInvalidUserName ||
      err === ErrInvalidUserNick || err === ErrInvalidUserId) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: (err as Error).message }));
      next();
    } else {
      next(err);
    }
  };

  usersRouter.route('/users', 'POST', (req, res) => {
    const user = req.body as User;
    const id = ++usersListCounter;
    const item = { id, name: user.name, nick: user.nick };

    usersList.push(item);

    res.statusCode = 201;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(item));
  }).use(validateUserFactory())
    .useForError(handleUserValidationError);
  
  usersRouter.route(/^\/users\/(?<id>\d+)\/?/, 'GET', (req, res) => {
    const id = req.pathParams && req.pathParams.id ? Number(req.pathParams.id) : null;
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

  usersRouter.route(/^\/users\/(?<id>\d+)\/?/, 'PUT', (req, res) => {
    const id = req.pathParams && req.pathParams.id ? Number(req.pathParams.id) : null;
    const index = usersList.findIndex(u => u.id === id);

    if (index === -1) {
      res.statusCode = 404;
      res.end(JSON.stringify({ message: ErrUserNotFound.message }));

      return;
    }

    const user = req.body as User;
    const item: User = { id, name: user.name, nick: user.nick };

    usersList[index] = item;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(item));
  }).use(validateUserFactory(true))
    .useForError(handleUserValidationError);
  
  usersRouter.route(/^\/users\/(?<id>\d+)\/?/, 'DELETE', (req, res) => {
    const id = req.pathParams && req.pathParams.id ? Number(req.pathParams.id) : null;
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

  const server = createServer(app.toListener());

  server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
  });
}

main();
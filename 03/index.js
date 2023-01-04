import http from 'http';

const host = 'localhost';
const port = 8000;

function makeJSONBodyParser(next) {
  return function (req, res) {
    const body = [];

    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      if (body.length) {
        try {
          req.body = JSON.parse(Buffer.concat(body).toString());
        } catch (e) {
          res.statusCode = 400;
          res.end(null);

          return;
        }
      }

      next(req, res);
    });
  };
}

const requestListener = function (req, res) {
  console.log(req.body);

  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify({ hello: 'world' }));
};

const server = http.createServer(makeJSONBodyParser(requestListener));
server.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});

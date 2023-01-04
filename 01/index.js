import http from 'http';

const host = 'localhost';
const port = 8000;

/**
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
function requestListener(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ hello: 'world' }));
}

const server = http.createServer(requestListener);
server.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});

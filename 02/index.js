import http from 'http';

const host = 'localhost';
const port = 8000;

const requestListener = function (req, res) {
  const body = [];

  req.on('data', chunk => body.push(chunk));
  req.on('end', () => {
    console.log(Buffer.concat(body).toString());

    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ hello: 'world' }));
  });
};

const server = http.createServer(requestListener);
server.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});

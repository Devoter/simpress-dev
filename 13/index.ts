import { createServer } from 'http';

import { Simpress } from "simpress";

const host = 'localhost';
const port = 8000;

const app = new Simpress();

app.route('/', 'GET', (req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({'hello': 'world'}));
});

const server = createServer(app.toListener());

server.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});